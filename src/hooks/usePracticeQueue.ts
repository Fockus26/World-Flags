import { useRef, useState } from "react";
import type { CountriesLearningHistory, ReviewGrade } from "@/types/progress";
import { isCountryLearned } from "@/utils/learning-storage";
import {
	decideRequeue,
	insertRequeuedCard,
	type PracticeCardState,
} from "@/utils/practice-queue";

interface UsePracticeQueueOptions {
	initialCodes: string[];
	countryHistory: CountriesLearningHistory;
	/**
	 * `isFirstAttempt` es true solo la primera vez que se califica ese país en
	 * la sesión (aunque luego se repita). Va en la misma llamada — no en un
	 * callback aparte — para que quien la use pueda resolverlo en un único
	 * despacho de estado (ver comentario en `useGame.ts`).
	 */
	onGrade: (code: string, grade: ReviewGrade, isFirstAttempt: boolean) => void;
	onFinish: () => void;
}

/**
 * Cola de práctica de una sesión (práctica diaria o práctica por continente):
 * al calificar una bandera con "otra vez"/"difícil"/"bien" puede volver a
 * aparecer más adelante en la misma sesión (ver `utils/practice-queue.ts`).
 */
export function usePracticeQueue({
	initialCodes,
	countryHistory,
	onGrade,
	onFinish,
}: UsePracticeQueueOptions) {
	const [totalCount] = useState(initialCodes.length);
	const [queue, setQueue] = useState<string[]>(initialCodes);
	const [completedCount, setCompletedCount] = useState(0);
	const [attemptedCount, setAttemptedCount] = useState(0);

	const cardStateRef = useRef<Record<string, PracticeCardState>>({});
	const attemptedCodesRef = useRef<Set<string>>(new Set());
	const [establishedByCode] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(
			initialCodes.map((code) => [
				code,
				isCountryLearned(countryHistory[code]?.review ?? null),
			]),
		),
	);

	const currentCode = queue[0] ?? null;

	function grade(gradeValue: ReviewGrade) {
		if (!currentCode) return;

		const isFirstAttempt = !attemptedCodesRef.current.has(currentCode);

		if (isFirstAttempt) {
			attemptedCodesRef.current.add(currentCode);
			setAttemptedCount((value) => value + 1);
		}

		onGrade(currentCode, gradeValue, isFirstAttempt);

		const isEstablished = establishedByCode[currentCode] ?? false;
		const { requeue, nextState } = decideRequeue(
			cardStateRef.current[currentCode],
			gradeValue,
			isEstablished,
		);
		cardStateRef.current[currentCode] = nextState;

		const rest = queue.slice(1);

		if (requeue) {
			setQueue(insertRequeuedCard(rest, currentCode));
			return;
		}

		setCompletedCount((value) => value + 1);

		if (rest.length === 0) {
			onFinish();
			return;
		}

		setQueue(rest);
	}

	return { currentCode, totalCount, completedCount, attemptedCount, grade };
}
