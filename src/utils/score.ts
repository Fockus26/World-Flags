export function calculateScore(
	correctAnswers: number,
	totalCountries: number,
): number {
	if (totalCountries <= 0) {
		return 1;
	}

	const rawScore = Math.round(
		(correctAnswers / totalCountries) * 10,
	);

	return Math.min(10, Math.max(1, rawScore));
}

export function getScoreColor(score: number): string {
	const normalizedScore = Math.min(10, Math.max(1, score));
	const progress = (normalizedScore - 1) / 9;
	const hue = Math.round(progress * 120);

	return `hsl(${hue} 72% 42%)`;
}

export function getScoreBackgroundColor(score: number): string {
	const normalizedScore = Math.min(10, Math.max(1, score));
	const progress = (normalizedScore - 1) / 9;
	const hue = Math.round(progress * 120);

	return `hsl(${hue} 72% 94%)`;
}

export function getScoreMessage(score: number): string {
	if (score === 10) {
		return "Dominio excelente";
	}

	if (score >= 8) {
		return "Muy buen resultado";
	}

	if (score >= 6) {
		return "Buen progreso";
	}

	if (score >= 4) {
		return "Necesitas seguir practicando";
	}

	return "Conviene repetir esta región";
}