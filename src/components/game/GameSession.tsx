import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type FormEvent,
} from "react";
import {
	REGION_LABELS,
	type AnswerStatus,
	type Country,
	type GameResult,
	type PracticeRegion,
} from "../../types/country";
import { isCorrectAnswer } from "../../utils/normalize-answer";
import {
	calculateScore,
	getScoreBackgroundColor,
	getScoreColor,
	getScoreMessage,
} from "../../utils/score";
import { ConfirmationModal } from "./ConfirmationModal";
import styles from "./FlagGame.module.css";

interface GameSessionProps {
	countries: Country[];
	region: PracticeRegion;
	onExit: () => void;
	onFinish: (result: GameResult) => void;
    onCountryAttempt: (
	countryCode: string,
	isCorrect: boolean,
) => void;
}

interface ScoreStyle extends CSSProperties {
	"--score-color": string;
	"--score-background": string;
}

export function GameSession({
	countries,
	region,
	onExit,
	onFinish,
    onCountryAttempt
}: GameSessionProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answer, setAnswer] = useState("");
	const [answerStatus, setAnswerStatus] =
		useState<AnswerStatus>("idle");
	const [correctAnswers, setCorrectAnswers] = useState(0);
	const [isExitModalOpen, setIsExitModalOpen] =
		useState(false);

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

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

        onCountryAttempt(currentCountry.code, isCorrect);

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
            onFinish({
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
			<section className={styles.game}>
				<header className={styles.gameHeader}>
					<div>
						<p className={styles.eyebrow}>
							{REGION_LABELS[region]}
						</p>

						<p className={styles.progress}>
							{currentIndex + 1} / {countries.length}
						</p>
					</div>

					<button
						className={styles.exitButton}
						type="button"
						onClick={() => setIsExitModalOpen(true)}
					>
						Abandonar
					</button>
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
						<img
	                        key={currentCountry.code}
							className={styles.flag}
							src={flagUrl}
							alt="Bandera que debes identificar"
						/>
					</div>

					<form
						className={styles.answerForm}
						onSubmit={handleSubmit}
					>
						<label htmlFor="country-answer">
							¿Qué país representa esta bandera?
						</label>

						<input
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
							<button
	                            ref={nextButtonRef}
								className={styles.primaryButton}
								type="button"
								onClick={handleNextCountry}
							>
								{isLastCountry
									? "Ver resultado"
									: "Siguiente bandera"}
							</button>
						) : (
							<button
								className={styles.primaryButton}
								type="submit"
								disabled={!answer.trim()}
							>
								Comprobar
							</button>
						)}
					</form>
				</div>
			</section>

			<ConfirmationModal
				isOpen={isExitModalOpen}
				onCancel={() => setIsExitModalOpen(false)}
				onConfirm={onExit}
			/>
		</>
	);
}

interface GameResultsProps {
	result: GameResult;
	onRestart: () => void;
	onExit: () => void;
}

export function GameResults({
	result,
	onRestart,
	onExit,
}: GameResultsProps) {
	const scoreStyle: ScoreStyle = {
		"--score-color": getScoreColor(result.score),
		"--score-background": getScoreBackgroundColor(
			result.score,
		),
	};

	const percentage = Math.round(
		(result.correctAnswers / result.totalCountries) * 100,
	);

	return (
		<section className={styles.results}>
			<p className={styles.eyebrow}>
				Práctica terminada
			</p>

			<h1>{getScoreMessage(result.score)}</h1>

			<div
				className={styles.scoreCircle}
				style={scoreStyle}
			>
				<strong>{result.score}</strong>
				<span>/10</span>
			</div>

			<p className={styles.resultSummary}>
				Acertaste{" "}
				<strong>
					{result.correctAnswers} de{" "}
					{result.totalCountries}
				</strong>{" "}
				banderas, equivalente al {percentage}%.
			</p>

			{result.region !== "world" && (
				<p className={styles.savedMessage}>
					Esta calificación se guardó para{" "}
					<strong>
						{REGION_LABELS[result.region]}
					</strong>
					.
				</p>
			)}

			<div className={styles.resultActions}>
				<button
					className={styles.secondaryButton}
					type="button"
					onClick={onExit}
				>
					Volver al inicio
				</button>

				<button
					className={styles.primaryButton}
					type="button"
					onClick={onRestart}
				>
					Repetir práctica
				</button>
			</div>
		</section>
	);
}