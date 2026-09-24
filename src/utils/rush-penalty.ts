import { RUSH_SKIP_PENALTY_MS, RUSH_WRONG_PENALTY_MS } from "@/types/country";

/** "10 s": la duración del castigo. */
function formatPenaltySeconds(penaltyMs: number): string {
	return `${Math.round(penaltyMs / 1000)} s`;
}

/** "+10 s": el castigo tal como se le muestra al jugador al fallar. */
export function formatPenalty(penaltyMs: number): string {
	return `+${formatPenaltySeconds(penaltyMs)}`;
}

/**
 * La regla del competitivo de Banderas y Capitales en una frase, para las
 * ayudas (configuración, partida guiada). Sale de las constantes: si la regla
 * cambia, el texto cambia con ella (D075).
 *
 * ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #26).
 */
export const RUSH_PENALTY_SUMMARY = `cada fallo suma ${formatPenaltySeconds(RUSH_WRONG_PENALTY_MS)} al cronómetro y cada salto, ${formatPenaltySeconds(RUSH_SKIP_PENALTY_MS)}`;
