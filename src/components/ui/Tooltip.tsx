import type { ReactNode } from "react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
	id?: string;
	label: string;
	children: ReactNode;
	position?: "left" | "right";
}

export function Tooltip({ id, label, children, position = "right" }: TooltipProps) {
	return (
		<span className={styles.tooltip}>
			{children}
			<span id={id} role="tooltip" className={`${styles.tooltipBubble} ${styles[position]}`}>
				{label}
			</span>
		</span>
	);
}
