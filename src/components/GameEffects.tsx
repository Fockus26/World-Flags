import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLearningData } from "@/store/slices/gameSlice";
import { pushLearningData, syncOnLogin } from "@/utils/cloud-storage";
import { clearLearningData, getLearningData, saveLearningData } from "@/utils/learning-storage";

export function GameEffects() {
	const dispatch = useAppDispatch();

	const learningData = useAppSelector((state) => state.game.learningData);

	const { user, status } = useAuth();

	const hasSyncedRef = useRef(false);

	const pushTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	/**
	 * Sincronizar datos cuando el usuario inicia sesión.
	 */
	useEffect(() => {
		if (status !== "authenticated" || !user || hasSyncedRef.current) {
			return;
		}

		hasSyncedRef.current = true;

		syncOnLogin(user.id, getLearningData()).then((merged) => {
			saveLearningData(merged);
			dispatch(setLearningData(merged));
		});
	}, [status, user, dispatch]);

	/**
	 * Cuando volvemos a modo invitado,
	 * limpiar los datos sincronizados y cargar
	 * nuevamente los datos locales.
	 */
	useEffect(() => {
		if (status !== "guest" || !hasSyncedRef.current) {
			return;
		}

		hasSyncedRef.current = false;

		clearLearningData();

		dispatch(setLearningData(getLearningData()));
	}, [status, dispatch]);

	/**
	 * Subir cambios al servidor con debounce.
	 */
	useEffect(() => {
		if (status !== "authenticated" || !user) {
			return;
		}

		clearTimeout(pushTimeoutRef.current);

		pushTimeoutRef.current = setTimeout(() => {
			pushLearningData(user.id, learningData);
		}, 800);

		return () => {
			clearTimeout(pushTimeoutRef.current);
		};
	}, [learningData, status, user]);

	return null;
}
