import { Button as HeroButton } from "@heroui/react";
import type { CSSProperties, MouseEvent, ReactNode, Ref } from "react";

type ButtonColor =
	| "primary"
	| "secondary"
	| "danger"
	| "warning"
	| "success"
	| "neutral";
type ButtonVariant = "contained" | "outline" | "text" | "soft";

export interface ButtonProps {
	color?: ButtonColor;
	variant?: ButtonVariant;
	pressed?: boolean;
	type?: "button" | "submit" | "reset";
	disabled?: boolean;
	className?: string;
	style?: CSSProperties;
	children?: ReactNode;
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	"aria-label"?: string;
	"aria-describedby"?: string;
	ref?: Ref<HTMLButtonElement>;
	fullWidth?: boolean;
	isIconOnly?: boolean;
}

/**
 * HeroUI pinta el botón con las custom props `--button-bg`,
 * `--button-bg-hover`, `--button-bg-pressed` y `--button-fg`. Se usa el
 * `variant="primary"` de HeroUI como base (layout, press, focus ring, radio)
 * y se reescriben esas variables con los tokens de marca, conservando los
 * 6 colores × 4 variantes que ya usaba el juego.
 */
const brand: Record<
	ButtonColor,
	{ base: string; hover: string; soft: string }
> = {
	primary: {
		base: "var(--color-primary)",
		hover: "var(--color-primary-hover)",
		soft: "var(--color-primary-soft)",
	},
	secondary: {
		base: "var(--color-secondary)",
		hover: "var(--color-secondary-hover)",
		soft: "var(--color-secondary-soft)",
	},
	danger: {
		base: "var(--color-danger)",
		hover: "var(--color-danger-hover)",
		soft: "var(--color-danger-soft)",
	},
	warning: {
		base: "var(--color-warning)",
		hover: "var(--color-warning-hover)",
		soft: "var(--color-warning-soft)",
	},
	success: {
		base: "var(--color-success)",
		hover: "color-mix(in oklab, var(--color-success) 86%, black)",
		soft: "var(--color-success-soft)",
	},
	neutral: {
		base: "var(--color-neutral)",
		hover: "var(--color-neutral-hover)",
		soft: "var(--color-neutral-soft)",
	},
};

/**
 * Texto legible (AA) para las variantes sin relleno pleno: se mezcla el color
 * de marca hacia `--foreground`. Como `--foreground` vira con el tema (casi
 * negro en claro, casi blanco en oscuro), la misma fórmula oscurece el texto
 * sobre fondos claros y lo aclara sobre fondos oscuros. Antes se usaba el
 * color de marca tal cual y quedaba en ~2.7-4:1 en modo claro.
 */
function readableFg(base: string): string {
	return `color-mix(in oklab, ${base} 62%, var(--foreground))`;
}

function colorVars(color: ButtonColor, variant: ButtonVariant): CSSProperties {
	const c = brand[color];
	const style = { "--button-bg-pressed": c.hover } as Record<string, string>;

	switch (variant) {
		case "contained":
			Object.assign(style, {
				"--button-bg": c.base,
				"--button-bg-hover": c.hover,
				"--button-bg-pressed": c.hover,
				"--button-fg": "var(--btn-contained-fg)",
			});
			break;
		case "soft":
			Object.assign(style, {
				"--button-bg": c.soft,
				"--button-bg-hover": c.base,
				"--button-bg-pressed": c.base,
				"--button-fg": readableFg(c.base),
			});
			break;
		case "outline":
			Object.assign(style, {
				"--button-bg": "transparent",
				"--button-bg-hover": c.soft,
				"--button-bg-pressed": c.soft,
				"--button-fg": readableFg(c.base),
				border: `1px solid ${c.base}`,
			});
			break;
		case "text":
			Object.assign(style, {
				"--button-bg": "transparent",
				"--button-bg-hover": c.soft,
				"--button-bg-pressed": c.soft,
				"--button-fg": readableFg(c.base),
			});
			break;
	}

	return style as CSSProperties;
}

export function Button({
	color = "primary",
	variant = "contained",
	pressed = false,
	type = "button",
	disabled,
	className,
	style,
	children,
	onClick,
	fullWidth,
	isIconOnly,
	ref,
	...rest
}: ButtonProps) {
	return (
		<HeroButton
			ref={ref}
			type={type}
			variant="primary"
			size="lg"
			fullWidth={fullWidth}
			isIconOnly={isIconOnly}
			isDisabled={disabled}
			data-pressed={pressed || undefined}
			onPress={
				onClick ? () => onClick({} as MouseEvent<HTMLButtonElement>) : undefined
			}
			className={className}
			style={{ ...colorVars(color, variant), ...style }}
			{...rest}
		>
			{children}
		</HeroButton>
	);
}

Button.displayName = "Button";
