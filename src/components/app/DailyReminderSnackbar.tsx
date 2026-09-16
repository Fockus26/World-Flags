import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLearningData } from "@/store/slices/gameSlice";
import { saveDailyReminderAnswer } from "@/utils/learning-storage";
import { subscribeToDailyReminder } from "@/utils/push-notifications";

/**
 * Snackbar "¿te aviso mañana...?" (D025): reutiliza la anatomía/estilo de
 * `AchievementToasts`, pero no se auto-descarta — pedir permiso de
 * notificaciones necesita una decisión explícita del usuario, no un timeout.
 *
 * Copy provisional, ver `context/CONTENT_CHECKLIST.md`.
 *
 * Aparece una sola vez: justo después de terminar la primera sesión sin
 * responder todavía (`lastResult` pasa de `null` a un resultado), no en
 * cualquier carga con sesiones ya jugadas — así no se le pregunta de golpe a
 * quien ya tenía progreso antes de que existiera esta unidad.
 *
 * Monta su propio contenido, sin posicionamiento: vive dentro del contenedor
 * apilable de `SystemSnackbars` junto con `UpdateAvailableSnackbar`.
 */
export function DailyReminderSnackbar() {
	const dispatch = useAppDispatch();
	const { user } = useAuth();

	const learningData = useAppSelector((state) => state.game.learningData);
	const hydrationStatus = useAppSelector((state) => state.game.hydrationStatus);
	const lastResult = useAppSelector((state) => state.game.lastResult);

	const [visible, setVisible] = useState(false);
	const [isSubscribing, setIsSubscribing] = useState(false);

	const previousLastResultRef = useRef(lastResult);
	const hasTriggeredRef = useRef(false);

	useEffect(() => {
		const justFinishedASession =
			previousLastResultRef.current === null && lastResult !== null;
		previousLastResultRef.current = lastResult;

		if (
			justFinishedASession &&
			!hasTriggeredRef.current &&
			hydrationStatus === "ready" &&
			!learningData.dailyReminder.answered
		) {
			hasTriggeredRef.current = true;
			setVisible(true);
		}
	}, [lastResult, hydrationStatus, learningData.dailyReminder.answered]);

	if (!visible) {
		return null;
	}

	const answer = (optedIn: boolean) => {
		dispatch(setLearningData(saveDailyReminderAnswer(learningData, optedIn)));
		setVisible(false);
	};

	const handleAccept = async () => {
		setIsSubscribing(true);
		await subscribeToDailyReminder(user?.id ?? null);
		setIsSubscribing(false);
		answer(true);
	};

	return (
		<div className="pointer-events-auto flex w-full flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3 shadow-xl duration-200 animate-in fade-in-0 slide-in-from-top-4">
			<div className="flex items-start gap-3">
				<span
					className="shrink-0 text-[1.5rem] leading-none"
					aria-hidden="true"
				>
					🔔
				</span>

				<span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
					<strong className="text-[0.9rem] text-surface-soft">
						¿Te aviso mañana para seguir tu racha?
					</strong>
					<span className="text-[0.78rem] text-text-placeholder">
						Te mandamos un recordatorio a esta hora, todos los días.
					</span>
				</span>
			</div>

			<div className="flex gap-2">
				<Button
					color="neutral"
					variant="soft"
					onClick={() => answer(false)}
					disabled={isSubscribing}
				>
					No, gracias
				</Button>
				<Button color="primary" onClick={handleAccept} disabled={isSubscribing}>
					Sí, avísame
				</Button>
			</div>
		</div>
	);
}
