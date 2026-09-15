import { Fieldset } from "@/components/ui/Fieldset";
import { OptionTile } from "@/components/ui/OptionTile";
import { GAME_TYPE_LABELS, GAME_TYPES, type GameType } from "@/types/country";

interface GameTypeToggleProps {
	legend: string;
	hideLegend?: boolean;
	/** Distingue el grupo de radios cuando hay más de uno en la misma pantalla (config vs. ranking). */
	name: string;
	value: GameType;
	onChange: (value: GameType) => void;
	className?: string;
}

/**
 * Selector Países/Banderas (D030: Países primero). Extraído de la
 * `Configuration` de la Fase 2 para reutilizarlo también en
 * `LeaderboardModal` (Fase 4) sin duplicar el patrón `Fieldset` +
 * `OptionTile`.
 */
export function GameTypeToggle({
	legend,
	hideLegend,
	name,
	value,
	onChange,
	className,
}: GameTypeToggleProps) {
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
