import {
	type ReactNode,
	useCallback,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
	id?: string;
	label: string;
	children: ReactNode;
	position?: "left" | "right";
	/** Lado del disparador donde aparece la burbuja. */
	side?: "top" | "bottom";
}

/**
 * Tooltip ligero: la burbuja se renderiza en un portal a `document.body` con
 * `position: fixed`, así nunca la recorta un ancestro con `overflow`
 * (modales, paneles scrolleables...). Se muestra en hover del ratón y en
 * `focus` del control hijo. No añade semántica interactiva propia — el nombre
 * accesible lo pone el `aria-label` del hijo; la burbuja se expone como
 * `role="tooltip"` y se enlaza por `aria-describedby`.
 */
export function Tooltip({ id, label, children, side = "top" }: TooltipProps) {
	const wrapperRef = useRef<HTMLSpanElement>(null);
	const generatedId = useId();
	const tooltipId = id ?? generatedId;
	const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

	const show = useCallback(() => {
		const el = wrapperRef.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		setCoords({
			x: r.left + r.width / 2,
			y: side === "top" ? r.top : r.bottom,
		});
	}, [side]);

	const hide = useCallback(() => setCoords(null), []);

	// Reposiciona si la ventana cambia mientras está visible.
	useLayoutEffect(() => {
		if (!coords) return;
		window.addEventListener("scroll", hide, true);
		window.addEventListener("resize", hide);
		return () => {
			window.removeEventListener("scroll", hide, true);
			window.removeEventListener("resize", hide);
		};
	}, [coords, hide]);

	return (
		<span
			ref={wrapperRef}
			className="inline-flex"
			onMouseEnter={show}
			onMouseLeave={hide}
			onFocusCapture={show}
			onBlurCapture={hide}
		>
			{children}

			{coords &&
				createPortal(
					<span
						id={tooltipId}
						role="tooltip"
						style={{
							position: "fixed",
							left: coords.x,
							top: coords.y,
							transform: `translate(-50%, ${side === "top" ? "calc(-100% - 0.4rem)" : "0.4rem"})`,
						}}
						className="pointer-events-none z-[200] w-max max-w-56 rounded-[calc(var(--radius)*0.6)] border border-[var(--border)] bg-[var(--overlay)] px-2 py-1.5 text-xs font-bold leading-snug text-[var(--overlay-foreground)] shadow-[var(--overlay-shadow,0_8px_24px_rgb(0_0_0/0.18))]"
					>
						{label}
					</span>,
					document.body,
				)}
		</span>
	);
}
