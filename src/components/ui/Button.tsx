import { type ButtonHTMLAttributes, forwardRef } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "danger" | "exit";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

const variantClass: Record<ButtonVariant, string> = {
	primary: styles.primaryButton,
	secondary: styles.secondaryButton,
	danger: styles.dangerButton,
	exit: styles.exitButton,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	function Button({ variant = "primary", className, ...props }, ref) {
		return (
			<button
				{...props}
				ref={ref}
				className={`${styles.button} ${variantClass[variant]}${
					className ? ` ${className}` : ""
				}`}
			/>
		);
	},
);

Button.displayName = "Button";
