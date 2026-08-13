import type { ReactNode } from "react";
import styles from "./Fieldset.module.css";

interface FieldsetProps {
	legend: ReactNode;
	hideLegend?: boolean;
	children: ReactNode;
	className?: string;
}

export function Fieldset({ legend, hideLegend, children, className }: FieldsetProps) {
	return (
		<fieldset className={`${styles.fieldset}${className ? ` ${className}` : ""}`}>
			<legend className={hideLegend ? styles.legendHidden : styles.legend}>{legend}</legend>
			{children}
		</fieldset>
	);
}
