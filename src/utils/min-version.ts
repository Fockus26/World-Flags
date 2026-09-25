/**
 * Actualización obligatoria (D108, D109): ¿la versión que corre está por
 * debajo de la mínima que pide el servidor?
 *
 * Funciones puras (sin Supabase ni DOM) para que `tests/unit` las pruebe sin
 * red. La lectura de la mínima vive en `app-config.ts`.
 *
 * La regla de fondo es **no bloquear ante la duda**: un valor que no es
 * exactamente `MAJOR.MINOR.PATCH` (vacío, con `v`, con sufijo `-beta`, un
 * número suelto) no bloquea a nadie. Un error al escribir la mínima en el
 * dashboard no puede dejar a todo el mundo sin jugar.
 */

import { compareVersions } from "./changelog";

const VERSION_PATTERN = /^\d{1,6}\.\d{1,6}\.\d{1,6}$/;

/** La versión tal cual si es `MAJOR.MINOR.PATCH`; si no, `null`. */
export function parseVersion(value: unknown): string | null {
	if (typeof value !== "string") return null;

	const trimmed = value.trim();

	return VERSION_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * `true` solo si las dos versiones son válidas y la actual es menor que la
 * mínima. Igual a la mínima no bloquea. La comparación es número a número
 * (`compareVersions`, la misma del changelog): 2.10.0 va después de 2.9.0.
 */
export function isUpdateRequired(
	currentVersion: unknown,
	minVersion: unknown,
): boolean {
	const current = parseVersion(currentVersion);
	const minimum = parseVersion(minVersion);

	if (current === null || minimum === null) return false;

	return compareVersions(current, minimum) < 0;
}
