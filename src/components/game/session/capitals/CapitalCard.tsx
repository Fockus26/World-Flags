import type { AnswerStatus } from "@/types/country";
import { StimulusFrame } from "../StimulusFrame";

/**
 * Estímulo de Capitales (D067, opción B): solo el nombre del país, grande, en
 * el mismo hueco que ocupa la bandera en Banderas. La pregunta del input ya
 * nombra el país, así que el lector de pantalla no depende de esta tarjeta.
 *
 * El tamaño de letra sale del alto y del ancho de la tarjeta (unidades de
 * contenedor), no solo del ancho de la pantalla: con poca altura (móvil
 * apaisado, zoom alto) la tarjeta se encoge y un `text-5xl` fijo quedaba
 * cortado a la mitad e ilegible, cosa que a una bandera no le pasa porque se
 * escala sola. Hallazgo de QA de diseño; excepción de tamaño registrada en
 * D067.
 */
export function CapitalCard({
	countryName,
	feedback,
}: {
	countryName: string;
	feedback?: AnswerStatus;
}) {
	return (
		<StimulusFrame
			feedback={feedback}
			className="bg-surface-hover px-2 [container-type:size] min-[43rem]:px-6"
		>
			{/* `key` por país: la entrada se repite en cada tarjeta, no solo en la primera. */}
			<p
				key={countryName}
				lang="es"
				className="m-0 max-w-full text-center text-[clamp(0.9rem,min(32cqh,9cqw),3rem)] leading-tight font-extrabold text-balance wrap-break-word hyphens-auto text-surface-soft animate-in fade-in-0 zoom-in-95 duration-200"
			>
				{countryName}
			</p>
		</StimulusFrame>
	);
}
