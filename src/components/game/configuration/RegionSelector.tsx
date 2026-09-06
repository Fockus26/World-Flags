import { Button } from "@/components/ui/Button";
import { Fieldset } from "@/components/ui/Fieldset";
import {
	type GameMode,
	type PracticeScope,
	type Region,
	REGION_LABELS,
	REGIONS,
} from "@/types/country";
import { calculateRegionAverage, formatElapsedTime } from "@/utils/learning-storage";
import { REGION_COUNTRY_COUNTS } from "@/utils/region-stats";
import { RegionOption } from "./RegionOption";

interface RegionSelectorProps {
	scope: PracticeScope;
	onScopeChange: (scope: PracticeScope) => void;
	regionGameScores: Partial<Record<Region, number[]>>;
	regionBestTimes: Partial<Record<Region, number>>;
	mode: GameMode;
	getRegionPracticeProgress: (region: Region) => { practiced: number; total: number };
	onOpenCustomPicker: () => void;
}

function getPracticedLabel(practiced: number, total: number): string | undefined {
	if (practiced === 0) return undefined;
	if (practiced >= total) return "Practicado hoy";
	return `${practiced}/${total} hoy`;
}

export function RegionSelector({
	scope,
	onScopeChange,
	regionGameScores,
	regionBestTimes,
	mode,
	getRegionPracticeProgress,
	onOpenCustomPicker,
}: RegionSelectorProps) {
	const isWorldSelected = scope.type === "world";
	const selectedRegions = scope.type === "custom" ? scope.regions : [];
	const customCodes = scope.type === "custom" ? scope.countryCodes : [];

	function toggleWorld() {
		onScopeChange(isWorldSelected ? { type: "custom", regions: [], countryCodes: [] } : { type: "world" });
	}

	function toggleRegion(region: Region) {
		const isSelected = selectedRegions.includes(region);
		onScopeChange({
			type: "custom",
			regions: isSelected
				? selectedRegions.filter((selected) => selected !== region)
				: [...selectedRegions, region],
			countryCodes: customCodes,
		});
	}

	return (
		<Fieldset
			legend="Continentes"
			className="
				min-w-0
				m-0
				flex-1
				min-h-0
				flex flex-col
				gap-3
			"
		>
			<div
				className="
					grid
					grid-cols-2
					gap-3
					min-[44rem]:grid-cols-3
				"
			>
				<RegionOption
					value="world"
					label="Todo el mundo"
					countryCount={196}
					score={null}
					checked={isWorldSelected}
					onChange={toggleWorld}
					className="col-span-2 min-[44rem]:col-span-1"
				/>

				{REGIONS.map((region) => {
					const progress =
						mode === "practice" ? getRegionPracticeProgress(region) : { practiced: 0, total: 0 };
					const bestTime = regionBestTimes[region];

					return (
						<RegionOption
							key={region}
							value={region}
							label={REGION_LABELS[region]}
							countryCount={REGION_COUNTRY_COUNTS[region]}
							score={mode === "practice" ? calculateRegionAverage(regionGameScores[region]) : null}
							bestTimeLabel={
								mode === "competitive" && bestTime !== undefined
									? formatElapsedTime(bestTime)
									: null
							}
							checked={!isWorldSelected && selectedRegions.includes(region)}
							onChange={() => toggleRegion(region)}
							practicedLabel={getPracticedLabel(progress.practiced, progress.total)}
						/>
					);
				})}
			</div>

			<Button
				type="button"
				variant="text"
				color="secondary"
				className="justify-self-start"
				onClick={onOpenCustomPicker}
			>
				{customCodes.length > 0
					? `Países elegidos a mano (${customCodes.length})`
					: "Elegir países específicos…"}
			</Button>
		</Fieldset>
	);
}
