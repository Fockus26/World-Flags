import { Xmark } from "iconoir-react";
import type { Ref } from "react";
import type { Country } from "@/types/country";

/**
 * Estado visual de un país en el tablero (D038):
 * - "hidden": hueco sin descubrir todavía (rush o cloze de otro país).
 * - "revealed": ya se encontró/acertó — se queda así el resto de la sesión.
 * - "target": el hueco que hay que adivinar en la tarjeta cloze de práctica.
 * - "missed": no se encontró/acertó (rendición en el rush, fallo en práctica).
 * - "context": país del mismo continente que ya se sabe, mostrado atenuado
 *   como referencia en la tarjeta cloze (no es el objetivo de esta tarjeta).
 */
export type BoardSlotState = "hidden" | "revealed" | "target" | "missed" | "context";

interface BoardSlotProps {
	country: Country;
	state: BoardSlotState;
	/** Solo aplica en "target": cuántas letras iniciales mostrar como pista (0 = ninguna). */
	hintLetters?: number;
	/**
	 * El texto real se mantiene invisible (mismo ancho) mientras un clon
	 * (`useFlyToSlot`) viaja hacia este hueco — si no, se vería "puesto" un
	 * instante antes de que el clon aterrice encima.
	 */
	isFlying?: boolean;
	ref?: Ref<HTMLLIElement>;
}

const BASE_CLASS =
	"inline-flex min-h-8 max-w-full items-center gap-1 break-words rounded-[var(--radius)] border px-2 py-1 text-sm font-bold transition-[background-color,border-color,color,box-shadow] duration-200 ease-in-out min-[44rem]:text-base";

const STATE_CLASSES: Record<BoardSlotState, string> = {
	hidden: "border-surface-border bg-surface-hover",
	revealed: "border-success bg-success-soft text-surface-soft",
	context: "border-surface-border bg-surface text-text-placeholder",
	target: "border-primary bg-primary-soft text-surface-soft ring-2 ring-primary",
	missed: "border-danger bg-danger-soft text-surface-soft",
};

/**
 * Un bloque del tablero de países (D038): el ancho es siempre el del nombre
 * real, que se renderiza `invisible` (no `display:none` — así ocupa espacio)
 * cuando no debe mostrarse todavía. `visibility:hidden` ya saca el nodo del
 * árbol de accesibilidad por sí solo en los navegadores habituales; el
 * `aria-hidden="true"` explícito es una segunda red, no depende de eso.
 */
export function BoardSlot({
	country,
	state,
	hintLetters = 0,
	isFlying = false,
	ref,
}: BoardSlotProps) {
	const maxHintLetters = Math.max(country.name.length - 1, 0);
	const clampedHintLetters = Math.min(Math.max(hintLetters, 0), maxHintLetters);

	return (
		<li ref={ref} className={`${BASE_CLASS} ${STATE_CLASSES[state]}`}>
			{renderContent(country, state, clampedHintLetters, isFlying)}
		</li>
	);
}

function renderContent(
	country: Country,
	state: BoardSlotState,
	hintLetters: number,
	isFlying: boolean,
) {
	switch (state) {
		case "hidden":
			return (
				<>
					<span aria-hidden="true" className="invisible select-none">
						{country.name}
					</span>
					<span className="sr-only">Sin descubrir</span>
				</>
			);

		case "revealed":
		case "context":
			// Mientras vuela un clon hacia este hueco, el nombre real se
			// mantiene invisible (mismo ancho): sin esto se vería el país
			// "ya puesto" un instante antes de que el clon aterrice encima.
			return isFlying ? (
				<span aria-hidden="true" className="invisible select-none">
					{country.name}
				</span>
			) : (
				<span className="animate-in zoom-in-95 duration-150">
					{country.name}
				</span>
			);

		case "target":
			return (
				<>
					<span aria-hidden="true">
						{/* Una letra por `<span>` con `key` estable: al pedir otra
						    pista solo se monta la nueva, y es la única que hace
						    el fade-in (las ya reveladas no se vuelven a animar). */}
						{[...country.name.slice(0, hintLetters)].map((letter, index) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: la posición ES la identidad de cada letra de pista — el nombre no cambia mientras dura la tarjeta
								key={index}
								className="animate-in fade-in-0 duration-300"
							>
								{letter}
							</span>
						))}
						<span className="invisible select-none">
							{country.name.slice(hintLetters)}
						</span>
					</span>
					<span className="sr-only">
						Falta un país, {country.name.length} letras
					</span>
				</>
			);

		case "missed":
			return (
				<>
					<span aria-hidden="true">{country.name}</span>
					<Xmark
						className="size-3.5 shrink-0 text-danger"
						aria-hidden="true"
					/>
					<span className="sr-only">{country.name}, no encontrado</span>
				</>
			);
	}
}
