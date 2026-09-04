import { Fieldset } from "@/components/ui/Fieldset";
import { type GameMode, type PracticeRegion, REGION_LABELS, REGIONS } from "@/types/country";
import { calculateRegionAverage } from "@/utils/learning-storage";
import { REGION_COUNTRY_COUNTS } from "@/utils/region-stats";
import { RegionOption } from "./RegionOption";

interface RegionSelectorProps {
	lastRegion: string;
	regionGameScores: Partial<Record<string, number[]>>;
	mode: GameMode;
	isRegionPracticedToday: (region: PracticeRegion) => boolean;
}

export function RegionSelector({
	lastRegion,
	regionGameScores,
	mode,
	isRegionPracticedToday,
}: RegionSelectorProps) {
	return (
		<Fieldset
			legend="Continentes"
			className="
				min-w-0
				m-0
				flex-1
				min-h-0
				flex flex-col
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
					defaultChecked={lastRegion === "world"}
					practicedToday={mode === "practice" && isRegionPracticedToday("world")}
					className="col-span-2 min-[44rem]:col-span-1"
				/>

				{REGIONS.map((region) => (
					<RegionOption
						key={region}
						value={region}
						label={REGION_LABELS[region]}
						countryCount={REGION_COUNTRY_COUNTS[region]}
						score={calculateRegionAverage(regionGameScores[region])}
						defaultChecked={lastRegion === region}
						practicedToday={mode === "practice" && isRegionPracticedToday(region)}
					/>
				))}
			</div>
		</Fieldset>
	);
}
