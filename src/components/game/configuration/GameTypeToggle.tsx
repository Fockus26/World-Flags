import { Globe, TriangleFlag } from "iconoir-react";
import { useId } from "react";
import { Fieldset } from "@/components/ui/Fieldset";
import { GAME_TYPE_LABELS, GAME_TYPES, type GameType } from "@/types/country";

interface GameTypeToggleProps {
	legend: string;
	hideLegend?: boolean;
	value: GameType;
	onChange: (value: GameType) => void;
	className?: string;
}

const GAME_TYPE_ICONS: Record<GameType, typeof Globe> = {
	countries: Globe,
	flags: TriangleFlag,
};

/**
 * Selector Países/Banderas (D030: Países primero). Extraído de la
 * `Configuration` de la Fase 2 para reutilizarlo también en
 * `LeaderboardModal` (Fase 4) sin duplicar el patrón `Fieldset` + segmentado.
 *
 * Segmentado con píldora deslizante e icono — propuesta "B" del canvas de
 * diseño (`context/plans/design-canvas/`), elegida por el dueño sin la
 * tarjeta de vista previa: el título de abajo (`Aprende los países/las
 * banderas del mundo`) ya dice qué modo está activo, repetirlo en una
 * tarjeta era redundante. No reutiliza `OptionTile` a propósito: ese
 * componente es la base de otros selectores del kit (tema, dificultad,
 * modo de juego en `GameTab`) y cambiar su estilo de "caja con borde" a
 * "píldora deslizante" habría afectado a todos ellos por un pedido que
 * era solo de este selector.
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
	className,
}: GameTypeToggleProps) {
	const name = useId();
	const selectedIndex = GAME_TYPES.indexOf(value);

	return (
		<Fieldset legend={legend} hideLegend={hideLegend} className={className}>
			<div className="relative flex rounded-[var(--radius)] border border-[var(--border)] bg-[var(--default)] p-1">
				<div
					aria-hidden="true"
					className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-[calc(var(--radius)-2px)] bg-[var(--accent)] transition-transform duration-200 ease-in-out"
					style={{
						transform: selectedIndex === 1 ? "translateX(calc(100% + 0.5rem))" : "translateX(0)",
					}}
				/>

				{GAME_TYPES.map((type) => {
					const Icon = GAME_TYPE_ICONS[type];
					const checked = value === type;

					return (
						<label
							key={type}
							className="
								relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5
								rounded-[calc(var(--radius)-2px)] py-2 text-[var(--default-foreground)]
								transition-colors duration-150 ease-in-out
								has-checked:text-[var(--accent-foreground)]
								has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2
								has-focus-visible:outline-[var(--focus)]
							"
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
