import { type ReactNode } from "react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
	label: string;
	children: ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
	return (
		<span className={styles.tooltip}>
			{children}
			<span role="tooltip" className={styles.tooltipBubble}>
				{label}
			</span>
		</span>
	);
}
