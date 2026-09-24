import { motion } from "framer-motion";
import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/game/session/ConfirmationModal";
import { useGame } from "@/hooks/useGame";
import { usePracticeQueue } from "@/hooks/usePracticeQueue";
import { motionVariants } from "@/styles/animations";
import {
	type AnswerStatus,
	DEFAULT_TIMER_DURATION,
	type Region,
} from "@/types/country";
import type { ReviewGrade } from "@/types/progress";
import { toGameView } from "@/utils/learning-storage";
import { getScopeLabel } from "@/utils/practice-scope";
import { calculateScore } from "@/utils/score";
import { playSound } from "@/utils/sound";
import { AnswerForm } from "./AnswerForm";
import { Header } from "./Header";
import {
	type CardGameType,
	isCardGameType,
	SESSION_CARDS,
} from "./session-cards";

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
	const {
		activeGame,
		learningData,
		exitGame,
		finishGame,
		attemptCountry,
		gradeCountryReview,
	} = useGame();

	const countries = activeGame?.countries ?? [];
	// `FlagGame` solo monta `Session` para los juegos de tarjeta (Países tiene
	// los suyos); el "flags" de respaldo es solo para que el tipo cierre.
	const configuredGameType = activeGame?.configuration.gameType;
	const gameType: CardGameType =
		configuredGameType !== undefined && isCardGameType(configuredGameType)
			? configuredGameType
			: "flags";
	const card = SESSION_CARDS[gameType];
	const timerDuration =
		activeGame?.configuration.timerDuration ?? DEFAULT_TIMER_DURATION;
	const isPracticeMode = activeGame?.configuration.mode === "practice";
	const isCompetitiveMode = activeGame?.configuration.mode === "competitive";
	const isTimedPractice =
		isPracticeMode && (activeGame?.configuration.timerEnabled ?? false);

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
	const skippedAnswersRef = useRef(0);
	const startTimeRef = useRef<number | null>(null);
	// El cronómetro se pausa mientras se muestra el resultado de una bandera
	// (antes de pasar a la siguiente) y mientras está abierto el modal de
	// abandonar, para que esas esperas no cuenten como tiempo de carrera.
	const isClockPausedRef = useRef(false);
	const exitModalOpenedAtRef = useRef<number | null>(null);
	// Código de la bandera a la que pertenece el `timeLeft` actual: al avanzar
	// de bandera, el efecto del cronómetro necesita reiniciar el conteo en el
	// mismo pase en el que detecta el cambio, antes de evaluar si expiró —
	// si no, lee el `timeLeft` viejo (0) de la bandera anterior y salta dos.
	const timerCodeRef = useRef<string | null>(null);
	// Qué admite la tarjeta actual: responderla ("idle") o calificarla
	// ("answered"). `answerStatus` no sirve de guarda: un manejador lee el
	// valor de su render, así que dos Enter seguidos, o dos pulsaciones de
	// 1-4, llegaban antes del siguiente render y respondían o calificaban dos
	// veces la misma tarjeta — en competitivo, el segundo Enter saltaba la
	// bandera siguiente. Un ref cambia al momento.
	const cardStepRef = useRef<"idle" | "answered">("idle");

	const practiceQueue = usePracticeQueue({
		initialCodes: countries.map((country) => country.code),
		// El historial del juego en curso: cada juego repasa lo suyo (D061).
		countryHistory: toGameView(learningData, gameType).countryHistory,
		onGrade: (code, grade, isFirstAttempt) =>
			gradeCountryReview(code, grade, gameType, isFirstAttempt),
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
				gameType,
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

	// El reloj arranca en TODOS los modos: `stats.totalTimePlayedMs` mide el
	// tiempo de práctica, no solo el de rush. Lo que sigue siendo exclusivo del
	// competitivo es mostrarlo, pausarlo y penalizarlo.
	useEffect(() => {
		if (startTimeRef.current === null) {
			startTimeRef.current = Date.now();
		}
	}, []);

	// Cronómetro del modo competitivo: corre desde que empieza la sesión hasta
	// que termina; las penalizaciones adelantan el "inicio" para que el
	// tiempo mostrado suba de golpe en vez de llevar un contador aparte.
	useEffect(() => {
		if (!isCompetitiveMode) return;
		const intervalId = window.setInterval(() => {
			if (startTimeRef.current !== null && !isClockPausedRef.current) {
				setElapsedMs(Date.now() - startTimeRef.current);
			}
		}, 100);
		return () => window.clearInterval(intervalId);
	}, [isCompetitiveMode]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: handleSkip estabilizado por React Compiler (ver docs/components.md)
	useEffect(() => {
		if (!isTimedPractice) return;
		if (answerStatus !== "idle") return;
		if (isExitModalOpen) return;

		// Bandera nueva: reinicia el conteo. Se calcula `effectiveTimeLeft` en
		// vez de depender de que el `setTimeLeft` dispare un re-render — si
		// `timeLeft` ya valía `timerDuration` (p. ej. la primerísima bandera,
		// que arranca con ese mismo valor de estado inicial), React no
		// renderiza de nuevo porque el valor no cambia, y este efecto nunca
		// volvería a correr para programar el `setTimeout` de abajo: el
		// cronómetro se quedaría congelado desde el inicio. Usar el valor
		// calculado también evita el problema original (leer el `timeLeft` de
		// la bandera anterior y disparar un segundo skip).
		const isNewCard = timerCodeRef.current !== practiceQueue.currentCode;
		if (isNewCard) {
			timerCodeRef.current = practiceQueue.currentCode;
			setTimeLeft(timerDuration);
		}
		const effectiveTimeLeft = isNewCard ? timerDuration : timeLeft;

		if (effectiveTimeLeft <= 0) {
			handleSkip();
			return;
		}
		const timeoutId = window.setTimeout(() => {
			setTimeLeft((currentValue) => currentValue - 1);
		}, 1000);
		return () => window.clearTimeout(timeoutId);
	}, [
		isTimedPractice,
		timerDuration,
		practiceQueue.currentCode,
		timeLeft,
		answerStatus,
		isExitModalOpen,
	]);

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

	// Partida sin ningún país que mostrar: `startGame` ya no arranca un scope
	// que no resuelve a ninguno, pero si llegara a pasar, de vuelta a la
	// configuración en vez de una pantalla en blanco sin "Salir". Con
	// `activeGame` a `null` (partida recién terminada, mostrando Resultados)
	// no hay que tocar nada: `exitGame` también borraría `lastResult`.
	const isEmptyGame = activeGame !== null && currentCountry === undefined;

	useEffect(() => {
		if (isEmptyGame) exitGame();
	}, [isEmptyGame, exitGame]);

	if (!activeGame || !currentCountry) {
		return null;
	}

	const { configuration } = activeGame;
	const scopeLabel = getScopeLabel(configuration.scope);

	function advanceCompetitive() {
		if (isLastCountry) {
			const finalElapsedMs =
				startTimeRef.current !== null
					? Date.now() - startTimeRef.current
					: elapsedMs;

			finishGame({
				mode: "competitive",
				gameType,
				// El rush de Banderas y el de Capitales recorren siempre el
				// alcance completo (no tienen botón "Rendirme"): a diferencia del
				// de Países, `completed` nunca es `false` aquí.
				completed: true,
				scope: configuration.scope,
				totalCountries: countries.length,
				// Se lee del ref, NO del estado `correctAnswers`: esta función
				// corre dentro del `setTimeout` de `pauseThenAdvance`, sobre la
				// closure del render anterior, así que el `setCorrectAnswers` de
				// la última bandera todavía no se vería y contaría uno de menos.
				correctAnswers: Object.values(firstAttemptResultsRef.current).filter(
					Boolean,
				).length,
				skippedAnswers: skippedAnswersRef.current,
				finishedAt: new Date().toISOString(),
				elapsedMs: finalElapsedMs,
			});
			return;
		}
		setCurrentIndex((currentValue) => currentValue + 1);
		setAnswer("");
		setAnswerStatus("idle");
		cardStepRef.current = "idle";
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
		if (
			!currentCountry ||
			cardStepRef.current !== "idle" ||
			answerStatus !== "idle" ||
			!answer.trim()
		) {
			return;
		}
		cardStepRef.current = "answered";
		const isCorrect = card.isCorrect(
			answer,
			currentCountry,
			configuration.difficulty,
		);

		// Suena lo mismo que se ve: el aviso de acierto o fallo (D083).
		playSound(isCorrect ? "correct" : "incorrect");

		if (configuration.mode === "competitive") {
			attemptCountry(currentCountry.code, isCorrect, gameType);
			// En competitivo cada bandera aparece una sola vez (avanza por
			// índice), así que el guard de `recordFirstAttempt` nunca salta.
			recordFirstAttempt(currentCountry.code, isCorrect);
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
		if (cardStepRef.current !== "answered") return;
		cardStepRef.current = "idle";
		practiceQueue.grade(grade);
		setIsSkipPending(false);
		setAnswer("");
		setAnswerStatus("idle");
	}

	function handleSkip() {
		if (
			!currentCountry ||
			cardStepRef.current !== "idle" ||
			answerStatus !== "idle"
		) {
			return;
		}
		cardStepRef.current = "answered";

		// Hasta ahora un skip era indistinguible de un fallo (ambos caían como
		// `false`); se cuenta aparte para los logros de "sin saltarse ninguna".
		skippedAnswersRef.current += 1;

		// Saltar se ve como un fallo en los dos modos (aviso rojo con la
		// respuesta) y suena como tal: en competitivo penaliza, y en práctica
		// se califica "otra vez" sola (D083). Vale también para el
		// temporizador de práctica que se agota.
		playSound("incorrect");

		if (configuration.mode === "competitive") {
			attemptCountry(currentCountry.code, false, gameType);
			recordFirstAttempt(currentCountry.code, false);
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
				className="flex h-[min(100%,45rem)] md:h-[min(100%,50rem)] max-h-full w-[min(100%,58rem)] flex-col overflow-hidden rounded-lg border border-surface-border bg-surface p-[0.85rem] min-[44rem]:rounded-2xl min-[44rem]:p-[clamp(1rem,2.5vh,2rem)]"
				variants={motionVariants.contentEnter}
				initial={false}
				animate="visible"
			>
				<Header
					regionLabel={scopeLabel}
					currentIndex={
						isPracticeMode ? practiceQueue.completedCount : currentIndex
					}
					totalCountries={
						isPracticeMode ? practiceQueue.totalCount : countries.length
					}
					timeLeft={isTimedPractice ? timeLeft : undefined}
					timerDuration={isTimedPractice ? timerDuration : undefined}
					elapsedMs={isCompetitiveMode ? elapsedMs : undefined}
					onExit={handleOpenExitModal}
				/>

				<div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-[0.65rem] min-[30rem]:gap-[clamp(0.75rem,2vh,1.5rem)]">
					{card.renderStimulus(currentCountry)}
					<AnswerForm
						countryName={card.getAnswer(currentCountry)}
						label={card.getQuestion(currentCountry)}
						placeholder={card.placeholder}
						answerNote={card.renderAnswerNote?.(currentCountry)}
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

			<ConfirmationModal
				isOpen={isExitModalOpen}
				onCancel={handleCancelExit}
				onConfirm={exitGame}
			/>
		</>
	);
}
