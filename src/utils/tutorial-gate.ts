import type { HydrationStatus } from "@/store/slices/gameSlice";
import type { UserLearningData } from "@/types/progress";
import { hasLearningProgress } from "@/utils/learning-storage";

export interface TutorialGateInput {
	hydrationStatus: HydrationStatus;
	/** `getTutorialSeen()`: ya se ofreció en este dispositivo. */
	seenOnThisDevice: boolean;
	learningData: UserLearningData;
	/** Hay una partida, una práctica diaria o unos resultados en pantalla. */
	isBusy: boolean;
}

/**
 * ¿Se ofrece la partida guiada sola, sin que nadie la pida (D071)?
 *
 * Solo con `hydrationStatus === "ready"`, nunca con `"local"`: en `local` los
 * datos son la copia de `localStorage` sin contrastar con la nube (Auth que no
 * resolvió en 2,5 s, o una sincronización fallida — D042/D044), así que
 * "parece no tener progreso" puede ser simplemente que su progreso todavía no
 * ha llegado. Esperar es gratis; ofrecerle un tutorial a quien lleva meses
 * jugando, no.
 *
 * `hasLearningProgress` es la puerta de verdad (la misma que protege el
 * progreso en `planSync`, D056): cubre los tres juegos, los logros y el
 * historial de sesiones. Con cualquiera de ellos no vacío, no se ofrece —
 * aunque la marca de este dispositivo no exista.
 *
 * Reabrirlo a mano (pie de "Perfil y configuración") NO pasa por aquí: quien
 * lo pide lo ve siempre, tenga el progreso que tenga.
 */
export function shouldOfferTutorial({
	hydrationStatus,
	seenOnThisDevice,
	learningData,
	isBusy,
}: TutorialGateInput): boolean {
	if (hydrationStatus !== "ready") return false;
	if (seenOnThisDevice) return false;
	if (isBusy) return false;

	return !hasLearningProgress(learningData);
}
