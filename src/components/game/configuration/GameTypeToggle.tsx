import { useId } from "react";
import { Fieldset } from "@/components/ui/Fieldset";
import { OptionTile } from "@/components/ui/OptionTile";
import { GAME_TYPE_LABELS, GAME_TYPES, type GameType } from "@/types/country";

interface GameTypeToggleProps {
	legend: string;
	hideLegend?: boolean;
	value: GameType;
	onChange: (value: GameType) => void;
	className?: string;
}

/**
 * Selector Países/Banderas (D030: Países primero). Extraído de la
 * `Configuration` de la Fase 2 para reutilizarlo también en
 * `LeaderboardModal` (Fase 4) sin duplicar el patrón `Fieldset` +
 * `OptionTile`.
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

	return (
		<Fieldset legend={legend} hideLegend={hideLegend} className={className}>
			<div className="grid grid-cols-2 gap-1.5">
				{GAME_TYPES.map((type) => (
					<OptionTile
						key={type}
						name={name}
						value={type}
						checked={value === type}
						onChange={() => onChange(type)}
					>
						{GAME_TYPE_LABELS[type]}
					</OptionTile>
				))}
			</div>
		</Fieldset>
	);
}
