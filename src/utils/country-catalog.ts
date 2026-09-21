import { countries } from "@/data/countries";

const CATALOG_CODES: ReadonlySet<string> = new Set(
	countries.map((country) => country.code),
);

/**
 * Si el código existe en el catálogo actual (`data/countries.ts`).
 *
 * Lo guardado (`countryHistory`, `lastPracticeByCountry`,
 * `scope.countryCodes`…) puede traer códigos que este catálogo no conoce: un
 * país que salió del catálogo, o uno que añadió una versión más nueva de la
 * app y llegó por la nube a un cliente viejo que sigue en caché del SW.
 *
 * Esos códigos se CONSERVAN al normalizar, fusionar y subir — así un cliente
 * viejo no borra el progreso de uno nuevo, mismo espíritu que D021 con los ids
 * de logro — y se ignoran solo al leer, contar y mostrar, que es donde se usa
 * esta función.
 */
export function isCatalogCountryCode(code: string): boolean {
	return CATALOG_CODES.has(code);
}
