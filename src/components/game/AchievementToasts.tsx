import { Xmark } from "iconoir-react";
import { useEffect, useRef, useState } from "react";
import {
	type AchievementToastView,
	useAchievementToasts,
} from "@/hooks/useAchievementToasts";

/** Cuánto queda visible antes de empezar a salir. */
const VISIBLE_MS = 6000;
/** Tiene que coincidir con la duración de `animate-out` de abajo. */
const EXIT_MS = 220;

function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;

	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function AchievementToastCard({
	toast,
	onDismiss,
}: {
	toast: AchievementToastView;
	onDismiss: () => void;
}) {
	const [isLeaving, setIsLeaving] = useState(false);
	// El timeout de auto-ocultado no debe reiniciarse si `onDismiss` cambia de
	// identidad entre renders; se lee de un ref para no tener que meterlo en
	// las dependencias del efecto de arriba.
	const onDismissRef = useRef(onDismiss);
	onDismissRef.current = onDismiss;

	useEffect(() => {
		const hideTimeoutId = window.setTimeout(() => {
			setIsLeaving(true);
		}, VISIBLE_MS);

		return () => window.clearTimeout(hideTimeoutId);
	}, []);

	useEffect(() => {
		if (!isLeaving) return;

		// Con movimiento reducido no tiene sentido esperar a una animación que
		// ya dura 0.01ms (bloque global de `global.css`): se quita al toque.
		const removeTimeoutId = window.setTimeout(
			() => onDismissRef.current(),
			prefersReducedMotion() ? 0 : EXIT_MS,
		);

		return () => window.clearTimeout(removeTimeoutId);
	}, [isLeaving]);

	return (
		<div
			className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-[color-mix(in_oklab,var(--success)_45%,transparent)] bg-success-soft p-3 shadow-xl duration-200 ${
				isLeaving
					? "animate-out fade-out-0 slide-out-to-right-4"
					: "animate-in fade-in-0 slide-in-from-right-4"
			}`}
		>
			<span className="shrink-0 text-[1.5rem] leading-none" aria-hidden="true">
				{toast.emoji}
			</span>

			<span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
				{/* La etiqueta va en color neutro, no verde: a este tamaño de
				    texto ni `success` (2.71:1) ni `success-hover` (3.92:1) llegan
				    a los 4.5:1 de AA. El verde queda para el fondo, el borde y el
				    emoji — nunca hace falta que el texto lo cargue solo. */}
				<span className="text-[0.7rem] font-black tracking-wide text-text-placeholder uppercase">
					Logro desbloqueado
				</span>
				<strong className="text-[0.9rem] text-surface-soft">
					{toast.name}
				</strong>
				<span className="text-[0.78rem] text-text-placeholder">
					{toast.description}
				</span>
			</span>

			<button
				type="button"
				className="shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-1 text-text-placeholder transition-colors duration-150 hover:text-surface-soft focus-visible:text-surface-soft"
				aria-label={`Descartar aviso de logro: ${toast.name}`}
				onClick={() => setIsLeaving(true)}
			>
				<Xmark className="size-4" aria-hidden="true" />
			</button>
		</div>
	);
}

/**
 * Snackbars de logro, apiladas abajo a la derecha (estilo Xbox/PS5): al
 * desbloquear varios de golpe se acoplan una encima de otra en vez de
 * pisarse. Mostrado en toda la app (se monta una sola vez en `FlagGame`), no
 * solo al terminar una sesión — un logro puede desbloquearse a mitad de una
 * partida (`gradeCountryReview`) o de la práctica diaria.
 *
 * Un solo contenedor `aria-live="polite"`: cada snackbar es un anuncio, así
 * que anida dentro sin su propio `aria-live` para no duplicar la lectura.
 */
export function AchievementToasts() {
	const { toasts, dismiss } = useAchievementToasts();

	if (toasts.length === 0) {
		return null;
	}

	return (
		<div
			role="status"
			aria-live="polite"
			aria-atomic="false"
			className="pointer-events-none fixed inset-x-3 bottom-3 z-[300] flex flex-col-reverse gap-2 sm:inset-x-auto sm:right-3 sm:w-[min(22rem,calc(100vw-1.5rem))]"
		>
			{toasts.map((toast) => (
				<AchievementToastCard
					key={toast.instanceId}
					toast={toast}
					onDismiss={() => dismiss(toast.instanceId)}
				/>
			))}
		</div>
	);
}
