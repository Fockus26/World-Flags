import { forwardRef } from "react";
import { Button, type ButtonProps } from "./Button";

export interface IconButtonProps extends ButtonProps {
	"aria-label": string;
}

/** Botón cuadrado de solo ícono (emoji), mismo estilo que Button pero compacto. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
	{ className, ...props },
	ref,
) {
	return (
		<Button
			ref={ref}
			{...props}
			className={["!w-10 shrink-0 !px-0 !py-0 md:!py-0 text-lg leading-none", className ?? ""]
				.filter(Boolean)
				.join(" ")}
		/>
	);
});

IconButton.displayName = "IconButton";
