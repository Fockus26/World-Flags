import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "exit" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

const baseClass =
	"inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md border px-4 py-2 md:py-3 font-[inherit] font-extrabold transition-[background-color,border-color,color,box-shadow,transform,opacity,translate,outline-color] duration-180 ease-in-out focus-visible:outline-3 focus-visible:outline-offset-3 outline-transparent disabled:cursor-not-allowed";

const variantClass: Record<ButtonVariant, string> = {
	primary:
		"bg-primary border-transparent focus-visible:outline-primary text-text-inverse hover:not-disabled:-translate-y-0.5 hover:not-disabled:bg-primary-hover disabled:bg-border-disabled disabled:opacity-70",

	secondary:
		"border-border-border-disabled focus-visible:outline-border-light bg-transparent text-text-secondary hover:-translate-y-0.5 hover:bg-surface-secondary",

	exit: "min-h-10 border-border-danger-soft-border focus-visible:outline-danger bg-transparent text-danger-text hover:bg-danger-bg hover:text-danger-text",

	ghost: "",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ variant = "primary", className, ...props },
	ref,
) {
	return (
		<button
			{...props}
			ref={ref}
			className={`${baseClass} ${variantClass[variant]}${className ? ` ${className}` : ""}`}
		/>
	);
});

Button.displayName = "Button";
