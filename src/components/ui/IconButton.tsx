import type { Ref } from "react";
import { Button, type ButtonProps } from "./Button";

export interface IconButtonProps extends ButtonProps {
	"aria-label": string;
	ref?: Ref<HTMLButtonElement>;
}

/** Botón cuadrado de solo ícono (emoji), mismo estilo que Button pero compacto. */
export function IconButton({ className, ...props }: IconButtonProps) {
	return (
		<Button
			{...props}
			isIconOnly
			className={["shrink-0 text-lg leading-none", className ?? ""]
				.filter(Boolean)
				.join(" ")}
		/>
	);
}

IconButton.displayName = "IconButton";
