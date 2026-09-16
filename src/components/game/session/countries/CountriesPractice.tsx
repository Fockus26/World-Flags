import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { AnswerForm } from "@/components/game/session/AnswerForm";
import { ConfirmationModal } from "@/components/game/session/ConfirmationModal";
import { Header } from "@/components/game/session/Header";
import { Button } from "@/components/ui/Button";
import { useCardCountdown } from "@/hooks/useCardCountdown";
import { useFlyToSlot } from "@/hooks/useFlyToSlot";
import { useGame } from "@/hooks/useGame";
import { usePracticeQueue } from "@/hooks/usePracticeQueue";
import {
	type AnswerStatus,
	DEFAULT_TIMER_DURATION,
	REGION_LABELS,
	type Region,
} from "@/types/country";
import type { ReviewGrade } from "@/types/progress";
import { toGameView } from "@/utils/learning-storage";
import { isCorrectAnswer } from "@/utils/normalize-answer";
import { getScopeLabel } from "@/utils/practice-scope";
import { calculateScore } from "@/utils/score";
import type { BoardSlotState } from "./BoardSlot";
import { CountryClozeCard } from "./CountryClozeCard";

const GRADE_BY_KEY: Record<string, ReviewGrade> = {
	"1": "again",
	"2": "hard",
	"3": "good",
	"4": "easy",
};

// Igual que en la práctica de Banderas: al usar skip se revela la respuesta
// un momento antes de calificarla automáticamente como "otra vez".
const SKIP_REVEAL_MS = 1500;

/**
 * Práctica de países (D034): tarjeta cloze sobre el tablero del continente
 * de cada país — todos los nombres visibles salvo el que hay que adivinar,
 * con pistas letra a letra. Reutiliza `AnswerForm`/`GradeButtons`/SRS igual
 * que `Session.tsx` (práctica de Banderas); lo que cambia es la tarjeta.
 */
export function CountriesPractice() {
	const { activeGame, learningData, exitGame, finishGame, gradeCountryReview } =
		useGame();

	const countries = activeGame?.countries ?? [];
	const timerDuration =
		activeGame?.configuration.timerDuration ?? DEFAULT_TIMER_DURATION;
	const isTimedPractice = activeGame?.configuration.timerEnabled ?? false;

	const [answer, setAnswer] = useState("");
	const [answerStatus, setAnswerStatus] = useState<AnswerStatus>("idle");
	const [correctAnswers, setCorrectAnswers] = useState(0);
	const [isExitModalOpen, setIsExitModalOpen] = useState(false);
	const [isSkipPending, setIsSkipPending] = useState(false);
	const [hintLetters, setHintLetters] = useState(0);
	const [hintAnnouncement, setHintAnnouncement] = useState("");
	const [isTargetFlying, setIsTargetFlying] = useState(false);

	const firstAttemptResultsRef = useRef<Record<string, boolean>>({});
	const skippedAnswersRef = useRef(0);
	const startTimeRef = useRef<number | null>(null);
	const exitModalOpenedAtRef = useRef<number | null>(null);
	// Evita que un tecleo 1-4 repetido rápido dispare dos calificaciones para
	// la misma tarjeta (hallazgo pre-existente en el rush de banderas; acá se
	// evita desde el principio). Se libera al cambiar de tarjeta.
	const isGradingRef = useRef(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const slotRefs = useRef<Map<string, HTMLLIElement>>(new Map());

	const { fly } = useFlyToSlot(slotRefs);

	const practiceQueue = usePracticeQueue({
		initialCodes: countries.map((country) => country.code),
		countryHistory: toGameView(learningData, "countries").countryHistory,
		onGrade: (code, grade, isFirstAttempt) =>
			gradeCountryReview(code, grade, "countries", isFirstAttempt),
		onFinish: () => {
			const regionBreakdown: Partial<
				Record<Region, { correct: number; total: number }>
			> = {};

			for (const country of countries) {
				const isCorrect = firstAttemptResultsRef.current[country.code] ?? false;
				const entry = regionBreakdown[country.region] ?? {
					correct: 0,
					total: 0,
				};
				entry.total += 1;
				if (isCorrect) entry.correct += 1;
				regionBreakdown[country.region] = entry;
			}

			finishGame({
				mode: "practice",
				gameType: "countries",
				score: calculateScore(correctAnswers, countries.length),
				correctAnswers,
				skippedAnswers: skippedAnswersRef.current,
				finishedAt: new Date().toISOString(),
				elapsedMs:
					startTimeRef.current !== null ? Date.now() - startTimeRef.current : 0,
				totalCountries: countries.length,
				scope: activeGame?.configuration.scope ?? { type: "world" },
				regionBreakdown,
			});
		},
	});

	const currentCountry = countries.find(
		(country) => country.code === practiceQueue.currentCode,
	);

	function recordFirstAttempt(code: string, isCorrect: boolean) {
		if (code in firstAttemptResultsRef.current) return;
		firstAttemptResultsRef.current[code] = isCorrect;
		if (isCorrect) {
			setCorrectAnswers((currentValue) => currentValue + 1);
		}
	}

	useEffect(() => {
		if (startTimeRef.current === null) {
			startTimeRef.current = Date.now();
		}
	}, []);

	// Tarjeta nueva: pistas y guard de calificación arrancan de cero.
	// biome-ignore lint/correctness/useExhaustiveDependencies: se depende de practiceQueue.currentCode a propósito para disparar el reinicio al cambiar de tarjeta, aunque el cuerpo no lo lea directamente
	useEffect(() => {
		setHintLetters(0);
		setHintAnnouncement("");
		isGradingRef.current = false;
	}, [practiceQueue.currentCode]);

	// Lleva el hueco objetivo a la vista al cambiar de tarjeta — el resto del
	// tablero puede ser más alto que lo visible (continentes grandes).
	useEffect(() => {
		if (!currentCountry) return;
		const slot = slotRefs.current.get(currentCountry.code);
		if (!slot) return;

		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		slot.scrollIntoView({
			block: "center",
			behavior: prefersReducedMotion ? "auto" : "smooth",
		});
	}, [currentCountry]);

	const timeLeft = useCardCountdown({
		enabled: isTimedPractice,
		duration: timerDuration,
		cardCode: practiceQueue.currentCode,
		isPaused: answerStatus !== "idle" || isExitModalOpen,
		onExpire: handleSkip,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: handleGrade estabilizado por React Compiler (ver docs/components.md)
	useEffect(() => {
		if (answerStatus === "idle") return;
		if (isExitModalOpen) return;
		if (isSkipPending) return;

		function handleKeyDown(event: KeyboardEvent) {
			const grade = GRADE_BY_KEY[event.key];
			if (grade) {
				event.preventDefault();
				handleGrade(grade);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [answerStatus, isExitModalOpen, isSkipPending]);

	if (!activeGame || !currentCountry) {
		return null;
	}

	const { configuration } = activeGame;
	const scopeLabel = getScopeLabel(configuration.scope);
	const regionLabel = REGION_LABELS[currentCountry.region];
	const maxHintLetters = Math.max(currentCountry.name.length - 1, 0);

	// Mientras el nombre vuela hacia su hueco, el hueco sigue como objetivo:
	// el verde de acierto aparece al aterrizar, no con el texto todavía lejos.
	const targetState: BoardSlotState =
		answerStatus === "idle" || isTargetFlying
			? "target"
			: answerStatus === "correct"
				? "revealed"
				: "missed";

	/** El tiempo que el modal de abandonar estuvo abierto no cuenta para `stats.totalTimePlayedMs` (mismo criterio que `Session.tsx`, aunque acá no se muestre un cronómetro en pantalla). */
	function handleOpenExitModal() {
		exitModalOpenedAtRef.current = Date.now();
		setIsExitModalOpen(true);
	}

	function handleCancelExit() {
		if (exitModalOpenedAtRef.current !== null) {
			const pausedMs = Date.now() - exitModalOpenedAtRef.current;
			if (startTimeRef.current !== null) {
				startTimeRef.current += pausedMs;
			}
			exitModalOpenedAtRef.current = null;
		}
		setIsExitModalOpen(false);
	}

	function handleGrade(grade: ReviewGrade) {
		if (isGradingRef.current) return;
		isGradingRef.current = true;

		practiceQueue.grade(grade);
		setIsSkipPending(false);
		setIsTargetFlying(false);
		setAnswer("");
		setAnswerStatus("idle");
	}

	function handleSkip() {
		if (!currentCountry || answerStatus !== "idle") return;

		skippedAnswersRef.current += 1;
		recordFirstAttempt(currentCountry.code, false);
		setIsSkipPending(true);
		setAnswerStatus("incorrect");
		window.setTimeout(() => handleGrade("again"), SKIP_REVEAL_MS);
	}

	function handleHint() {
		if (!currentCountry || answerStatus !== "idle") return;

		setHintLetters((previous) => {
			const next = Math.min(previous + 1, maxHintLetters);
			if (next > previous) {
				setHintAnnouncement(`Letra revelada: ${currentCountry.name[next - 1]}`);
			}
			return next;
		});
	}

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!currentCountry || answerStatus !== "idle" || !answer.trim()) {
			return;
		}

		const isCorrect = isCorrectAnswer(
			answer,
			currentCountry.name,
			configuration.difficulty,
		);

		setAnswerStatus(isCorrect ? "correct" : "incorrect");
		// Un acierto con pistas cuenta igual para la puntuación (D034): las
		// pistas ayudan a recordar, no sustituyen la calificación honesta que
		// viene después (Otra vez/Difícil/Bien/Fácil).
		recordFirstAttempt(currentCountry.code, isCorrect);

		if (!isCorrect) return;

		setIsTargetFlying(true);
		const fromEl = inputRef.current;

		if (!fromEl) {
			setIsTargetFlying(false);
			return;
		}

		fly({
			text: currentCountry.name,
			fromEl,
			toCode: currentCountry.code,
			onLanded: () => setIsTargetFlying(false),
		});
	}

	return (
		<>
			<section className="flex h-[min(100%,45rem)] md:h-[min(100%,50rem)] max-h-full w-[min(100%,58rem)] flex-col overflow-hidden rounded-lg border border-surface-border bg-surface p-[0.85rem] min-[44rem]:rounded-2xl min-[44rem]:p-[clamp(1rem,2.5vh,2rem)]">
				<Header
					regionLabel={scopeLabel}
					currentIndex={practiceQueue.completedCount}
					totalCountries={practiceQueue.totalCount}
					timeLeft={isTimedPractice ? timeLeft : undefined}
					timerDuration={isTimedPractice ? timerDuration : undefined}
					onExit={handleOpenExitModal}
				/>

				<CountryClozeCard
					className="mt-[0.65rem] min-[30rem]:mt-[clamp(0.75rem,2vh,1.5rem)]"
					countryCode={currentCountry.code}
					targetState={targetState}
					completedCodes={practiceQueue.completedCodes}
					flyingCodes={
						isTargetFlying ? new Set([currentCountry.code]) : undefined
					}
					hintLetters={hintLetters}
					slotRefs={slotRefs}
				/>

				<div role="status" aria-live="polite" className="sr-only">
					{hintAnnouncement}
				</div>

				{answerStatus === "idle" && (
					<Button
						type="button"
						variant="outline"
						color="neutral"
						fullWidth={false}
						disabled={hintLetters >= maxHintLetters}
						onClick={handleHint}
						aria-label={`Pista: revelar una letra (${hintLetters}/${maxHintLetters})`}
						className="my-[0.65rem] self-start min-[30rem]:my-[clamp(0.75rem,2vh,1.5rem)]"
					>
						Pista
					</Button>
				)}

				<AnswerForm
					countryName={currentCountry.name}
					answer={answer}
					onAnswerChange={setAnswer}
					answerStatus={answerStatus}
					onSubmit={handleSubmit}
					onSkip={handleSkip}
					mode="practice"
					onGrade={handleGrade}
					hideGradeButtons={isSkipPending}
					label={`¿Qué país falta en ${regionLabel}?`}
					correctSuffix={
						hintLetters > 0
							? ` con ${hintLetters} pista${hintLetters === 1 ? "" : "s"}`
							: undefined
					}
					inputRef={inputRef}
				/>
			</section>

			<ConfirmationModal
				isOpen={isExitModalOpen}
				onCancel={handleCancelExit}
				onConfirm={exitGame}
			/>
		</>
	);
}
