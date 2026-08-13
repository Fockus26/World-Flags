import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "exit";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

const baseClass =
	"inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-transparent px-4 py-3 font-[inherit] font-extrabold transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-180 ease-in-out focus-visible:outline-[3px] focus-visible:outline-(--focus-outline) focus-visible:outline-offset-2 disabled:cursor-not-allowed";

const variantClass: Record<ButtonVariant, string> = {
	primary:
		"bg-primary text-text-inverse shadow-(--shadow-primary) hover:not-disabled:-translate-y-0.5 hover:not-disabled:bg-primary-hover hover:not-disabled:shadow-(--shadow-primary-hover) active:not-disabled:translate-y-0 active:not-disabled:scale-[0.98] disabled:bg-border-disabled disabled:opacity-70 disabled:shadow-none",

	secondary:
		"whitespace-nowrap border-border-secondary bg-surface text-text-secondary hover:-translate-y-0.5 hover:border-border-disabled hover:bg-surface-secondary hover:shadow-(--shadow-secondary) active:translate-y-0 active:scale-[0.98]",

	danger: "bg-danger text-text-inverse hover:-translate-y-0.5 hover:bg-danger-hover hover:shadow-(--shadow-danger) active:translate-y-0 active:scale-[0.98]",

	exit: "min-h-10 border-border-light bg-surface-disabled text-neutral hover:-translate-y-px hover:border-danger-soft-border hover:bg-danger-bg hover:text-danger-text active:translate-y-0 active:scale-[0.98]",
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
