import type { ReactNode } from "react";
import type { AnswerStatus } from "@/types/country";

/**
 * Respuesta de la tarjeta en el marco (D151). Acierto: anillo verde que se
 * expande y se desvanece (`stimulus-ring`, `global.css`). Fallo (y salto):
 * sacudida horizontal corta (`stimulus-shake`) + borde rojo que se queda
 * mientras se ve el aviso. Van por `box-shadow` (anillo, borde) y
 * `transform` (sacudida): no mueven el layout, y el `overflow-hidden` de la
 * sesión contiene la sacudida, así que a 320 px no aparece scroll horizontal.
 *
 * Con movimiento reducido (D152): sin sacudida y sin anillo que crece; el
 * acierto deja un borde verde fijo, simétrico al rojo, para no perder la
 * confirmación. La señal que no es de color es el aviso de `AnswerForm`.
 */
const feedbackClass: Record<AnswerStatus, string> = {
	idle: "",
	correct:
		"motion-safe:animate-stimulus-ring motion-reduce:ring-2 motion-reduce:ring-success",
	incorrect: "ring-2 ring-danger motion-safe:animate-stimulus-shake",
};

/**
 * El hueco del estímulo de la sesión (la bandera, o el país en Capitales):
 * ocupa el alto que deja el formulario y lo separa de la cabecera. Compartido
 * para que `FlagDisplay` y `CapitalCard` no repitan a mano los mismos
 * márgenes (heredados de `FlagDisplay`, D067).
 */
export function StimulusFrame({
	className = "",
	feedback = "idle",
	children,
}: {
	className?: string;
	/** Cómo fue la respuesta de esta tarjeta; la práctica diaria no lo pasa. */
	feedback?: AnswerStatus;
	children: ReactNode;
}) {
	return (
		<div
			className={`mt-[0.6rem] grid min-h-0 place-items-center overflow-hidden rounded-lg min-[30rem]:mt-[0.65rem] min-[43rem]:mt-[clamp(0.75rem,2vh,1.5rem)] ${feedbackClass[feedback]} ${className}`}
		>
			{children}
		</div>
	);
}
