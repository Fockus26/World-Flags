import type { ReactNode } from "react";

interface AutoHeightProps {
	show: boolean;
	children: ReactNode;
	className?: string;
}

/**
 * Anima el alto de un bloque que aparece/desaparece por condición, sin medir
 * nada por JS: el truco de `grid-template-rows: 0fr → 1fr` (ver
 * `context/decisions/03-animaciones.md`, D009). `interpolate-size` no anima
 * cambios de alto por contenido en este motor y `framer-motion` no corre
 * aquí (D006), así que esta es la alternativa puramente CSS.
 *
 * El contenido queda siempre montado (colapsado con `overflow-hidden`) para
 * poder animar en ambas direcciones, y se vuelve `inert` mientras está
 * colapsado: `overflow-hidden` a 0px no saca los controles del orden de
 * tabulación por sí solo.
 */
export function AutoHeight({ show, children, className }: AutoHeightProps) {
	return (
		<div
			className={[
				"grid transition-[grid-template-rows] duration-300 ease-in-out",
				show ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
				className ?? "",
			]
				.filter(Boolean)
				.join(" ")}
			inert={!show}
			aria-hidden={!show || undefined}
		>
			<div className="overflow-hidden">{children}</div>
		</div>
	);
}
