import { useEffect, useRef } from "react";

import { store } from "@/store";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { enqueueAchievementToasts } from "@/store/slices/achievementToastSlice";
import { setLearningData } from "@/store/slices/gameSlice";

import { getNewlyUnlocked } from "@/utils/achievements";

import { sealAchievements } from "@/utils/learning-storage";
import { playSound } from "@/utils/sound";

/**
 * Sella los logros que se acaban de cumplir y anuncia los que ocurren en vivo
 * como snackbar (`AchievementToasts`).
 *
 * Observa `learningData` en vez de emitir eventos desde cada acción del juego:
 * un desbloqueo puede venir de terminar una sesión, de calificar una bandera
 * suelta en la práctica diaria o de un modo de juego que todavía no existe.
 * Con un único observador no hay forma de olvidarse de emitir el evento en
 * alguna de esas rutas, y además los logros derivables se desbloquean
 * retroactivamente en cuanto el usuario abre la app.
 *
 * REGLA QUE HACE QUE ESTO TERMINE — "sin delta, no se despacha":
 *
 * Este efecto escribe en `learningData`, que es justo lo que lo dispara. Corta
 * porque `getNewlyUnlocked` devuelve vacío en la segunda pasada (los ids ya
 * están sellados y un logro nunca se des-desbloquea; ver la invariante en
 * `utils/achievements.ts`), y entonces no se despacha nada.
 *
 * Esa misma regla es lo que mantiene vivo el push a Supabase: el efecto de
 * `GameEffects` cancela y reprograma su timeout con cada cambio de
 * `learningData`, así que un despacho incondicional aquí lo empujaría hacia
 * adelante para siempre y no subiría nunca. Ese, y no un push duplicado, es el
 * fallo a evitar.
 */
export function AchievementsEffects() {
	const dispatch = useAppDispatch();

	const learningData = useAppSelector((state) => state.game.learningData);

	const hydrationStatus = useAppSelector((state) => state.game.hydrationStatus);

	/**
	 * La primera evaluación tras CADA hidratación (arranque, o un login/logout
	 * que trae datos nuevos) sella lo que ya se había ganado, pero NO lo
	 * anuncia como snackbar: es un reencuadre retroactivo del progreso que ya
	 * tenías, no algo que "acaba de pasar" — si no, abrir la app con 120 países
	 * ya aprendidos dispararía media docena de avisos de golpe. Cualquier
	 * desbloqueo posterior, con los datos ya asentados, sí es en vivo y se
	 * anuncia.
	 */
	const isNextPassSilentRef = useRef(true);

	// biome-ignore lint/correctness/useExhaustiveDependencies: learningData dispara el efecto intencionalmente, aunque el cuerpo lea el valor fresco del store (ver comentario abajo)
	useEffect(() => {
		// Sin esperar a la hidratación se sellarían logros contra datos a medio
		// cargar (p. ej. el estado por defecto mientras Supabase responde).
		if (hydrationStatus !== "ready") {
			// Cualquier salida de "ready" (arranque, login, logout) hace que la
			// próxima vez que se llegue a "ready" vuelva a ser una
			// reconciliación silenciosa, no un anuncio en vivo — cubre también
			// los logros que un login trae fusionados desde otro dispositivo.
			isNextPassSilentRef.current = true;
			return;
		}

		// Se lee del store, NO de `learningData` (el valor del closure de este
		// render): entre que este efecto se programó y corrió pudo haber
		// despachado otro `setLearningData` más reciente (p. ej. varias
		// calificaciones seguidas), y `setLearningData` reemplaza el slice
		// entero — sellar sobre un `learningData` viejo perdería ese cambio y
		// dejaría el anuncio del logro sin disparar. Mismo criterio que
		// `getCurrentLearningData` en `useGame.ts`.
		const currentData = store.getState().game.learningData;
		const newlyUnlocked = getNewlyUnlocked(currentData);

		if (newlyUnlocked.length === 0) {
			return;
		}

		dispatch(setLearningData(sealAchievements(currentData, newlyUnlocked)));

		if (isNextPassSilentRef.current) {
			isNextPassSilentRef.current = false;
			return;
		}

		dispatch(enqueueAchievementToasts(newlyUnlocked));

		// Un sonido por tanda, no uno por logro (D080). Nunca en la pasada
		// silenciosa de arriba (la siembra retroactiva, o lo que trae un
		// login), ni por logros que llegan ya sellados de otro dispositivo:
		// esos no aparecen en `newlyUnlocked`.
		playSound("achievement");
	}, [learningData, hydrationStatus, dispatch]);

	return null;
}
