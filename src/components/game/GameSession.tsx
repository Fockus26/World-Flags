import {
	useEffect,
	useRef,
	useState,
	type SubmitEvent,
} from "react";
import { motion } from "framer-motion";
import { motionVariants } from "../../styles/animations";
import {
	REGION_LABELS,
	type AnswerStatus,
} from "../../types/country";
import { Timer } from "./Timer";
import { isCorrectAnswer } from "../../utils/normalize-answer";
import { calculateScore } from "../../utils/score";
import { useGame } from "../../context/GameContext";
import { ConfirmationModal } from "./ConfirmationModal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import styles from "./GameSession.module.css";

export function GameSession() {
	const {
		activeGame,
		exitGame,
		finishGame,
		attemptCountry,
	} = useGame();

	if (!activeGame) {
		return null;
	}

	const { countries, configuration } = activeGame;
	const region = configuration.region;
	const timerDuration = configuration.timerDuration;
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answer, setAnswer] = useState("");
	const [answerStatus, setAnswerStatus] =
		useState<AnswerStatus>("idle");
	const [correctAnswers, setCorrectAnswers] = useState(0);
	const [isExitModalOpen, setIsExitModalOpen] =
		useState(false);
	const [timeLeft, setTimeLeft] = useState<number>(timerDuration);

	const inputRef = useRef<HTMLInputElement>(null);
	const nextButtonRef = useRef<HTMLButtonElement>(null);

	const currentCountry = countries[currentIndex];
	const isAnswerChecked = answerStatus !== "idle";
	const isLastCountry =
		currentIndex === countries.length - 1;

	useEffect(() => {
        if (answerStatus === "idle") {
            inputRef.current?.focus();
            return;
        }

        nextButtonRef.current?.focus();
    }, [answerStatus, currentIndex]);

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
	}, [timeLeft, answerStatus, handleTimeout]);

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (
			!currentCountry ||
			isAnswerChecked ||
			!answer.trim()
		) {
			return;
		}

		const isCorrect = isCorrectAnswer(
			answer,
			currentCountry.name,
		);

		attemptCountry(currentCountry.code, isCorrect);

		setAnswerStatus(
			isCorrect ? "correct" : "incorrect",
		);

		if (isCorrect) {
			setCorrectAnswers(
				(currentValue) => currentValue + 1,
			);
		}
	}

	function handleNextCountry() {
        if (isLastCountry) {
            finishGame({
                score: calculateScore(
                    correctAnswers,
                    countries.length,
                ),
                correctAnswers,
                totalCountries: countries.length,
                region,
            });

            return;
        }

        setCurrentIndex(
            (currentValue) => currentValue + 1,
        );
        setAnswer("");
        setAnswerStatus("idle");
    }

	const flagUrl = `https://flagcdn.com/${currentCountry.code}.svg`;

	return (
		<>
			<motion.section
				className={styles.game}
				variants={motionVariants.contentEnter}
				initial="hidden"
				animate="visible"
			>
				<header className={styles.gameHeader}>
					<div>
						<p className={styles.eyebrow}>
							{REGION_LABELS[region]}
						</p>

						<p className={styles.progress}>
							{currentIndex + 1} / {countries.length}
						</p>
					</div>

					<Timer timeLeft={timeLeft} totalDuration={timerDuration} /> 

					<Button
						variant="exit"
						type="button"
						onClick={() => setIsExitModalOpen(true)}
					>
						Abandonar
					</Button>
				</header>

				<div
					className={styles.progressBar}
					aria-hidden="true"
				>
					<div
						className={styles.progressBarValue}
						style={{
							width: `${
								((currentIndex + 1) /
									countries.length) *
								100
							}%`,
						}}
					/>
				</div>

				<div className={styles.gameContent}>
					<div className={styles.flagContainer}>
						<motion.img
							key={currentCountry.code}
							className={styles.flag}
							src={flagUrl}
							alt="Bandera que debes identificar"
							variants={motionVariants.flagEnter}
							initial="hidden"
							animate="visible"
						/>
					</div>
				<form
					className={styles.answerForm}
					onSubmit={handleSubmit}
				>
					<label htmlFor="country-answer">
						¿Qué país representa esta bandera?
					</label>
					<Input
						ref={inputRef}
						id="country-answer"
						name="answer"
						type="text"
						value={answer}
						onChange={(event) =>
							setAnswer(event.target.value)
						}
						disabled={isAnswerChecked}
						autoComplete="off"
						spellCheck={false}
						placeholder="Escribe el nombre del país"
					/>
					<div className={styles.feedbackArea}>
						{answerStatus === "correct" && (
							<p
								className={
									styles.correctMessage
								}
							>
								Correcto:{" "}
								<strong>
									{currentCountry.name}
								</strong>
							</p>
						)}

						{answerStatus === "incorrect" && (
							<p
								className={
									styles.incorrectMessage
								}
							>
								La respuesta correcta es{" "}
								<strong>
									{currentCountry.name}
								</strong>
								.
							</p>
						)}
					</div>

					{isAnswerChecked ? (
						<Button
							ref={nextButtonRef}
							variant="primary"
							type="button"
							onClick={handleNextCountry}
						>
							{isLastCountry
								? "Ver resultado"
								: "Siguiente bandera"}
						</Button>
					) : (
						<Button
							variant="primary"
							type="submit"
							disabled={!answer.trim()}
						>
							Comprobar
						</Button>
					)}
					</form>
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


