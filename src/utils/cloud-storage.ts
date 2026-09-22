import { supabase } from "@/lib/supabase";

import type { UserLearningData } from "@/types/progress";

import {
	hasLearningProgress,
	mergeLearningData,
	normalizeLearningData,
} from "./learning-storage";

/**
 * Tope de `syncLearningData`. El GET normal tarda menos de un segundo; 10 s
 * dan margen a una red lenta y a los reintentos propios de postgrest-js ante
 * un error de red (1 s + 2 s + 4 s). Pasado el tope, `GameEffects` sigue con
 * los datos locales, sin subir nada, y reintenta más tarde (D045).
 */
const SYNC_TIMEOUT_MS = 10_000;

/**
 * Fallo de una petición a la nube, con su causa ya clasificada (D050):
 *
 * - `network`: no hubo respuesta del servidor — sin red, `fetch` rechazado
 *   (postgrest lo devuelve con `status` 0), o el tope de 10 s. Es "sin
 *   conexión" aunque `navigator.onLine` diga lo contrario, que miente a
 *   menudo (wifi sin salida a internet, portal cautivo).
 * - `server`: el servidor respondió con un error (500, permisos, esquema).
 *   Hay red; lo que falla es la sincronización.
 */
export class CloudRequestError extends Error {
	readonly kind: "network" | "server";

	constructor(kind: "network" | "server", message: string, cause?: unknown) {
		super(message, { cause });
		this.name = "CloudRequestError";
		this.kind = kind;
	}
}

/** ¿El fallo es falta de conexión (y no un error del servidor)? */
export function isNetworkFailure(error: unknown): boolean {
	if (error instanceof CloudRequestError) return error.kind === "network";

	// Supabase Auth sin red devuelve `AuthRetryableFetchError`.
	if (error instanceof Error && error.name === "AuthRetryableFetchError") {
		return true;
	}

	return typeof navigator !== "undefined" && !navigator.onLine;
}

function toCloudRequestError(
	error: { message: string },
	status: number,
	action: string,
): CloudRequestError {
	// Un `sw.js` anterior a D050 respondía a un GET cross-origin sin red con
	// la página offline (HTML con 200): llega como error con `status` 200 y
	// sin código de PostgREST. `navigator.onLine` falso lo desempata.
	const isNetwork =
		status === 0 || (typeof navigator !== "undefined" && !navigator.onLine);

	return new CloudRequestError(
		isNetwork ? "network" : "server",
		`${action}: ${error.message}`,
		error,
	);
}

export async function fetchRemoteLearningData(
	userId: string,
	signal?: AbortSignal,
): Promise<UserLearningData | null> {
	let query = supabase
		.from("user_learning_data")
		.select(
			"profile, country_history, region_game_scores, region_best_times, last_configuration, last_practice_by_country, countries_game, achievements, stats, session_history, daily_reminder",
		)
		.eq("user_id", userId);

	if (signal) {
		query = query.abortSignal(signal);
	}

	const { data, error, status } = await query.maybeSingle();

	if (error) {
		const cloudError = toCloudRequestError(
			error,
			status,
			"Failed to fetch remote learning data",
		);

		// Abortada a propósito (timeout o cancelación): quien la abortó ya
		// sabe por qué. Sin red tampoco se registra: es un estado esperado,
		// que la UI ya comunica (D050).
		if (!signal?.aborted && cloudError.kind === "server") {
			console.error(cloudError.message, error);
		}

		throw cloudError;
	}

	if (!data) {
		return null;
	}

	/**
	 * Pasa por `normalizeLearningData` (el mismo normalizador que usa
	 * localStorage) en vez de mapear a pelo: una fila creada antes de que
	 * existieran estas columnas llega con campos sin definir, y cualquier
	 * lectura posterior de `stats` reventaría. Además así la siembra
	 * retroactiva de días activos también aplica a los datos de la nube.
	 */
	return normalizeLearningData({
		profile: data.profile,
		countryHistory: data.country_history,
		regionGameScores: data.region_game_scores,
		lastConfiguration: data.last_configuration,
		regionBestTimes: data.region_best_times ?? {},
		lastPracticeByCountry: data.last_practice_by_country ?? {},
		countriesGame: data.countries_game ?? {},
		achievements: data.achievements ?? {},
		stats: data.stats ?? undefined,
		sessionHistory: data.session_history ?? [],
		dailyReminder: data.daily_reminder ?? {},
	});
}

export async function pushLearningData(
	userId: string,
	data: UserLearningData,
	signal?: AbortSignal,
): Promise<void> {
	let query = supabase.from("user_learning_data").upsert({
		user_id: userId,
		profile: data.profile,
		country_history: data.countryHistory,
		region_game_scores: data.regionGameScores,
		region_best_times: data.regionBestTimes,
		last_configuration: data.lastConfiguration,
		last_practice_by_country: data.lastPracticeByCountry,
		countries_game: data.countriesGame,
		achievements: data.achievements,
		stats: data.stats,
		session_history: data.sessionHistory,
		daily_reminder: data.dailyReminder,
		updated_at: new Date().toISOString(),
	});

	if (signal) {
		query = query.abortSignal(signal);
	}

	const { error, status } = await query;

	if (error) {
		const cloudError = toCloudRequestError(
			error,
			status,
			"Failed to push learning data",
		);

		if (!signal?.aborted && cloudError.kind === "server") {
			console.error(cloudError.message, error);
		}

		throw cloudError;
	}
}

/** Se rechaza en cuanto `signal` se aborta (con su `reason`); si no, nunca termina. */
function rejectOnAbort(signal: AbortSignal): Promise<never> {
	return new Promise((_, reject) => {
		if (signal.aborted) {
			reject(signal.reason);

			return;
		}

		signal.addEventListener("abort", () => reject(signal.reason), {
			once: true,
		});
	});
}

/**
 * Sincroniza la cuenta: lee la fila, la fusiona con lo local y sube el
 * resultado si aporta algo. Se usa al hidratar (login, recarga) y para cada
 * subida posterior (D051): subir sin leer antes pisaría lo que otro
 * dispositivo subió mientras tanto.
 *
 * - Cuenta sin progreso en la nube: lo local (el invitado) pasa a ser la
 *   cuenta.
 * - Cuenta con progreso: `mergeLearningData(remote, local, base)`. `base` es
 *   la base de sincronización de este dispositivo (`getSyncBase`): con ella
 *   ganan los cambios locales que la nube aún no tiene, también en los campos
 *   sin marca de tiempo (D049). `null` = no se sabe qué cambió aquí (login de
 *   invitado): esos campos ceden ante la nube (D020).
 *
 * Devuelve lo que queda en la nube tras la llamada — la nueva base.
 *
 * Se rinde a los `SYNC_TIMEOUT_MS` o cuando se aborta `signal` (el efecto
 * que la lanzó se limpió): rechaza, y lo que quedara en vuelo sale abortado,
 * así que una respuesta tardía ya no sube nada a la nube (D045).
 */
export async function syncLearningData(
	userId: string,
	localData: UserLearningData,
	base: UserLearningData | null,
	signal?: AbortSignal,
): Promise<UserLearningData> {
	// Cuando el navegador dice "sin red", acierta: no se intenta. Si no, el GET
	// fallaría igual, pero tras los reintentos de postgrest (1 + 2 + 4 s): abrir
	// la app sin conexión dejaría ~7 s de skeleton. Al volver la red, el evento
	// `online` dispara el reintento (D050).
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		throw new CloudRequestError("network", "syncLearningData: sin conexión");
	}

	const controller = new AbortController();

	const abortFromCaller = () => controller.abort(signal?.reason);

	const timeoutId = setTimeout(() => {
		controller.abort(
			new CloudRequestError(
				"network",
				`syncLearningData: sin respuesta en ${SYNC_TIMEOUT_MS} ms`,
			),
		);
	}, SYNC_TIMEOUT_MS);

	if (signal?.aborted) {
		abortFromCaller();
	}

	signal?.addEventListener("abort", abortFromCaller, { once: true });

	try {
		/**
		 * La carrera no sobra aunque las peticiones lleven la señal: el
		 * cliente de Supabase espera al token de sesión ANTES del `fetch`, y
		 * esa espera no la corta ninguna señal. Si se colgara ahí, esta
		 * promesa no terminaría nunca; con la carrera se rechaza a tiempo, y
		 * cuando ese `fetch` por fin salga lo hará ya abortado (no se envía).
		 */
		return await Promise.race([
			runSync(userId, localData, base, controller.signal),
			rejectOnAbort(controller.signal),
		]);
	} finally {
		clearTimeout(timeoutId);

		signal?.removeEventListener("abort", abortFromCaller);
	}
}

async function runSync(
	userId: string,
	localData: UserLearningData,
	base: UserLearningData | null,
	signal: AbortSignal,
): Promise<UserLearningData> {
	const remote = await fetchRemoteLearningData(userId, signal);

	/**
	 * No existe información para este usuario.
	 *
	 * El progreso del invitado se convierte en el
	 * progreso inicial de la cuenta.
	 */
	if (!remote || !hasLearningProgress(remote)) {
		await pushLearningData(userId, localData, signal);

		return localData;
	}

	/**
	 * La cuenta ya tiene progreso: cada campo con su regla de
	 * `mergeLearningData`, que no pierde lo que este dispositivo cambió.
	 */
	const merged = mergeLearningData(remote, localData, base);

	/**
	 * Si el merge aportó algo que no estaba en remoto, se sube de vuelta.
	 *
	 * Se compara el objeto ENTERO, no campo por campo: antes había que
	 * acordarse de añadir cada campo nuevo también a esta condición, y
	 * olvidarlo fallaba en silencio — el merge se quedaba en este dispositivo
	 * y se perdía en el siguiente.
	 */
	if (JSON.stringify(merged) !== JSON.stringify(remote)) {
		await pushLearningData(userId, merged, signal);
	}

	return merged;
}

export interface LeaderboardEntry {
	userId: string;
	displayName: string;
	bestTimeMs: number;
}

/**
 * Ranking completo de un scope ("world" por ahora), del más rápido al más
 * lento. Se trae completo (no solo el top N) para poder calcular en qué
 * puesto queda el usuario actual aunque no esté en el top 5 — la tabla
 * `leaderboard_entries` es pública y liviana (nombre + tiempo), así que esto
 * no debería ser un problema salvo con muchísimos usuarios.
 */
export async function fetchLeaderboard(
	scope: string,
): Promise<LeaderboardEntry[]> {
	const { data, error, status } = await supabase
		.from("leaderboard_entries")
		.select("user_id, display_name, best_time_ms")
		.eq("scope", scope)
		.order("best_time_ms", { ascending: true });

	if (error) {
		const cloudError = toCloudRequestError(
			error,
			status,
			"Failed to fetch leaderboard",
		);

		if (cloudError.kind === "server") {
			console.error(cloudError.message, error);
		}

		throw cloudError;
	}

	return (data ?? []).map((row) => ({
		userId: row.user_id,
		displayName: row.display_name,
		bestTimeMs: row.best_time_ms,
	}));
}

/**
 * Se llama solo cuando el usuario mejora su marca (ver GameEffects.tsx) — no
 * hace falta un merge, cada mejora reemplaza la fila entera del usuario.
 * Es un "mejor esfuerzo": si falla (p. ej. la tabla todavía no existe en
 * Supabase, ver supabase/leaderboard.sql) no debe romper el juego, solo se
 * registra el error. Devuelve si subió: una marca hecha sin conexión se
 * reintenta después de la siguiente sincronización buena (D050).
 */
export async function upsertLeaderboardEntry(
	userId: string,
	scope: string,
	displayName: string,
	bestTimeMs: number,
): Promise<boolean> {
	const { error, status } = await supabase.from("leaderboard_entries").upsert({
		user_id: userId,
		scope,
		display_name: displayName,
		best_time_ms: bestTimeMs,
		updated_at: new Date().toISOString(),
	});

	if (error) {
		const cloudError = toCloudRequestError(
			error,
			status,
			"Failed to update leaderboard entry",
		);

		if (cloudError.kind === "server") {
			console.error(cloudError.message, error);
		}

		return false;
	}

	return true;
}
