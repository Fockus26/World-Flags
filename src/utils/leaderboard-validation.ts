import { countries } from "@/data/countries";
import { GAME_TYPES, LEADERBOARD_SCOPES } from "@/types/country";

/**
 * Validación del ranking en el servidor (D112–D114). La hace un trigger en
 * `leaderboard_entries` (`supabase/leaderboard-validacion.sql`, local): este
 * módulo solo guarda los números de los que sale ese SQL, para que un test
 * los compare con el catálogo, y el código con el que el trigger rechaza.
 *
 * Tiempo mínimo por respuesta que ningún humano baja en un rush completo de
 * "Todo el mundo" (D112). 300 ms × 197 países = 59,1 s: para ganarle hay que
 * escribir sin pensar a más de ~27 teclas por segundo (Países: 1648 letras;
 * Banderas: 1648 + un Enter por bandera; Capitales: 1386 + Enter), más del
 * doble del récord de mecanografía sostenida. Es generoso a propósito: mejor
 * dejar pasar un tramposo que rechazar a alguien honesto.
 */
export const LEADERBOARD_MIN_MS_PER_ANSWER = 300;

/**
 * Código del rechazo del trigger. PostgREST convierte un SQLSTATE `PTxyz` en
 * el HTTP `xyz` y lo devuelve tal cual en `error.code` (D113).
 */
export const LEADERBOARD_TIME_REJECTED_CODE = "PT422";

/**
 * Mínimo de cada scope que se lee hoy (`LEADERBOARD_SCOPES`). Los tres
 * recorren el catálogo entero. Los scopes viejos ("world",
 * "capitals:world") y los desconocidos no tienen mínimo: nadie los lee
 * (D114).
 */
export function getLeaderboardMinimums(): Record<string, number> {
	const minTimeMs = countries.length * LEADERBOARD_MIN_MS_PER_ANSWER;

	return Object.fromEntries(
		GAME_TYPES.map((gameType) => [LEADERBOARD_SCOPES[gameType], minTimeMs]),
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
