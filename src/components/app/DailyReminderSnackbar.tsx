import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLearningData } from "@/store/slices/gameSlice";
import { saveDailyReminderAnswer } from "@/utils/learning-storage";
import {
	type DailyReminderResult,
	subscribeToDailyReminder,
} from "@/utils/push-notifications";

/** Resultados que se explican en el propio aviso en vez de cerrarlo (D127). */
type ExplainedResult = Exclude<DailyReminderResult, "subscribed" | "dismissed">;

type Status = "question" | "subscribing" | ExplainedResult;

interface Explanation {
	emoji: string;
	title: string;
	body: string;
	/** Si se ofrece "Reintentar": solo cuando quien juega puede arreglarlo sin salir. */
	canRetry: boolean;
}

// ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #41): los textos de por qué no se
// activó el recordatorio y cómo arreglarlo.
const EXPLANATIONS: Record<ExplainedResult, Explanation> = {
	denied: {
		emoji: "🔕",
		title: "Las notificaciones están bloqueadas",
		body: "Este navegador no deja que World Flags te mande avisos. Para activarlos, abre los permisos del sitio (el icono junto a la dirección web), permite las notificaciones y pulsa «Reintentar».",
		canRetry: true,
	},
	failed: {
		emoji: "⚠️",
		title: "No pudimos activar el recordatorio",
		body: "Algo falló al guardar el aviso en este dispositivo. Inténtalo de nuevo en un momento.",
		canRetry: true,
	},
	"ios-needs-install": {
		emoji: "📲",
		title: "Instala la app para recibir avisos",
		body: "En iPhone y iPad los avisos solo funcionan con World Flags instalada: en Safari, toca Compartir y luego «Añadir a pantalla de inicio», y ábrela desde ahí.",
		canRetry: false,
	},
	"insecure-context": {
		emoji: "🔒",
		title: "Los avisos necesitan una conexión segura",
		body: "El navegador solo permite avisos en páginas con https. Abre World Flags desde su dirección segura para activarlos.",
		canRetry: false,
	},
	unsupported: {
		emoji: "🔕",
		title: "Este navegador no permite avisos",
		body: "Puedes activar el recordatorio desde otro navegador o dispositivo.",
		canRetry: false,
	},
};

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
 * Si el recordatorio no se pudo activar (permiso bloqueado, navegador sin
 * soporte, iPhone sin instalar, fallo al suscribir), el aviso no se cierra en
 * silencio: pasa a explicar por qué y qué hacer (D127). Solo el éxito, o que
 * quien juega cierre el diálogo del navegador sin elegir, lo cierran solos.
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
	const [status, setStatus] = useState<Status>("question");

	const previousLastResultRef = useRef(lastResult);
	const hasTriggeredRef = useRef(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const firstActionRef = useRef<HTMLButtonElement>(null);
	// El botón pulsado desaparece al cambiar de estado: si el foco estaba en
	// el aviso, se lleva a la primera acción del estado nuevo para no dejarlo
	// caer en `body`. Si estaba en otro sitio, no se le roba.
	const shouldRestoreFocusRef = useRef(false);

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

	useEffect(() => {
		if (status === "subscribing" || !shouldRestoreFocusRef.current) return;

		shouldRestoreFocusRef.current = false;
		firstActionRef.current?.focus();
	}, [status]);

	if (!visible) {
		return null;
	}

	const answer = (optedIn: boolean) => {
		dispatch(setLearningData(saveDailyReminderAnswer(learningData, optedIn)));
		setVisible(false);
	};

	const handleAccept = async () => {
		// Primero la petición de permiso, antes de cualquier otra cosa: tiene
		// que salir dentro del gesto del clic o el navegador no enseña su
		// diálogo (D126). `subscribeToDailyReminder` llama a
		// `Notification.requestPermission()` de forma síncrona.
		const pending = subscribeToDailyReminder(user?.id ?? null);

		shouldRestoreFocusRef.current =
			containerRef.current?.contains(document.activeElement) ?? false;
		setStatus("subscribing");

		const result = await pending;

		if (result === "subscribed") {
			answer(true);
			return;
		}

		if (result === "dismissed") {
			answer(false);
			return;
		}

		setStatus(result);
	};

	const isSubscribing = status === "subscribing";
	const explanation =
		status === "question" || status === "subscribing"
			? null
			: EXPLANATIONS[status];

	return (
		<div
			ref={containerRef}
			className="pointer-events-auto flex w-full flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3 shadow-xl duration-200 animate-in fade-in-0 slide-in-from-top-4"
		>
			<div className="flex items-start gap-3">
				<span
					className="shrink-0 text-[1.5rem] leading-none"
					aria-hidden="true"
				>
					{explanation?.emoji ?? "🔔"}
				</span>

				<span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
					<strong className="text-[0.9rem] text-surface-soft">
						{explanation?.title ?? "¿Te aviso mañana para seguir tu racha?"}
					</strong>
					<span className="text-[0.78rem] text-text-placeholder">
						{explanation?.body ??
							"Te mandamos un recordatorio a esta hora, todos los días."}
					</span>
				</span>
			</div>

			{explanation ? (
				<div className="flex gap-2">
					{/* Cerrar cuenta como "no": sin permiso no hay recordatorio, y
					    volver a preguntar en cada partida sería insistir. */}
					<Button
						ref={firstActionRef}
						color="neutral"
						variant="soft"
						onClick={() => answer(false)}
					>
						{explanation.canRetry ? "Cerrar" : "Entendido"}
					</Button>
					{explanation.canRetry && (
						<Button color="primary" onClick={handleAccept}>
							Reintentar
						</Button>
					)}
				</div>
			) : (
				<div className="flex gap-2">
					<Button
						ref={firstActionRef}
						color="neutral"
						variant="soft"
						onClick={() => answer(false)}
						disabled={isSubscribing}
					>
						No, gracias
					</Button>
					<Button
						color="primary"
						onClick={handleAccept}
						disabled={isSubscribing}
					>
						Sí, avísame
					</Button>
				</div>
			)}
		</div>
	);
}
