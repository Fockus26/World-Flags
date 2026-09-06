import type { Country, PracticeScope, Region } from "@/types/country";
import { REGION_LABELS } from "@/types/country";

/** Resuelve un `PracticeScope` a la lista de países que le corresponde. */
export function resolveScopeCountries(
	countries: readonly Country[],
	scope: PracticeScope,
): Country[] {
	if (scope.type === "world") {
		return [...countries];
	}

	const regionSet = new Set(scope.regions);
	const codeSet = new Set(scope.countryCodes);

	return countries.filter((country) => regionSet.has(country.region) || codeSet.has(country.code));
}

export function getScopeCountryCodes(countries: readonly Country[], scope: PracticeScope): string[] {
	return resolveScopeCountries(countries, scope).map((country) => country.code);
}

/**
 * Si el scope equivale exactamente a UN solo continente completo (sin países
 * sueltos agregados ni otros continentes mezclados), devuelve ese continente.
 * Se usa para decidir si una partida cuenta para las estadísticas por
 * continente (promedio de puntuación, mejor tiempo).
 */
export function getExactSingleRegion(scope: PracticeScope): Region | null {
	if (scope.type === "custom" && scope.regions.length === 1 && scope.countryCodes.length === 0) {
		return scope.regions[0];
	}

	return null;
}

export function isEmptyScope(scope: PracticeScope): boolean {
	return scope.type === "custom" && scope.regions.length === 0 && scope.countryCodes.length === 0;
}

export function getScopeLabel(scope: PracticeScope): string {
	if (scope.type === "world") {
		return REGION_LABELS.world;
	}

	const parts = scope.regions.map((region) => REGION_LABELS[region]);

	if (scope.countryCodes.length > 0) {
		const count = scope.countryCodes.length;
		parts.push(`${count} país${count === 1 ? "" : "es"} personalizado${count === 1 ? "" : "s"}`);
	}

	return parts.length > 0 ? parts.join(" + ") : "Selección personalizada";
}
