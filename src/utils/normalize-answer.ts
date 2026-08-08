export function normalizeAnswer(value: string): string {
	return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export function isCorrectAnswer(
	userAnswer: string,
	expectedAnswer: string,
): boolean {
	return normalizeAnswer(userAnswer) === normalizeAnswer(expectedAnswer);
}
