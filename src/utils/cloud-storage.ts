import { supabase } from "@/lib/supabase";

import type { UserLearningData } from "@/types/progress";

import {
	normalizeLearningData,
	planSync,
	SUB_GAME_KEYS,
	SUB_GAME_TYPES,
	type SubGameType,
} from "./learning-storage";

/**
 * La columna de `user_learning_data` de cada juego con sub-objeto propio
 * (D028, D061). Una columna nueva aquí exige su SQL en `supabase/` corrido
 * ANTES de desplegar: si el `select` pide una columna que no existe, falla y
 * toda cuenta autenticada se queda en `local` sin sincronizar (D044/D050).
 */
const SUB_GAME_COLUMNS = {
	countries: "countries_game",
} as const satisfies Record<SubGameType, string>;

type SubGameColumn = (typeof SUB_GAME_COLUMNS)[SubGameType];

/** Las columnas de un `select` literal ("a, b, c" → "a" | "b" | "c"). */
type SelectedColumns<Select extends string> =
	Select extends `${infer Column}, ${infer Rest}`
		? Column | SelectedColumns<Rest>
		: Select;

/**
 * El `select` se queda como texto literal: supabase-js deduce de él el tipo
 * de la fila. A cambio no puede salir del registro, así que esto no compila
 * si le falta la columna de algún juego de `SUB_GAME_COLUMNS` — olvidarla
 * no fallaría en ningún test: la nube devolvería el juego siempre vacío y
 * su progreso no llegaría a los demás dispositivos.
 */
function learningDataSelect<Select extends string>(
	select: Select &
		(SubGameColumn extends SelectedColumns<Select> ? unknown : never),
): Select {
	return select;
}

const LEARNING_DATA_SELECT = learningDataSelect(
	"profile, country_history, region_game_scores, region_best_times, last_configuration, last_practice_by_country, countries_game, achievements, stats, session_history, daily_reminder, field_updated_at",
);

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
		.select(LEARNING_DATA_SELECT)
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
		...Object.fromEntries(
			SUB_GAME_TYPES.map((gameType) => [
				SUB_GAME_KEYS[gameType],
				data[SUB_GAME_COLUMNS[gameType]] ?? {},
			]),
		),
		achievements: data.achievements ?? {},
		stats: data.stats ?? undefined,
		sessionHistory: data.session_history ?? [],
		dailyReminder: data.daily_reminder ?? {},
		// Una sola columna (D055) con las fechas de perfil, configuración y
		// notas por continente de Banderas; las de Países viajan dentro de
		// `countries_game`.
		fieldUpdatedAt: {
			profile: data.field_updated_at?.profile ?? null,
			lastConfiguration: data.field_updated_at?.lastConfiguration ?? null,
		},
		regionGameScoresUpdatedAt: data.field_updated_at?.regionGameScores ?? {},
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
		// Se enumeran columnas, no se sube la fila a ciegas: un cliente viejo
		// que no conoce un juego no manda su columna, y Postgres conserva lo
		// que ya había (D028).
		...Object.fromEntries(
			SUB_GAME_TYPES.map((gameType) => [
				SUB_GAME_COLUMNS[gameType],
				data[SUB_GAME_KEYS[gameType]],
			]),
		),
		achievements: data.achievements,
		stats: data.stats,
		session_history: data.sessionHistory,
		daily_reminder: data.dailyReminder,
		field_updated_at: {
			profile: data.fieldUpdatedAt.profile,
			lastConfiguration: data.fieldUpdatedAt.lastConfiguration,
			regionGameScores: data.regionGameScoresUpdatedAt,
		},
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
 * Qué se hace lo decide `planSync` (pura): cuenta sin progreso → lo local pasa
 * a ser la cuenta; cuenta con progreso y sin `base` (entra un invitado) → lo
 * local se descarta (D056); con `base` (la base de sincronización de este
 * dispositivo, `getSyncBase`) → `mergeLearningData`.
 *
 * Devuelve lo que queda en la nube tras la llamada — la nueva base — y si se
 * descartó lo local.
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
): Promise<SyncResult> {
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

/** Resultado de `syncLearningData`. */
export interface SyncResult {
	/** Lo que queda en la nube: los datos de la cuenta y la nueva base. */
	data: UserLearningData;
	/** Lo local era del invitado y la cuenta ya tenía progreso: se descartó (D056). */
	discardedLocal: boolean;
}

async function runSync(
	userId: string,
	localData: UserLearningData,
	base: UserLearningData | null,
	signal: AbortSignal,
): Promise<SyncResult> {
	const remote = await fetchRemoteLearningData(userId, signal);

	const plan = planSync(remote, localData, base);

	if (plan.push) {
		await pushLearningData(userId, plan.data, signal);
	}

	return { data: plan.data, discardedLocal: plan.discardedLocal };
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
