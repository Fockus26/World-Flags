import { REGION_LABELS, REGIONS } from "@/types/country";
import { calculateRegionAverage } from "@/utils/learning-storage";
import { REGION_COUNTRY_COUNTS } from "@/utils/region-stats";
import { RegionOption } from "./RegionOption";
import styles from "./RegionSelector.module.css";

interface RegionSelectorProps {
	lastRegion: string;
	regionGameScores: Partial<Record<string, number[]>>;
}

export function RegionSelector({
	lastRegion,
	regionGameScores,
}: RegionSelectorProps) {
	return (
		<fieldset className={styles.fieldset}>
			<legend>Continentes</legend>

			<div className={styles.regionGrid}>
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
