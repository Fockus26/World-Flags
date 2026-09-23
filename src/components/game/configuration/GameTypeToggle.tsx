import { City, Globe, TriangleFlag } from "iconoir-react";
import { useId } from "react";
import { Fieldset } from "@/components/ui/Fieldset";
import { Select } from "@/components/ui/Select";
import { GAME_TYPE_LABELS, GAME_TYPES, type GameType } from "@/types/country";

interface GameTypeToggleProps {
	legend: string;
	hideLegend?: boolean;
	value: GameType;
	onChange: (value: GameType) => void;
	/** Carga inicial (D042): `value` aún es el por defecto, no el guardado.
	 *  Sin píldora ni opción marcada, para que no aparezca en "Países" y se
	 *  deslice a "Banderas" al llegar los datos. */
	isLoading?: boolean;
	className?: string;
}

const GAME_TYPE_ICONS: Record<GameType, typeof Globe> = {
	countries: Globe,
	flags: TriangleFlag,
	capitals: City,
};

const OPTIONS = GAME_TYPES.map((gameType) => ({
	value: gameType,
	label: GAME_TYPE_LABELS[gameType],
}));

/**
 * Selector de juego (D030: Países primero; Capitales al final, D066).
 * Extraído de la `Configuration` de la Fase 2 del modo Países para
 * reutilizarlo también en `LeaderboardModal` sin duplicar el patrón
 * `Fieldset` + segmentado.
 *
 * **Dos formas según el ancho, elegidas por el dueño sobre el canvas de
 * diseño (D066).** Con tres juegos el segmentado no cabe a 320 px: quedan
 * ~90 px por opción y "Capitales" en `text-xs` ya los ocupa casi enteros, así
 * que con el espaciado de texto de WCAG 1.4.12 se sale. Por debajo de
 * `min-[30rem]` va el `Select` de HeroUI (`ui/Select`: teclado, `role="listbox"`
 * y cierre al hacer clic fuera ya resueltos por React Aria); a partir de ahí,
 * el segmentado con píldora deslizante e icono — la propuesta "B" del canvas
 * (`context/plans/design-canvas/`) que el dueño ya había elegido. Se pintan
 * los dos y CSS oculta el que no toca: `display: none` también lo saca del
 * orden de tabulación y del árbol de accesibilidad, y en un sitio estático
 * decidirlo en JS con `matchMedia` desajustaría la hidratación.
 *
 * El texto de la opción marcada usa `--btn-contained-fg` (el mismo token que
 * el texto de un botón relleno), no `--accent-foreground`: ese daba 4,34:1
 * sobre el morado y fallaba AA, un hallazgo ya reportado dos veces.
 *
 * No reutiliza `OptionTile` a propósito: ese componente es la base de otros
 * selectores del kit (tema, dificultad, modo de juego en `GameTab`) y cambiar
 * su estilo de "caja con borde" a "píldora deslizante" habría afectado a
 * todos ellos por un pedido que era solo de este selector.
 *
 * El `name` del grupo de radios se genera con `useId()` en vez de recibirlo
 * como prop: `Configuration` vive dentro de `PageFlip`, que — por un bug
 * preexistente de esa pieza (ranuras duplicadas desde el montaje, ver
 * `context/decisions/07-modo-paises.md`) — puede montar dos copias de esta
 * pantalla en el DOM a la vez. Dos `<input type="radio">` con el mismo
 * `name` se agrupan por el navegador **aunque vivan en árboles de React
 * distintos** (el agrupamiento nativo de radios es por `name` en todo el
 * documento, no por instancia de componente): sin un id único por montaje,
 * las dos copias competían entre sí y el "seleccionado" visual se quedaba
 * desincronizado hasta el primer remontaje real de la vista (p. ej. al
 * terminar una partida). `useId()` aísla cada instancia sin depender de que
 * ese bug de `PageFlip` se arregle primero.
 */
export function GameTypeToggle({
	legend,
	hideLegend,
	value,
	onChange,
	isLoading = false,
	className,
}: GameTypeToggleProps) {
	const name = useId();
	const selectedIndex = GAME_TYPES.indexOf(value);

	return (
		<Fieldset legend={legend} hideLegend={hideLegend} className={className}>
			{/* Móvil. En la carga inicial todavía no hay nada elegido (D042). */}
			<Select
				className="min-[30rem]:hidden"
				aria-label={legend}
				options={OPTIONS}
				value={isLoading ? "" : value}
				// Solo se lee mientras carga, que es cuando no hay juego elegido
				// todavía; sin él, HeroUI pone "Select an item" en inglés.
				// ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #21).
				placeholder="Elige un juego"
				onChange={(selected) => onChange(selected as GameType)}
			/>

			<div className="relative hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--default)] p-1 min-[30rem]:flex">
				{!isLoading && (
					<div
						aria-hidden="true"
						// El ancho sale del hueco real: el 100% menos el `p-1` de los dos
						// lados, repartido entre los juegos que haya. El desplazamiento va
						// en múltiplos de ese ancho, así que no hay que sumarle el padding.
						// En alto contraste el navegador pintaría la píldora del color
						// del fondo y no se vería cuál está elegida: ahí va en los
						// colores de sistema de "seleccionado" (Highlight/HighlightText).
						className="absolute inset-y-1 left-1 rounded-[calc(var(--radius)-2px)] bg-[var(--accent)] transition-transform duration-200 ease-in-out forced-color-adjust-none forced-colors:bg-[Highlight]"
						style={{
							width: `calc((100% - 0.5rem) / ${GAME_TYPES.length})`,
							transform: `translateX(${selectedIndex * 100}%)`,
						}}
					/>
				)}

				{GAME_TYPES.map((type) => {
					const Icon = GAME_TYPE_ICONS[type];
					const checked = !isLoading && value === type;

					return (
						<label
							key={type}
							// El color del texto sale del estado de React y no de
							// `has-checked:` como antes. Medido en el navegador: al
							// cargar la página, Chrome no vuelve a calcular el estilo
							// de la etiqueta cuando React marca su radio por código
							// (sigue con el color normal ≥4,5 s, hasta que algo fuerza
							// un recálculo). Con la regla sin aplicar, el texto de la
							// opción marcada quedaba sobre el morado a 3,62:1 en claro
							// y 2,44:1 en oscuro — el fallo de contraste que ya se
							// había reportado dos veces. El texto va en
							// `--btn-contained-fg` (el de los botones rellenos): 4,66:1
							// en claro y 6,64:1 en oscuro.
							className={`
								relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5
								min-h-11 rounded-[calc(var(--radius)-2px)] py-2
								transition-colors duration-150 ease-in-out
								has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2
								has-focus-visible:outline-[var(--focus)]
								${checked ? "text-[var(--btn-contained-fg)] forced-color-adjust-none forced-colors:text-[HighlightText]" : "text-[var(--default-foreground)]"}
							`}
						>
							<input
								type="radio"
								name={name}
								value={type}
								checked={checked}
								onChange={() => onChange(type)}
								className="pointer-events-none absolute size-px opacity-0"
							/>
							<Icon className="size-[18px] shrink-0" strokeWidth={2} />
							<span className="text-xs font-bold sm:text-sm">
								{GAME_TYPE_LABELS[type]}
							</span>
						</label>
					);
				})}
			</div>
		</Fieldset>
	);
}
