import { Xmark } from "iconoir-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "@/hooks/useSyncStatus";

/**
 * Un corte breve (ascensor, túnel) no merece aviso: solo se muestra si dura
 * más que esto. Y si no llegó a mostrarse, tampoco se anuncia la vuelta.
 */
const NOTICE_DELAY_MS = 2_000;

/** Cuánto queda visible el aviso de vuelta (se puede cerrar antes). */
const RECONNECTED_VISIBLE_MS = 5_000;

type ConnectivityProblem = "offline" | "server-error";

/**
 * Aviso de conexión (D052), en el contenedor de `SystemSnackbars`:
 *
 * - **Sin conexión** (o el servidor no responde): se queda mientras dure,
 *   con "Entendido" para ocultarlo hasta el siguiente corte. Dice lo que pasa
 *   con el progreso: se guarda en este dispositivo y, con cuenta, se sube al
 *   volver.
 * - **Sincronización fallida con red** (solo con cuenta): mismo trato, otro
 *   texto — no es falta de conexión y decirlo sería mentir.
 * - **De vuelta**: breve, se va solo. Con cuenta solo llega tras una
 *   sincronización buena (`isOnline` vuelve a `true` únicamente entonces),
 *   así que "sincronizado" es verdad.
 *
 * El estado nunca va solo por color: emoji + título + texto. Copy
 * provisional (`context/CONTENT_CHECKLIST.md`).
 */
export function ConnectivitySnackbar() {
	const { status } = useAuth();
	const { isOnline, hasServerError } = useSyncStatus();

	const isAuthenticated = status === "authenticated";

	const problem: ConnectivityProblem | null = !isOnline
		? "offline"
		: isAuthenticated && hasServerError
			? "server-error"
			: null;

	/** El problema que se está mostrando (tras `NOTICE_DELAY_MS`). */
	const [shownProblem, setShownProblem] = useState<ConnectivityProblem | null>(
		null,
	);
	const [isDismissed, setIsDismissed] = useState(false);
	const [showReconnected, setShowReconnected] = useState(false);

	// Se acabó un corte que llegó a mostrarse: se anuncia la vuelta. Ajuste de
	// estado durante el render (patrón de React para derivar de un valor
	// anterior), sin esperar a un efecto.
	if (!problem && shownProblem) {
		setShownProblem(null);
		setIsDismissed(false);
		setShowReconnected(true);
	}

	useEffect(() => {
		if (!problem) return;

		setShowReconnected(false);

		// Si ya se mostraba un problema (sin red → error de servidor), el
		// cambio es inmediato.
		const timeoutId = setTimeout(
			() => setShownProblem(problem),
			shownProblem ? 0 : NOTICE_DELAY_MS,
		);

		return () => clearTimeout(timeoutId);
	}, [problem, shownProblem]);

	useEffect(() => {
		if (!showReconnected) return;

		const timeoutId = setTimeout(
			() => setShowReconnected(false),
			RECONNECTED_VISIBLE_MS,
		);

		return () => clearTimeout(timeoutId);
	}, [showReconnected]);

	if (shownProblem && !isDismissed) {
		const isOffline = shownProblem === "offline";

		return (
			<div className="pointer-events-auto flex w-full flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3 shadow-xl duration-200 animate-in fade-in-0 slide-in-from-top-4">
				<div className="flex items-start gap-3">
					<span
						className="shrink-0 text-[1.5rem] leading-none"
						aria-hidden="true"
					>
						{isOffline ? "📡" : "⚠️"}
					</span>

					<span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
						<strong className="text-[0.9rem] text-surface-soft">
							{isOffline ? "Sin conexión" : "No se pudo sincronizar"}
						</strong>
						<span className="text-[0.78rem] text-text-placeholder">
							{!isAuthenticated
								? "Puedes seguir practicando: tu progreso se guarda en este dispositivo. El ranking y el inicio de sesión vuelven con la conexión."
								: isOffline
									? "Tu progreso se guarda en este dispositivo y se subirá a tu cuenta cuando vuelva la conexión."
									: "Tu progreso se guarda en este dispositivo. Lo volveremos a intentar en unos segundos."}
						</span>
					</span>
				</div>

				<div className="flex justify-end">
					<Button
						color="neutral"
						variant="soft"
						fullWidth={false}
						onClick={() => setIsDismissed(true)}
					>
						Entendido
					</Button>
				</div>
			</div>
		);
	}

	if (showReconnected) {
		return (
			<div className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-[color-mix(in_oklab,var(--success)_45%,transparent)] bg-success-soft p-3 shadow-xl duration-200 animate-in fade-in-0 slide-in-from-top-4">
				<span
					className="shrink-0 text-[1.5rem] leading-none"
					aria-hidden="true"
				>
					✅
				</span>

				<span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
					<strong className="text-[0.9rem] text-surface-soft">
						{isAuthenticated ? "Progreso sincronizado" : "Conexión recuperada"}
					</strong>
					<span className="text-[0.78rem] text-text-placeholder">
						{isAuthenticated
							? "Tu progreso ya está guardado en tu cuenta."
							: "El ranking y el inicio de sesión vuelven a estar disponibles."}
					</span>
				</span>

				<button
					type="button"
					className="shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-1 text-text-placeholder transition-colors duration-150 hover:text-surface-soft focus-visible:text-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface-soft"
					aria-label="Descartar aviso de conexión"
					onClick={() => setShowReconnected(false)}
				>
					<Xmark className="size-4" aria-hidden="true" />
				</button>
			</div>
		);
	}

	return null;
}
