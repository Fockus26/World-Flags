import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	closeTutorial,
	offerTutorial,
	openTutorial,
	skipOfferingTutorial,
} from "@/store/slices/tutorialSlice";
import { getTutorialSeen, saveTutorialSeen } from "@/utils/learning-storage";
import { shouldOfferTutorial } from "@/utils/tutorial-gate";

/**
 * La partida guiada de la primera vez (D071): si está abierta, cómo abrirla a
 * mano y la decisión de ofrecerla sola.
 *
 * El efecto que la ofrece corre una sola vez por carga (`hasBeenOffered`): una
 * re-hidratación posterior —un login, la sincronización que llega tras el modo
 * `local`— no la vuelve a sacar, y cerrarla tampoco la reabre.
 */
export function useTutorial() {
	const dispatch = useAppDispatch();

	const isOpen = useAppSelector((state) => state.tutorial.isOpen);
	const hasBeenOffered = useAppSelector(
		(state) => state.tutorial.hasBeenOffered,
	);

	const hydrationStatus = useAppSelector((state) => state.game.hydrationStatus);
	const learningData = useAppSelector((state) => state.game.learningData);
	const activeGame = useAppSelector((state) => state.game.activeGame);
	const lastResult = useAppSelector((state) => state.game.lastResult);
	const dailyPracticeQueue = useAppSelector(
		(state) => state.game.dailyPracticeQueue,
	);

	const isBusy =
		activeGame !== null || lastResult !== null || dailyPracticeQueue !== null;

	useEffect(() => {
		if (hasBeenOffered) return;

		// Todavía no se sabe de quién es este progreso: se espera. No se marca
		// `hasBeenOffered`, para poder volver a evaluarlo cuando llegue.
		if (hydrationStatus !== "ready") return;

		if (
			shouldOfferTutorial({
				hydrationStatus,
				seenOnThisDevice: getTutorialSeen(),
				learningData,
				isBusy,
			})
		) {
			dispatch(offerTutorial());
			return;
		}

		dispatch(skipOfferingTutorial());
	}, [hasBeenOffered, hydrationStatus, learningData, isBusy, dispatch]);

	return {
		isOpen,

		/** Reabrirlo a mano: se ve siempre, con o sin progreso. */
		open: () => dispatch(openTutorial()),

		/**
		 * Cerrarlo, se haya completado o saltado: las dos cosas cuentan como
		 * "ya se ofreció". Quien lo salte lo tiene otra vez en el pie de
		 * "Perfil y configuración".
		 */
		close: () => {
			saveTutorialSeen();
			dispatch(closeTutorial());
		},
	};
}
