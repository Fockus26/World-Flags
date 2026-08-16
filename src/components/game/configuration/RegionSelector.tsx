import { REGION_LABELS, REGIONS } from "@/types/country";
import { calculateRegionAverage } from "@/utils/learning-storage";
import { REGION_COUNTRY_COUNTS } from "@/utils/region-stats";
import { RegionOption } from "./RegionOption";

interface RegionSelectorProps {
	lastRegion: string;
	regionGameScores: Partial<Record<string, number[]>>;
}

export function RegionSelector({ lastRegion, regionGameScores }: RegionSelectorProps) {
	return (
		<fieldset
			className="
				min-w-0
				m-0
				flex-1
				min-h-0
				rounded-lg
				border
				border-border
				p-2
				max-[30rem]:p-2
				max-[43rem]:py-2
			"
		>
			<legend className="px-2 font-extrabold text-text-secondary">Continentes</legend>

			<div
				className="
					grid
					grid-cols-3
					gap-3
					max-[44rem]:grid-cols-2
					max-[44rem]:gap-2
					max-[30rem]:gap-2
				"
			>
				<RegionOption
					value="world"
					label="Todo el mundo"
					countryCount={196}
					score={null}
					defaultChecked={lastRegion === "world"}
				/>

				{REGIONS.map((region) => (
					<RegionOption
						key={region}
						value={region}
						label={REGION_LABELS[region]}
						countryCount={REGION_COUNTRY_COUNTS[region]}
						score={calculateRegionAverage(regionGameScores[region])}
						defaultChecked={lastRegion === region}
					/>
				))}
			</div>
		</fieldset>
	);
}
