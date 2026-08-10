import { type ComponentPropsWithoutRef, forwardRef, useState } from "react";
import styles from "./Input.module.css";

interface InputProps extends ComponentPropsWithoutRef<"input"> {
	label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ className, label, value, defaultValue, onFocus, onBlur, ...props },
	ref,
) {
	const [isFocused, setIsFocused] = useState(false);

	if (!label) {
		return (
			<input
				{...props}
				value={value}
				defaultValue={defaultValue}
				ref={ref}
				onFocus={onFocus}
				onBlur={onBlur}
				className={`${styles.input}${className ? ` ${className}` : ""}`}
			/>
		);
	}

	const isFloated = isFocused || Boolean(value ?? defaultValue);

	return (
		<label className={styles.fieldWrapper}>
			<span
				className={`${styles.floatingLabel}${
					isFloated ? ` ${styles.floatingLabelFloated}` : ""
				}`}
			>
				{label}
			</span>
			<input
				{...props}
				value={value}
				defaultValue={defaultValue}
				ref={ref}
				onFocus={(event) => {
					setIsFocused(true);
					onFocus?.(event);
				}}
				onBlur={(event) => {
					setIsFocused(false);
					onBlur?.(event);
				}}
				className={`${styles.input} ${styles.inputWithLabel}${
					className ? ` ${className}` : ""
				}`}
			/>
		</label>
	);
});

Input.displayName = "Input";
