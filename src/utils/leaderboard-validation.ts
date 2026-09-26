import { countries } from "@/data/countries";
import {
	GAME_TYPES,
	getLeaderboardScope,
	LEADERBOARD_REGIONS,
	type PracticeRegion,
} from "@/types/country";
import { REGION_COUNTRY_COUNTS } from "@/utils/region-stats";

/**
 * Validación del ranking en el servidor (D112–D114). La hace un trigger en
 * `leaderboard_entries` (`supabase/leaderboard-validacion.sql`, ampliado a los
 * continentes en `supabase/leaderboard-continentes.sql`, locales): este
 * módulo guarda los números de los que sale ese SQL, para que un test los
 * compare con el catálogo, y el código con el que el trigger rechaza. El
 * cliente usa los mismos mínimos para no guardar como mejor marca un tiempo
 * imposible (D139).
 *
 * Tiempo mínimo por respuesta que ningún humano baja en un rush completo
 * (D112). 300 ms × 197 países = 59,1 s en "Todo el mundo": para ganarle hay
 * que escribir sin pensar a más de ~27 teclas por segundo (Países: 1648
 * letras; Banderas: 1648 + un Enter por bandera; Capitales: 1386 + Enter),
 * más del doble del récord de mecanografía sostenida. Es generoso a
 * propósito: mejor dejar pasar un tramposo que rechazar a alguien honesto.
 */
export const LEADERBOARD_MIN_MS_PER_ANSWER = 300;

/**
 * Código del rechazo del trigger. PostgREST convierte un SQLSTATE `PTxyz` en
 * el HTTP `xyz` y lo devuelve tal cual en `error.code` (D113).
 */
export const LEADERBOARD_TIME_REJECTED_CODE = "PT422";

/**
 * Mínimo de un rush completo de `region` (cualquier juego): nº de países del
 * alcance × 300 ms (D112, D138).
 */
export function getRushMinTimeMs(region: PracticeRegion): number {
	const countryCount =
		region === "world" ? countries.length : REGION_COUNTRY_COUNTS[region];

	return countryCount * LEADERBOARD_MIN_MS_PER_ANSWER;
}

/**
 * ¿Un rush completo de `region` pudo durar `elapsedMs`? Lo que no, no se
 * guarda como mejor marca (D139): un salto del reloj a mitad de partida
 * dejaba un tiempo que ninguna partida real mejora y que el servidor
 * rechaza, así que nada más volvía a subir al ranking.
 */
export function isPlausibleRushTime(
	region: PracticeRegion,
	elapsedMs: number,
): boolean {
	return Number.isFinite(elapsedMs) && elapsedMs >= getRushMinTimeMs(region);
}

/**
 * Mínimo de cada scope que se lee hoy: los 3 de "Todo el mundo" y los 24 de
 * continente (D138), todos con `getRushMinTimeMs`. Los scopes viejos
 * ("world", "capitals:world") y los desconocidos no tienen mínimo: nadie los
 * lee (D114).
 */
export function getLeaderboardMinimums(): Record<string, number> {
	return Object.fromEntries(
		GAME_TYPES.flatMap((gameType) =>
			LEADERBOARD_REGIONS.map((region) => [
				getLeaderboardScope(gameType, region),
				getRushMinTimeMs(region),
			]),
		),
	);
}

/**
 * Cómo acabó la subida de una marca al ranking (`upsertLeaderboardEntry`):
 * `uploaded`, `failed` (red o servidor: se reintenta) o `rejected` (el
 * servidor la rechazó por imposible: es definitivo, D113).
 */
export type LeaderboardUploadResult = "uploaded" | "failed" | "rejected";

/** ¿El servidor rechazó el tiempo? Es definitivo: reintentarlo no sirve (D113). */
export function isLeaderboardTimeRejected(error: { code?: string }): boolean {
	return error.code === LEADERBOARD_TIME_REJECTED_CODE;
}

/**
 * Si una marca que no llegó al ranking se vuelve a intentar (D113): solo
 * cuando falló la red o el servidor, nunca cuando el trigger la rechazó.
 * Va aquí, y no en `cloud-storage.ts`, para probarla sin cargar Supabase.
 */
export function shouldRetryLeaderboardUpload(
	result: LeaderboardUploadResult,
): boolean {
	return result === "failed";
}
