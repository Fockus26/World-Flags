import { motion } from "framer-motion";
import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/game/session/ConfirmationModal";
import { useGame } from "@/hooks/useGame";
import { usePracticeQueue } from "@/hooks/usePracticeQueue";
import { motionVariants } from "@/styles/animations";
import { type AnswerStatus, DEFAULT_TIMER_DURATION, type Region } from "@/types/country";
import type { ReviewGrade } from "@/types/progress";
import { isCorrectAnswer } from "@/utils/normalize-answer";
import { getScopeLabel } from "@/utils/practice-scope";
import { calculateScore } from "@/utils/score";
import { AnswerForm } from "./AnswerForm";
import { FlagDisplay } from "./FlagDisplay";
import { Header } from "./Header";

const GRADE_BY_KEY: Record<string, ReviewGrade> = {
	"1": "again",
	"2": "hard",
	"3": "good",
	"4": "easy",
};

// Modo competitivo ("rush"): cada respuesta incorrecta o skip suma una
// penalización al cronómetro en vez de bloquear el avance.
const RUSH_WRONG_PENALTY_MS = 2000;
const RUSH_SKIP_PENALTY_MS = 5000;
const RUSH_ADVANCE_MS = 900;

// Práctica: al usar skip se revela la respuesta un momento antes de
// calificarla automáticamente como "otra vez".
const SKIP_REVEAL_MS = 1500;

export function Session() {
	const { activeGame, learningData, exitGame, finishGame, attemptCountry, gradeCountryReview } =
		useGame();

	const countries = activeGame?.countries ?? [];
	const timerDuration = activeGame?.configuration.timerDuration ?? DEFAULT_TIMER_DURATION;
	const isPracticeMode = activeGame?.configuration.mode === "practice";
	const isCompetitiveMode = activeGame?.configuration.mode === "competitive";
	const isTimedPractice = isPracticeMode && (activeGame?.configuration.timerEnabled ?? false);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [answer, setAnswer] = useState("");
	const [answerStatus, setAnswerStatus] = useState<AnswerStatus>("idle");
	const [correctAnswers, setCorrectAnswers] = useState(0);
	const [isExitModalOpen, setIsExitModalOpen] = useState(false);
	const [timeLeft, setTimeLeft] = useState<number>(timerDuration);
	const [elapsedMs, setElapsedMs] = useState(0);
	// Mientras se revela la respuesta tras un skip en práctica, no tiene
	// sentido mostrar los botones de calificación: "otra vez" ya quedó
	// decidido automáticamente.
	const [isSkipPending, setIsSkipPending] = useState(false);
	const firstAttemptResultsRef = useRef<Record<string, boolean>>({});
	const startTimeRef = useRef<number | null>(null);
	// El cronómetro se pausa mientras se muestra el resultado de una bandera
	// (antes de pasar a la siguiente) y mientras está abierto el modal de
	// abandonar, para que esas esperas no cuenten como tiempo de carrera.
	const isClockPausedRef = useRef(false);
	const exitModalOpenedAtRef = useRef<number | null>(null);

	const practiceQueue = usePracticeQueue({
		initialCodes: countries.map((country) => country.code),
		countryHistory: learningData.countryHistory,
		onGrade: (code, grade, isFirstAttempt) => gradeCountryReview(code, grade, isFirstAttempt),
		onFinish: () => {
			const regionBreakdown: Partial<Record<Region, { correct: number; total: number }>> = {};

			for (const country of countries) {
				const isCorrect = firstAttemptResultsRef.current[country.code] ?? false;
				const entry = regionBreakdown[country.region] ?? { correct: 0, total: 0 };
				entry.total += 1;
				if (isCorrect) entry.correct += 1;
				regionBreakdown[country.region] = entry;
			}

			finishGame({
				mode: "practice",
				score: calculateScore(correctAnswers, countries.length),
				correctAnswers,
				totalCountries: countries.length,
				scope: activeGame?.configuration.scope ?? { type: "world" },
				regionBreakdown,
			});
		},
	});

	const currentCountry = isPracticeMode
		? countries.find((country) => country.code === practiceQueue.currentCode)
		: countries[currentIndex];
	const isLastCountry = currentIndex === countries.length - 1;

	function recordFirstAttempt(code: string, isCorrect: boolean) {
		if (code in firstAttemptResultsRef.current) return;
		firstAttemptResultsRef.current[code] = isCorrect;
		if (isCorrect) {
			setCorrectAnswers((currentValue) => currentValue + 1);
		}
	}

	// Cronómetro del modo competitivo: corre desde que empieza la sesión hasta
	// que termina; las penalizaciones adelantan el "inicio" para que el
	// tiempo mostrado suba de golpe en vez de llevar un contador aparte.
	useEffect(() => {
		if (!isCompetitiveMode) return;
		if (startTimeRef.current === null) {
			startTimeRef.current = Date.now();
		}
		const intervalId = window.setInterval(() => {
			if (startTimeRef.current !== null && !isClockPausedRef.current) {
				setElapsedMs(Date.now() - startTimeRef.current);
			}
		}, 100);
		return () => window.clearInterval(intervalId);
	}, [isCompetitiveMode]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: currentCode dispara el reset intencionalmente, su valor no se lee
	useEffect(() => {
		if (!isTimedPractice) return;
		setTimeLeft(timerDuration);
	}, [isTimedPractice, timerDuration, practiceQueue.currentCode]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: handleSkip estabilizado por React Compiler (ver docs/components.md)
	useEffect(() => {
		if (!isTimedPractice) return;
		if (answerStatus !== "idle") return;
		if (isExitModalOpen) return;
		if (timeLeft <= 0) {
			handleSkip();
			return;
		}
		const timeoutId = window.setTimeout(() => {
			setTimeLeft((currentValue) => currentValue - 1);
		}, 1000);
		return () => window.clearTimeout(timeoutId);
	}, [isTimedPractice, timeLeft, answerStatus, isExitModalOpen]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: handleGrade estabilizado por React Compiler (ver docs/components.md)
	useEffect(() => {
		if (!isPracticeMode) return;
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
	}, [isPracticeMode, answerStatus, isExitModalOpen, isSkipPending]);

	if (!activeGame || !currentCountry) {
		return null;
	}

	const { configuration } = activeGame;
	const scopeLabel = getScopeLabel(configuration.scope);

	function advanceCompetitive() {
		if (isLastCountry) {
			const finalElapsedMs =
				startTimeRef.current !== null ? Date.now() - startTimeRef.current : elapsedMs;

			finishGame({
				mode: "competitive",
				scope: configuration.scope,
				totalCountries: countries.length,
				elapsedMs: finalElapsedMs,
			});
			return;
		}
		setCurrentIndex((currentValue) => currentValue + 1);
		setAnswer("");
		setAnswerStatus("idle");
	}

	/** Congela el cronómetro durante la transición y lo reanuda al avanzar, sin contar esa espera. */
	function pauseThenAdvance() {
		isClockPausedRef.current = true;
		window.setTimeout(() => {
			if (startTimeRef.current !== null) {
				startTimeRef.current += RUSH_ADVANCE_MS;
			}
			isClockPausedRef.current = false;
			advanceCompetitive();
		}, RUSH_ADVANCE_MS);
	}

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!currentCountry || answerStatus !== "idle" || !answer.trim()) {
			return;
		}
		const isCorrect = isCorrectAnswer(answer, currentCountry.name, configuration.difficulty);

		if (configuration.mode === "competitive") {
			attemptCountry(currentCountry.code, isCorrect);
			if (!isCorrect && startTimeRef.current !== null) {
				startTimeRef.current -= RUSH_WRONG_PENALTY_MS;
			}
			setAnswerStatus(isCorrect ? "correct" : "incorrect");
			pauseThenAdvance();
			return;
		}

		setAnswerStatus(isCorrect ? "correct" : "incorrect");
		// En modo práctica una bandera puede repetirse en la misma sesión (otra
		// vez/difícil/bien): la puntuación solo cuenta el primer intento, no si
		// finalmente se acertó tras repetirla.
		recordFirstAttempt(currentCountry.code, isCorrect);
	}

	/** Pausa el temporizador de práctica y el cronómetro del rush mientras se decide si abandonar. */
	function handleOpenExitModal() {
		isClockPausedRef.current = true;
		exitModalOpenedAtRef.current = Date.now();
		setIsExitModalOpen(true);
	}

	/** Al seguir practicando, el tiempo que estuvo abierto el modal no cuenta para el cronómetro del rush. */
	function handleCancelExit() {
		if (exitModalOpenedAtRef.current !== null) {
			const pausedMs = Date.now() - exitModalOpenedAtRef.current;
			if (startTimeRef.current !== null) {
				startTimeRef.current += pausedMs;
			}
			exitModalOpenedAtRef.current = null;
		}
		isClockPausedRef.current = false;
		setIsExitModalOpen(false);
	}

	function handleGrade(grade: ReviewGrade) {
		practiceQueue.grade(grade);
		setIsSkipPending(false);
		setAnswer("");
		setAnswerStatus("idle");
	}

	function handleSkip() {
		if (!currentCountry || answerStatus !== "idle") return;

		if (configuration.mode === "competitive") {
			attemptCountry(currentCountry.code, false);
			if (startTimeRef.current !== null) {
				startTimeRef.current -= RUSH_SKIP_PENALTY_MS;
			}
			setAnswerStatus("incorrect");
			pauseThenAdvance();
			return;
		}

		recordFirstAttempt(currentCountry.code, false);
		setIsSkipPending(true);
		setAnswerStatus("incorrect");
		window.setTimeout(() => handleGrade("again"), SKIP_REVEAL_MS);
	}

	return (
		<>
			<motion.section
				className="flex h-[min(100%,45rem)] md:h-[min(100%, 50rem)] max-h-full w-[min(100%,58rem)] flex-col overflow-hidden rounded-lg border border-surface-border bg-surface p-[0.85rem] min-[44rem]:rounded-2xl min-[44rem]:p-[clamp(1rem,2.5vh,2rem)]"
				variants={motionVariants.contentEnter}
				initial="hidden"
				animate="visible"
			>
				<Header
					regionLabel={scopeLabel}
					currentIndex={isPracticeMode ? practiceQueue.completedCount : currentIndex}
					totalCountries={isPracticeMode ? practiceQueue.totalCount : countries.length}
					timeLeft={isTimedPractice ? timeLeft : undefined}
					timerDuration={isTimedPractice ? timerDuration : undefined}
					elapsedMs={isCompetitiveMode ? elapsedMs : undefined}
					onExit={handleOpenExitModal}
				/>

				<div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-[0.65rem] min-[30rem]:gap-[clamp(0.75rem,2vh,1.5rem)]">
					<FlagDisplay countryCode={currentCountry.code} />
					<AnswerForm
						countryName={currentCountry.name}
						answer={answer}
						onAnswerChange={setAnswer}
						answerStatus={answerStatus}
						onSubmit={handleSubmit}
						onSkip={handleSkip}
						mode={configuration.mode}
						onGrade={handleGrade}
						hideGradeButtons={isSkipPending}
					/>
				</div>
			</motion.section>

			<ConfirmationModal isOpen={isExitModalOpen} onCancel={handleCancelExit} onConfirm={exitGame} />
		</>
	);
}
