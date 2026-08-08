import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { type GameResult, REGION_LABELS } from "@/types/country";
import {
	getScoreBackgroundColor,
	getScoreColor,
	getScoreMessage,
} from "@/utils/score";
import styles from "./Results.module.css";

type ScoreStyle = CSSProperties & {
	"--score-color": string;
	"--score-background": string;
};

interface ResultsProps {
	result: GameResult;
	onRestart: () => void;
	onExit: () => void;
}

export function Results({ result, onRestart, onExit }: ResultsProps) {
	const scoreStyle: ScoreStyle = {
		"--score-color": getScoreColor(result.score),
		"--score-background": getScoreBackgroundColor(result.score),
	};

	const percentage = Math.round(
		(result.correctAnswers / result.totalCountries) * 100,
	);

	return (
		<section className={styles.results}>
			<p className={styles.eyebrow}>Práctica terminada</p>

			<h1>{getScoreMessage(result.score)}</h1>

			<div className={styles.scoreCircle} style={scoreStyle}>
				<strong>{result.score}</strong>
				<span>/10</span>
			</div>

			<p className={styles.resultSummary}>
				Acertaste{" "}
				<strong>
					{result.correctAnswers} de {result.totalCountries}
				</strong>{" "}
				banderas, equivalente al {percentage}%.
			</p>

			{result.region !== "world" && (
				<p className={styles.savedMessage}>
					Esta calificación se guardó para{" "}
					<strong>{REGION_LABELS[result.region]}</strong>.
				</p>
			)}

			<div className={styles.resultActions}>
				<Button variant="secondary" type="button" onClick={onExit}>
					Volver al inicio
				</Button>

				<Button variant="primary" type="button" onClick={onRestart}>
					Repetir práctica
				</Button>
			</div>
		</section>
	);
}
