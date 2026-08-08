import { type ComponentPropsWithoutRef, forwardRef } from "react";
import styles from "./Select.module.css";

export interface SelectOption {
	value: string;
	label: string;
}

export interface SelectProps extends ComponentPropsWithoutRef<"select"> {
	options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
	function Select({ className, options, children, ...props }, ref) {
		return (
			<select
				{...props}
				ref={ref}
				className={`${styles.select}${className ? ` ${className}` : ""}`}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
				{children}
			</select>
		);
	},
);

Select.displayName = "Select";
