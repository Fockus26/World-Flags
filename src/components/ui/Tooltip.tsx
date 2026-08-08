import type { ReactNode } from "react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
	id?: string;
	label: string;
	children: ReactNode;
}

export function Tooltip({ id, label, children }: TooltipProps) {
	return (
		<span className={styles.tooltip}>
			{children}
			<span id={id} role="tooltip" className={styles.tooltipBubble}>
				{label}
			</span>
		</span>
	);
}
