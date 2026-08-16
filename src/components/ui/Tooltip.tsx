import type { ReactNode } from "react";

interface TooltipProps {
	id?: string;
	label: string;
	children: ReactNode;
	position?: "left" | "right";
}

export function Tooltip({ id, label, children, position = "right" }: TooltipProps) {
	const positionClass = position === "right" ? "right-3 after:right-4" : "left-3 after:left-4";

	return (
		<span className="relative inline-flex hover:**:[[role=tooltip]]:pointer-events-auto hover:**:[[role=tooltip]]:opacity-100 hover:**:[[role=tooltip]]:translate-y-0 hover:**:[[role=tooltip]]:scale-100 focus-within:**:[[role=tooltip]]:pointer-events-auto focus-within:**:[[role=tooltip]]:opacity-100 focus-within:**:[[role=tooltip]]:translate-y-0 focus-within:**:[[role=tooltip]]:scale-100">
			{children}

			<span
				id={id}
				role="tooltip"
				className={`pointer-events-none absolute bottom-[calc(100%+0.55rem)] z-20 w-max max-w-52 rounded-sm bg-tooltip-bg p-2 text-3 font-bold leading-5 text-tooltip-text opacity-0 transition-[opacity,transform] duration-160 ease-in-out translate-y-1 scale-95 after:absolute after:top-full after:h-0 after:w-0 after:border-2 after:border-transparent after:border-t-(--color-tooltip-bg) ${positionClass}`}
			>
				{label}
			</span>
		</span>
	);
}
