import type { Difficulty } from "@/types/country";

export function isCorrectAnswer(
	answer: string,
	correctName: string,
	difficulty: Difficulty = "hard",
): boolean {
	return normalize(answer, difficulty) === normalize(correctName, difficulty);
}

/**
 * Exportada además de usarla `isCorrectAnswer` internamente: `country-board.ts`
 * (modo Países) la necesita para comparar un texto contra muchos países a la
 * vez (`findMatch`) sin normalizar cada candidato dos veces por comparación.
 * Comportamiento sin cambios.
 */
export function normalize(value: string, difficulty: Difficulty): string {
	const base = value.trim().toLowerCase();
	return difficulty === "easy" ? stripDiacritics(base) : base;
}

function stripDiacritics(value: string): string {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Para Capitales (D065): \u00bf`answer` es alguna de las respuestas `accepted`?
 * Banderas y Pa\u00edses siguen con `isCorrectAnswer`, que no cambia.
 *
 * - Dif\u00edcil (y competitivo): los signos cuentan igual que las tildes \u2014
 *   ap\u00f3strofos, guiones y espacios hay que escribirlos como son ("Saint
 *   John's", "Port-au-Prince"; decisi\u00f3n del due\u00f1o). Dos concesiones que no
 *   cambian lo que se escribe: el ap\u00f3strofo tipogr\u00e1fico (\u2019) de la fuente
 *   equivale al del teclado ('), el \u00fanico que se puede teclear; y varios
 *   espacios seguidos cuentan como uno.
 * - F\u00e1cil: adem\u00e1s de las tildes, se ignoran espacios, guiones, puntos, comas
 *   y ap\u00f3strofos ("saint johns", "portonovo", "washington dc").
 */
export function isAcceptedAnswer(
	answer: string,
	accepted: readonly string[],
	difficulty: Difficulty = "hard",
): boolean {
	const typed = normalizeCapital(answer, difficulty);

	return (
		typed !== "" &&
		accepted.some((option) => normalizeCapital(option, difficulty) === typed)
	);
}

function normalizeCapital(value: string, difficulty: Difficulty): string {
	const base = normalize(value, difficulty).replace(
		/[\u2019\u2018\u02bb`]/g,
		"'",
	);

	return difficulty === "easy"
		? base.replace(/[\s.,'-]/g, "")
		: base.replace(/\s+/g, " ");
}
