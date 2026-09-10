import type { ReactNode } from "react";

interface TooltipProps {
	id?: string;
	label: string;
	children: ReactNode;
	position?: "left" | "right";
	/** Lado del disparador donde aparece la burbuja. */
	side?: "top" | "bottom";
}

/**
 * Tooltip solo-CSS: aparece en hover, focus-within y active. No añade
 * semántica interactiva propia (evita el "nested interactive" de envolver un
 * `<button>` con el tooltip de React Aria); el nombre accesible lo pone el
 * `aria-label` del control hijo. La burbuja va `aria-hidden` y también se
 * expone como `role="tooltip"` para lectores que sí la asocian por `id`.
 * Estilado con tokens de HeroUI para ir a juego con el resto.
 */
export function Tooltip({
	id,
	label,
	children,
	position = "right",
	side = "top",
}: TooltipProps) {
	const isTop = side === "top";

	return (
		<span className="group/tooltip relative inline-flex">
			{children}

			<span
				id={id}
				role="tooltip"
				className={`
					pointer-events-none absolute z-50 left-1/2 w-max max-w-52 -translate-x-1/2
					rounded-[calc(var(--radius)*0.6)] bg-[var(--overlay)] px-2 py-1.5
					text-xs font-bold leading-snug text-[var(--overlay-foreground)]
					shadow-[var(--overlay-shadow,0_8px_24px_rgb(0_0_0/0.18))]
					border border-[var(--border)]
					opacity-0 scale-95 transition-[opacity,transform] duration-150 ease-out
					group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100
					group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100
					group-active/tooltip:opacity-100 group-active/tooltip:scale-100
					${isTop ? "bottom-[calc(100%+0.4rem)]" : "top-[calc(100%+0.4rem)]"}
					${position === "left" ? "left-auto right-0 translate-x-0" : ""}
				`}
			>
				{label}
			</span>
		</span>
	);
}
