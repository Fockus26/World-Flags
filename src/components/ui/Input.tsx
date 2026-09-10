import { Input as HeroInput, Label, TextField } from "@heroui/react";
import type { ComponentPropsWithRef } from "react";

interface InputProps extends ComponentPropsWithRef<"input"> {
	label?: string;
}

/**
 * Campo de texto sobre HeroUI v3 (React Aria). Se sigue exponiendo la API
 * nativa de `<input>` (incluido `onChange` con evento) para no tocar los
 * formularios que ya existen; el `<input>` interno es un elemento real.
 */
export function Input({ className, label, id, ...props }: InputProps) {
	if (!label) {
		return <HeroInput id={id} className={className} {...props} />;
	}

	return (
		<TextField className="flex w-full flex-col gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			<HeroInput id={id} className={className} {...props} />
		</TextField>
	);
}
