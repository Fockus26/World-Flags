import { CAPITALS } from "@/data/capitals";
import type { Capital, Difficulty } from "@/types/country";
import { isAcceptedAnswer } from "@/utils/normalize-answer";

/**
 * La capital de `code`, o `undefined` si no hay entrada: la sesión trata ese
 * país como uno fuera de catálogo (D040), nunca una tarjeta sin respuesta.
 * `tests/unit/capitals.test.ts` exige que no falte ninguna.
 */
export function getCapital(code: string): Capital | undefined {
	return Object.hasOwn(CAPITALS, code) ? CAPITALS[code] : undefined;
}

/** Todas las respuestas que valen: la que se muestra y sus alias. */
export function getAcceptedCapitals(capital: Capital): readonly string[] {
	return [capital.name, ...(capital.accepted ?? [])];
}

/** ¿`answer` es la capital de `code` (o una de las que valen)? Ver `isAcceptedAnswer`. */
export function isCorrectCapital(
	answer: string,
	code: string,
	difficulty: Difficulty,
): boolean {
	const capital = getCapital(code);

	return (
		capital !== undefined &&
		isAcceptedAnswer(answer, getAcceptedCapitals(capital), difficulty)
	);
}
