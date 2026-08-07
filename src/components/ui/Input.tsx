import { forwardRef, type ComponentPropsWithoutRef } from "react";
import styles from "./Input.module.css";

export const Input = forwardRef<
	HTMLInputElement,
	ComponentPropsWithoutRef<"input">
>(function Input({ className, ...props }, ref) {
	return (
		<input
			{...props}
			ref={ref}
			className={`${styles.input}${
				className ? ` ${className}` : ""
			}`}
		/>
	);
});

Input.displayName = "Input";
