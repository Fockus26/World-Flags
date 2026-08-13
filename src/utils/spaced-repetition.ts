import type { ReviewGrade, ReviewState } from "@/types/progress";

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

const GRADE_FACTOR: Record<Exclude<ReviewGrade, "again">, number> = {
	hard: 1.2,
	good: 1.0,
	easy: 1.3,
};

const GRADE_EASE_DELTA: Record<Exclude<ReviewGrade, "again">, number> = {
	hard: -0.15,
	good: 0,
	easy: 0.15,
};

function addDays(date: Date, days: number): string {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result.toISOString().slice(0, 10);
}

export function calculateNextReview(
	previous: ReviewState | null,
	grade: ReviewGrade,
	now: Date = new Date(),
): ReviewState {
	const previousEase = previous?.easeFactor ?? INITIAL_EASE_FACTOR;
	const previousInterval = previous?.intervalDays ?? 0;
	const previousRepetitions = previous?.repetitions ?? 0;

	if (grade === "again") {
		return {
			dueDate: addDays(now, 1),
			intervalDays: 1,
			easeFactor: Math.max(MIN_EASE_FACTOR, previousEase - 0.2),
			repetitions: 0,
			lastReviewedAt: now.toISOString(),
		};
	}

	const repetitions = previousRepetitions + 1;
	const easeFactor = Math.max(MIN_EASE_FACTOR, previousEase + GRADE_EASE_DELTA[grade]);

	let intervalDays: number;
	if (repetitions === 1) {
		intervalDays = 1;
	} else if (repetitions === 2) {
		intervalDays = 6;
	} else {
		intervalDays = Math.round(previousInterval * easeFactor * GRADE_FACTOR[grade]);
	}

	return {
		dueDate: addDays(now, intervalDays),
		intervalDays,
		easeFactor,
		repetitions,
		lastReviewedAt: now.toISOString(),
	};
}

export function isDue(
	review: ReviewState | null,
	today: string = new Date().toISOString().slice(0, 10),
): boolean {
	if (!review) return true;
	return review.dueDate <= today;
}

export function pickMoreRecentReview(
	a: ReviewState | null,
	b: ReviewState | null,
): ReviewState | null {
	if (!a) return b;
	if (!b) return a;
	return a.lastReviewedAt >= b.lastReviewedAt ? a : b;
}
