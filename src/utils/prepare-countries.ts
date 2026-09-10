import type { Country, GameConfiguration, Region } from "@/types/country";
import { getExactSingleRegion, resolveScopeCountries } from "./practice-scope";
import { shuffle } from "./shuffle";

const REGION_ORDER: Record<Region, number> = {
	"north-america": 0,
	"central-america": 1,
	caribbean: 2,
	"south-america": 3,
	europe: 4,
	oceania: 5,
	asia: 6,
	africa: 7,
};

const spanishCollator = new Intl.Collator("es", {
	sensitivity: "base",
});

function sortAlphabetically(countries: readonly Country[]): Country[] {
	return [...countries].sort((firstCountry, secondCountry) =>
		spanishCollator.compare(firstCountry.name, secondCountry.name),
	);
}

function sortWorldCountries(countries: readonly Country[]): Country[] {
	return [...countries].sort((firstCountry, secondCountry) => {
		const regionDifference =
			REGION_ORDER[firstCountry.region] - REGION_ORDER[secondCountry.region];

		if (regionDifference !== 0) {
			return regionDifference;
		}

		return spanishCollator.compare(firstCountry.name, secondCountry.name);
	});
}

export function prepareCountries(
	countries: readonly Country[],
	configuration: GameConfiguration,
): Country[] {
	const filteredCountries = resolveScopeCountries(
		countries,
		configuration.scope,
	);

	if (configuration.order === "random") {
		return shuffle(filteredCountries);
	}

	// Un solo continente completo (sin países sueltos ni mezcla): alfabético
	// simple, como antes. Cualquier otra combinación (mundo, varios
	// continentes, países sueltos) se agrupa por continente.
	if (
		configuration.scope.type === "world" ||
		!getExactSingleRegion(configuration.scope)
	) {
		return sortWorldCountries(filteredCountries);
	}

	return sortAlphabetically(filteredCountries);
}
