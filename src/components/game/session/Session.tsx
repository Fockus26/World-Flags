import { motion } from "framer-motion";
import { type SubmitEvent, useEffect, useState } from "react";
import { ConfirmationModal } from "@/components/game/session/ConfirmationModal";
import { useGame } from "@/context/GameContext";
import { motionVariants } from "@/styles/animations";
import {
	type AnswerStatus,
	DEFAULT_TIMER_DURATION,
	REGION_LABELS,
} from "@/types/country";
import { isCorrectAnswer } from "@/utils/normalize-answer";
import { calculateScore } from "@/utils/score";
import { AnswerForm } from "./AnswerForm";
import { FlagDisplay } from "./FlagDisplay";
import { Header } from "./Header";
import styles from "./Session.module.css";

export function Session() {
	const { activeGame, exitGame, finishGame, attemptCountry } = useGame();

	const countries = activeGame?.countries ?? [];
	const timerDuration =
		activeGame?.configuration.timerDuration ?? DEFAULT_TIMER_DURATION;

	const [currentIndex, setCurrentIndex] = useState(0);
	const [answer, setAnswer] = useState("");
	const [answerStatus, setAnswerStatus] = useState<AnswerStatus>("idle");
	const [correctAnswers, setCorrectAnswers] = useState(0);
	const [isExitModalOpen, setIsExitModalOpen] = useState(false);
	const [timeLeft, setTimeLeft] = useState<number>(timerDuration);

	const currentCountry = countries[currentIndex];
	const isLastCountry = currentIndex === countries.length - 1;

	// biome-ignore lint/correctness/useExhaustiveDependencies: currentIndex dispara el reset intencionalmente, su valor no se lee
	useEffect(() => {
		setTimeLeft(timerDuration);
	}, [currentIndex, timerDuration]);

	const handleTimeout = () => {
		if (!currentCountry || answerStatus !== "idle") {
			return;
		}
		attemptCountry(currentCountry.code, false);
		setAnswerStatus("incorrect");
	};

	useEffect(() => {
		if (answerStatus !== "idle") {
			return;
		}
		if (timeLeft <= 0) {
			handleTimeout();
			return;
		}
		const timeoutId = window.setTimeout(() => {
			setTimeLeft((currentValue) => currentValue - 1);
		}, 1000);
		return () => window.clearTimeout(timeoutId);
		// biome-ignore lint/correctness/useExhaustiveDependencies: handleTimeout ya está estabilizado por React Compiler (ver docs/components.md)
	}, [timeLeft, answerStatus, handleTimeout]);

	if (!activeGame || !currentCountry) {
		return null;
	}

	const { configuration } = activeGame;
	const region = configuration.region;

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!currentCountry || answerStatus !== "idle" || !answer.trim()) {
			return;
		}
		const isCorrect = isCorrectAnswer(answer, currentCountry.name);
		attemptCountry(currentCountry.code, isCorrect);
		setAnswerStatus(isCorrect ? "correct" : "incorrect");
		if (isCorrect) {
			setCorrectAnswers((currentValue) => currentValue + 1);
		}
	}

	function handleNextCountry() {
		if (isLastCountry) {
			finishGame({
				score: calculateScore(correctAnswers, countries.length),
				correctAnswers,
				totalCountries: countries.length,
				region,
			});
			return;
		}
		setCurrentIndex((currentValue) => currentValue + 1);
		setAnswer("");
		setAnswerStatus("idle");
	}

	return (
		<>
			<motion.section
				className={styles.game}
				variants={motionVariants.contentEnter}
				initial="hidden"
				animate="visible"
			>
				<Header
					regionLabel={REGION_LABELS[region]}
					currentIndex={currentIndex}
					totalCountries={countries.length}
					timeLeft={timeLeft}
					timerDuration={timerDuration}
					onExit={() => setIsExitModalOpen(true)}
				/>

				<div className={styles.gameContent}>
					<FlagDisplay countryCode={currentCountry.code} />
					<AnswerForm
						countryName={currentCountry.name}
						answer={answer}
						onAnswerChange={setAnswer}
						answerStatus={answerStatus}
						isLastCountry={isLastCountry}
						onSubmit={handleSubmit}
						onNext={handleNextCountry}
					/>
				</div>
			</motion.section>

			<ConfirmationModal
				isOpen={isExitModalOpen}
				onCancel={() => setIsExitModalOpen(false)}
				onConfirm={exitGame}
			/>
		</>
	);
}
