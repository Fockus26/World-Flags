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
 * Para Capitales (D065): ¿`answer` es alguna de las respuestas `accepted`?
 * Banderas y Países siguen con `isCorrectAnswer`, que no cambia.
 *
 * - Difícil (y competitivo): los signos cuentan igual que las tildes —
 *   apóstrofos, guiones y espacios hay que escribirlos como son ("Saint
 *   John's", "Port-au-Prince"; decisión del dueño). Concesiones que no
 *   cambian lo que se escribe, solo con qué tecla sale: cualquier apóstrofo
 *   (’ ‘ ´ ʼ ʻ `) vale como el del teclado ('); cualquier guion o raya
 *   (‐ ‑ ‒ – —, los que ponen los teclados de móvil) vale como "-"; una tilde
 *   pegada como carácter aparte (NFD) vale como la tilde normal; y varios
 *   espacios seguidos cuentan como uno.
 * - Fácil: además de las tildes, se ignoran espacios, guiones, puntos, comas
 *   y apóstrofos ("saint johns", "portonovo", "washington dc").
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
	const base = normalize(value.normalize("NFC"), difficulty)
		.replace(/[\u2019\u2018\u00b4\u02bc\u02bb`]/g, "'")
		.replace(/[\u2010-\u2014]/g, "-");

	return difficulty === "easy"
		? base.replace(/[\s.,'-]/g, "")
		: base.replace(/\s+/g, " ");
}
