import type { ReactNode } from "react";

/**
 * El hueco del estímulo de la sesión (la bandera, o el país en Capitales):
 * ocupa el alto que deja el formulario y lo separa de la cabecera. Compartido
 * para que `FlagDisplay` y `CapitalCard` no repitan a mano los mismos
 * márgenes (heredados de `FlagDisplay`, D067).
 */
export function StimulusFrame({
	className = "",
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={`mt-[0.6rem] grid min-h-0 place-items-center overflow-hidden rounded-lg min-[30rem]:mt-[0.65rem] min-[43rem]:mt-[clamp(0.75rem,2vh,1.5rem)] ${className}`}
		>
			{children}
		</div>
	);
}
