import type { ReactNode } from "react";

interface TooltipProps {
	id?: string;
	label: string;
	children: ReactNode;
	position?: "left" | "right";
	/**
	 * Lado del disparador donde aparece el tooltip. "top" (por defecto) queda
	 * mejor casi siempre, pero un disparador pegado al borde superior de un
	 * contenedor con overflow-hidden lo corta — ahí usar "bottom".
	 */
	side?: "top" | "bottom";
}

export function Tooltip({ id, label, children, position = "right", side = "top" }: TooltipProps) {
	const positionClass = position === "right" ? "-right-1" : "-left-2";
	const isTop = side === "top";

	return (
		<span
			className={`
				inline-flex
				relative
				hover:**:[[role=tooltip]]:pointer-events-auto
				hover:**:[[role=tooltip]]:opacity-100
				hover:**:[[role=tooltip]]:translate-y-0
				hover:**:[[role=tooltip]]:scale-100
				active:**:[[role=tooltip]]:pointer-events-auto
				active:**:[[role=tooltip]]:opacity-100
				active:**:[[role=tooltip]]:translate-y-0
				active:**:[[role=tooltip]]:scale-100
				focus-within:**:[[role=tooltip]]:pointer-events-auto
				focus-within:**:[[role=tooltip]]:opacity-100
				focus-within:**:[[role=tooltip]]:translate-y-0
				focus-within:**:[[role=tooltip]]:scale-100
				after:absolute
				max-md:after:hidden
				${isTop ? "after:bottom-[calc(100%+0.2rem)]" : "after:top-[calc(100%+0.2rem)]"}
				after:left-1/2
				after:h-0
				after:w-0
				after:-translate-x-1/2
				after:border-x-6
				${isTop ? "after:border-t-6" : "after:border-b-6"}
				after:border-solid
				after:border-x-transparent
				${isTop ? "after:border-t-(--color-primary-soft)" : "after:border-b-(--color-primary-soft)"}
				after:opacity-0
				after:transition-opacity
				after:duration-160
				hover:after:opacity-100
				active:after:opacity-100
				focus-within:after:opacity-100
			`}
		>
			{children}

			<span
				id={id}
				role="tooltip"
				className={`hidden md:inline-block pointer-events-none absolute ${
					isTop
						? "bottom-[calc(100%+0.5rem)] translate-y-1"
						: "top-[calc(100%+0.5rem)] -translate-y-1"
				} z-20 w-max max-w-52 rounded-sm bg-surface-hover px-1.5 py-2 text-xs font-bold leading-5 text-surface-soft opacity-0 transition-[opacity,transform] duration-160 ease-in-out scale-95 ${positionClass}`}
			>
				{label}
			</span>
		</span>
	);
}
