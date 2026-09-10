import { Tooltip as HeroTooltip } from "@heroui/react";
import type { ReactNode } from "react";

interface TooltipProps {
	id?: string;
	label: string;
	children: ReactNode;
	position?: "left" | "right";
	/** Lado del disparador donde aparece el tooltip. */
	side?: "top" | "bottom";
}

export function Tooltip({ label, children, side = "top" }: TooltipProps) {
	return (
		<HeroTooltip delay={300} closeDelay={0}>
			<HeroTooltip.Trigger className="inline-flex">
				{children}
			</HeroTooltip.Trigger>
			<HeroTooltip.Content
				placement={side}
				showArrow
				className="max-w-52 text-xs font-bold"
			>
				{label}
			</HeroTooltip.Content>
		</HeroTooltip>
	);
}
