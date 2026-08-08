import { countries } from "../data/countries";
import type { Region } from "../types/country";

export const REGION_COUNTRY_COUNTS: Record<Region, number> =
	countries.reduce(
		(counts, country) => {
			counts[country.region] = (counts[country.region] ?? 0) + 1;
			return counts;
		},
		{} as Record<Region, number>,
	);