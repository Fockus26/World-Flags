import {
	GAME_TYPES,
	getLeaderboardScope,
	LEADERBOARD_REGIONS,
} from "@/types/country";
import type { UserLearningData } from "@/types/progress";
import {
	isPlausibleRushTime,
	type LeaderboardUploadResult,
	shouldRetryLeaderboardUpload,
} from "@/utils/leaderboard-validation";
import { getGameProgress, getRegionBestTime } from "@/utils/learning-storage";

/**
 * Subida de las mejores marcas al ranking público (D140). Va aparte de
 * `GameEffects` para probarla sin React ni Supabase: la cola recibe la
 * función que sube y los temporizadores.
 */

/** Una marca que debería estar en el ranking: scope y tiempo. */
export interface LeaderboardMark {
	scope: string;
	bestTimeMs: number;
}

/**
 * Espera antes de reintentar tras la 1.ª, 2.ª, 3.ª… subida fallida (red o
 * servidor, nunca un rechazo, D113). La misma escalera que la sincronización
 * (D044): 5 s, 15 s, 30 s y después cada 60 s.
 */
export const LEADERBOARD_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];

/** La espera tras `failures` fallos seguidos (el primero es 0). */
export function getLeaderboardRetryDelay(failures: number): number {
	return LEADERBOARD_RETRY_DELAYS_MS[
		Math.min(Math.max(failures, 0), LEADERBOARD_RETRY_DELAYS_MS.length - 1)
	];
}

/**
 * Las marcas de la regla vigente que tiene `data`, una por scope con ranking
 * (3 juegos × "Todo el mundo" y los 8 continentes, D137). Primero las de
 * "Todo el mundo", que es el ranking que ya existía. Un tiempo por debajo del
 * mínimo del scope no se sube: el servidor lo rechazaría (D139).
 */
export function collectLeaderboardMarks(
	data: UserLearningData,
): LeaderboardMark[] {
	const marks: LeaderboardMark[] = [];

	for (const region of LEADERBOARD_REGIONS) {
		for (const gameType of GAME_TYPES) {
			const bestTimeMs = getRegionBestTime(
				getGameProgress(data, gameType).regionBestTimes,
				region,
				gameType,
			);

			if (bestTimeMs === undefined || !isPlausibleRushTime(region, bestTimeMs))
				continue;

			marks.push({ scope: getLeaderboardScope(gameType, region), bestTimeMs });
		}
	}

	return marks;
}

interface LeaderboardUploadQueueOptions {
	/** Las marcas de ahora mismo (se vuelve a pedir antes de cada subida). */
	getMarks: () => LeaderboardMark[];
	/** Si ahora se puede subir (sesión hidratada, con red…). */
	canUpload: () => boolean;
	upload: (mark: LeaderboardMark) => Promise<LeaderboardUploadResult>;
	setTimer?: (callback: () => void, delayMs: number) => unknown;
	clearTimer?: (timer: unknown) => void;
}

export interface LeaderboardUploadQueue {
	/**
	 * Sube lo que falte, de una en una. No hace nada si ya hay una subida en
	 * vuelo (esa misma vuelta recoge lo nuevo) o si se espera un reintento.
	 */
	run: () => Promise<void>;
	/** Corta la cola: el reintento pendiente se cancela y nada más sube. */
	dispose: () => void;
}

/**
 * Cola de subidas al ranking (D140): **en serie**, una petición en vuelo como
 * mucho, así la primera carga tras estrenar los continentes no lanza 24
 * peticiones de golpe. Recuerda por scope el último tiempo subido (o
 * rechazado: es definitivo, D113). Si una subida falla, la cola se para y
 * vuelve a intentarlo con la espera de `getLeaderboardRetryDelay`; antes se
 * reintentaba con cada cambio de `learningData`, es decir, con cada
 * respuesta de la partida (P14). Un éxito reinicia la escalera.
 */
export function createLeaderboardUploadQueue({
	getMarks,
	canUpload,
	upload,
	setTimer = (callback, delayMs) => setTimeout(callback, delayMs),
	clearTimer = (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
}: LeaderboardUploadQueueOptions): LeaderboardUploadQueue {
	const uploaded = new Map<string, number>();
	let running = false;
	let retryTimer: unknown = null;
	let failures = 0;
	let disposed = false;

	async function run(): Promise<void> {
		if (running || retryTimer !== null || disposed) return;

		running = true;

		try {
			while (!disposed && canUpload()) {
				const next = getMarks().find(
					(mark) => uploaded.get(mark.scope) !== mark.bestTimeMs,
				);

				if (!next) break;

				const result = await upload(next);

				if (disposed) break;

				if (shouldRetryLeaderboardUpload(result)) {
					const delayMs = getLeaderboardRetryDelay(failures);
					failures += 1;
					retryTimer = setTimer(() => {
						retryTimer = null;
						void run();
					}, delayMs);
					break;
				}

				failures = 0;
				// Si mientras subía llegó una marca mejor, la siguiente vuelta la
				// ve distinta de esta y la sube.
				uploaded.set(next.scope, next.bestTimeMs);
			}
		} finally {
			running = false;
		}
	}

	function dispose() {
		disposed = true;

		if (retryTimer !== null) {
			clearTimer(retryTimer);
			retryTimer = null;
		}
	}

	return { run, dispose };
}
