import type { Difficulty } from "@/types/country";

export function isCorrectAnswer(
	answer: string,
	correctName: string,
	difficulty: Difficulty = "hard",
): boolean {
	return normalize(answer, difficulty) === normalize(correctName, difficulty);
}

function normalize(value: string, difficulty: Difficulty): string {
	const base = value.trim().toLowerCase();
	return difficulty === "easy" ? stripDiacritics(base) : base;
}

function stripDiacritics(value: string): string {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
