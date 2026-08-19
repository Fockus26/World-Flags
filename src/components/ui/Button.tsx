import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonColor = "primary" | "secondary" | "danger" | "warning" | "success" | "neutral";
type ButtonVariant = "contained" | "outline" | "text" | "soft";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	color?: ButtonColor;
	variant?: ButtonVariant;
	pressed?: boolean;
}

const baseClass =
	"inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md border px-4 py-2 font-[inherit] font-extrabold transition-[background-color,border-color,color,transform,opacity,translate,outline-color] duration-180 ease-in-out focus-visible:outline-3 focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:border-neutral-border disabled:bg-neutral-hover disabled:text-neutral-soft disabled:opacity-70 hover:not-disabled:-translate-y-0.5 active:not-disabled:-translate-y-0.5 md:py-3";

const variantClass: Record<ButtonVariant, Record<ButtonColor, string>> = {
	contained: {
		primary:
			"border-primary-border bg-primary text-primary-soft focus-visible:outline-primary-border hover:not-disabled:border-primary-hover hover:not-disabled:bg-primary-hover active:not-disabled:border-primary-hover active:not-disabled:bg-primary-hover",

		secondary:
			"border-secondary-border bg-secondary text-secondary-soft focus-visible:outline-secondary-border hover:not-disabled:border-secondary-hover hover:not-disabled:bg-secondary-hover active:not-disabled:border-secondary-hover active:not-disabled:bg-secondary-hover",

		success:
			"border-success-border bg-success text-success-soft focus-visible:outline-success-border hover:not-disabled:border-success-hover hover:not-disabled:bg-success-hover active:not-disabled:border-success-hover active:not-disabled:bg-success-hover",

		warning:
			"border-warning-border bg-warning text-warning-soft focus-visible:outline-warning-border hover:not-disabled:border-warning-hover hover:not-disabled:bg-warning-hover active:not-disabled:border-warning-hover active:not-disabled:bg-warning-hover",

		danger: "border-danger-border bg-danger text-danger-soft focus-visible:outline-danger-border hover:not-disabled:border-danger-hover hover:not-disabled:bg-danger-hover active:not-disabled:border-danger-hover active:not-disabled:bg-danger-hover",

		neutral:
			"border-neutral-border bg-neutral text-neutral-soft focus-visible:outline-neutral-border hover:not-disabled:border-neutral-hover hover:not-disabled:bg-neutral-hover active:not-disabled:border-neutral-hover active:not-disabled:bg-neutral-hover",
	},

	outline: {
		primary:
			"border-primary bg-transparent text-primary focus-visible:outline-primary hover:not-disabled:border-primary-hover hover:not-disabled:bg-primary-soft hover:not-disabled:text-primary-hover active:not-disabled:border-primary-hover active:not-disabled:bg-primary-soft active:not-disabled:text-primary-hover",

		secondary:
			"border-secondary bg-transparent text-secondary focus-visible:outline-secondary hover:not-disabled:border-secondary-hover hover:not-disabled:bg-secondary-soft hover:not-disabled:text-secondary-hover active:not-disabled:border-secondary-hover active:not-disabled:bg-secondary-soft active:not-disabled:text-secondary-hover",

		success:
			"border-success bg-transparent text-success focus-visible:outline-success hover:not-disabled:border-success-hover hover:not-disabled:bg-success-soft hover:not-disabled:text-success-hover active:not-disabled:border-success-hover active:not-disabled:bg-success-soft active:not-disabled:text-success-hover",

		warning:
			"border-warning bg-transparent text-warning focus-visible:outline-warning hover:not-disabled:border-warning-hover hover:not-disabled:bg-warning-soft hover:not-disabled:text-warning-hover active:not-disabled:border-warning-hover active:not-disabled:bg-warning-soft active:not-disabled:text-warning-hover",

		danger: "border-danger bg-transparent text-danger focus-visible:outline-danger hover:not-disabled:border-danger-hover hover:not-disabled:bg-danger-soft hover:not-disabled:text-danger-hover active:not-disabled:border-danger-hover active:not-disabled:bg-danger-soft active:not-disabled:text-danger-hover",

		neutral:
			"border-neutral bg-transparent text-neutral focus-visible:outline-neutral hover:not-disabled:border-neutral-hover hover:not-disabled:bg-neutral-soft hover:not-disabled:text-neutral-hover active:not-disabled:border-neutral-hover active:not-disabled:bg-neutral-soft active:not-disabled:text-neutral-hover",
	},

	text: {
		primary:
			"border-transparent bg-transparent text-primary focus-visible:outline-primary-border hover:not-disabled:bg-primary-soft hover:not-disabled:text-primary-hover active:not-disabled:bg-primary-soft active:not-disabled:text-primary-hover",

		secondary:
			"border-transparent bg-transparent text-secondary focus-visible:outline-secondary-border hover:not-disabled:bg-secondary-soft hover:not-disabled:text-secondary-hover active:not-disabled:bg-secondary-soft active:not-disabled:text-secondary-hover",

		success:
			"border-transparent bg-transparent text-success focus-visible:outline-success-border hover:not-disabled:bg-success-soft hover:not-disabled:text-success-hover active:not-disabled:bg-success-soft active:not-disabled:text-success-hover",

		warning:
			"border-transparent bg-transparent text-warning focus-visible:outline-warning-border hover:not-disabled:bg-warning-soft hover:not-disabled:text-warning-hover active:not-disabled:bg-warning-soft active:not-disabled:text-warning-hover",

		danger: "border-transparent bg-transparent text-danger focus-visible:outline-danger-border hover:not-disabled:bg-danger-soft hover:not-disabled:text-danger-hover active:not-disabled:bg-danger-soft active:not-disabled:text-danger-hover",

		neutral:
			"border-transparent bg-transparent text-neutral focus-visible:outline-neutral-border hover:not-disabled:bg-neutral-soft hover:not-disabled:text-neutral-hover active:not-disabled:bg-neutral-soft active:not-disabled:text-neutral-hover",
	},

	soft: {
		primary:
			"border-primary-border bg-primary-soft text-primary focus-visible:outline-primary-border hover:not-disabled:bg-primary hover:not-disabled:text-primary-soft active:not-disabled:bg-primary active:not-disabled:text-primary-soft",

		secondary:
			"border-secondary-border bg-secondary-soft text-secondary focus-visible:outline-secondary-border hover:not-disabled:bg-secondary hover:not-disabled:text-secondary-soft active:not-disabled:bg-secondary active:not-disabled:text-secondary-soft",

		success:
			"border-success-border bg-success-soft text-success focus-visible:outline-success-border hover:not-disabled:bg-success hover:not-disabled:text-success-soft active:not-disabled:bg-success active:not-disabled:text-success-soft",

		warning:
			"border-warning-border bg-warning-soft text-warning focus-visible:outline-warning-border hover:not-disabled:bg-warning hover:not-disabled:text-warning-soft active:not-disabled:bg-warning active:not-disabled:text-warning-soft",

		danger: "border-danger-border bg-danger-soft text-danger focus-visible:outline-danger-border hover:not-disabled:bg-danger hover:not-disabled:text-danger-soft active:not-disabled:bg-danger active:not-disabled:text-danger-soft",

		neutral:
			"border-neutral-border bg-neutral-soft text-neutral focus-visible:outline-neutral-border hover:not-disabled:bg-neutral hover:not-disabled:text-neutral-soft active:not-disabled:bg-neutral active:not-disabled:text-neutral-soft",
	},
};

function derivePressedClasses(classes: string): string {
	return classes
		.split(" ")
		.filter((cls) => cls.startsWith("hover:not-disabled:"))
		.map((cls) => `!${cls.replace("hover:not-disabled:", "")}`)
		.join(" ");
}

const pressedVariantClass = Object.fromEntries(
	(Object.keys(variantClass) as ButtonVariant[]).map((variant) => [
		variant,
		Object.fromEntries(
			(Object.keys(variantClass[variant]) as ButtonColor[]).map((color) => [
				color,
				derivePressedClasses(variantClass[variant][color]),
			]),
		),
	]),
) as Record<ButtonVariant, Record<ButtonColor, string>>;

const pressedBaseClass = "!-translate-y-0.5";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ color = "primary", variant = "contained", pressed = false, className, ...props },
	ref,
) {
	return (
		<button
			{...props}
			ref={ref}
			className={[
				baseClass,
				variantClass[variant][color],
				pressed ? pressedBaseClass : "",
				pressed ? pressedVariantClass[variant][color] : "",
				className ?? "",
			]
				.filter(Boolean)
				.join(" ")}
		/>
	);
});

Button.displayName = "Button";
