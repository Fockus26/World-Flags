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
