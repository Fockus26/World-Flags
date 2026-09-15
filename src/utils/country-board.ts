import type { Country, Difficulty, Region } from "@/types/country";
import { REGION_LABELS } from "@/types/country";
import { normalize } from "./normalize-answer";
import { REGION_ORDER, sortAlphabetically } from "./prepare-countries";

/** Un continente del tablero, con sus países en orden alfabético (collator `es`). */
export interface BoardGroup {
	region: Region;
	label: string;
	countries: Country[];
}

/**
 * Agrupa `countries` por continente (en el orden fijo de `REGION_ORDER`, el
 * mismo que usa `prepareCountries` para "Todo el mundo") y ordena cada grupo
 * alfabéticamente. A diferencia de `prepareCountries`, este orden es siempre
 * el mismo — el tablero no cambia con el orden alfabético/aleatorio de la
 * configuración, porque el jugador necesita un lugar fijo donde esperar cada
 * país mientras dura la sesión.
 */
export function buildBoard(countries: readonly Country[]): BoardGroup[] {
	const byRegion = new Map<Region, Country[]>();

	for (const country of countries) {
		const group = byRegion.get(country.region);
		if (group) {
			group.push(country);
		} else {
			byRegion.set(country.region, [country]);
		}
	}

	return [...byRegion.entries()]
		.sort(([a], [b]) => REGION_ORDER[a] - REGION_ORDER[b])
		.map(([region, regionCountries]) => ({
			region,
			label: REGION_LABELS[region],
			countries: sortAlphabetically(regionCountries),
		}));
}

export type MatchResult =
	| { kind: "none" }
	| { kind: "match"; code: string; ambiguousPrefix: boolean }
	| { kind: "alreadyFound"; code: string };

/**
 * Busca si `input` corresponde a algún país de `countries` — el alcance
 * COMPLETO de la sesión (encontrados y no), no solo lo que falta. Hace falta
 * el alcance completo para poder distinguir "ya lo tienes" (D031) de un
 * acierto nuevo: sin los países ya encontrados también en la lista, no
 * habría forma de reconocer que el texto coincide con uno de ellos.
 *
 * (El plan original, `context/plans/modo-paises.md` Fase 3, describía los
 * parámetros como `unfound`/`found` por separado; se ajustó a esto porque
 * detectar "ya descubierto" necesita también el nombre de los ya
 * encontrados, que un `Set<string>` de solo códigos no trae.)
 *
 * Si el texto coincide con un país no encontrado que además es part de otro
 * nombre más largo sin descubrir (p. ej. "Guinea" ⊂ "Guinea Ecuatorial"),
 * `ambiguousPrefix` sale en `true`: quien llama debe esperar (Enter o un
 * plazo corto) antes de aceptarlo, en vez de cortar la escritura a mitad de
 * palabra (D031).
 */
export function findMatch(
	input: string,
	countries: readonly Country[],
	found: ReadonlySet<string>,
	difficulty: Difficulty,
): MatchResult {
	const normalizedInput = normalize(input, difficulty);

	if (!normalizedInput) {
		return { kind: "none" };
	}

	const match = countries.find(
		(country) => normalize(country.name, difficulty) === normalizedInput,
	);

	if (!match) {
		return { kind: "none" };
	}

	if (found.has(match.code)) {
		return { kind: "alreadyFound", code: match.code };
	}

	const ambiguousPrefix = countries.some(
		(country) =>
			country.code !== match.code &&
			!found.has(country.code) &&
			normalize(country.name, difficulty).startsWith(normalizedInput),
	);

	return { kind: "match", code: match.code, ambiguousPrefix };
}
