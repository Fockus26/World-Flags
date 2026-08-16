import { Button } from "@/components/ui/Button";
import { type GameResult, REGION_LABELS } from "@/types/country";
import { getScoreBackgroundColor, getScoreColor, getScoreMessage } from "@/utils/score";

interface ResultsProps {
	result: GameResult;
	onRestart: () => void;
	onExit: () => void;
}

export function Results({ result, onRestart, onExit }: ResultsProps) {
	const scoreColor = getScoreColor(result.score);
	const scoreBackground = getScoreBackgroundColor(result.score);

	const percentage = Math.round((result.correctAnswers / result.totalCountries) * 100);

	return (
		<section className="flex max-h-full w-[min(100%,38rem)] flex-col items-center overflow-auto rounded-2xl border border-border bg-surface p-4 text-center shadow-(--shadow-card) sm:p-[clamp(1.5rem,4vh,2.5rem)]">
			<p className="m-0 text-text-muted">Práctica terminada</p>

			<h1 className="my-[0.35rem] mb-2 text-[1.45rem] leading-[1.08] text-text sm:text-[clamp(1.65rem,4vh,2.75rem)]">
				{getScoreMessage(result.score)}
			</h1>

			<div
				className="my-4 flex size-26 shrink-0 place-items-center justify-center rounded-full border-[0.45rem] sm:my-6 sm:size-[clamp(7.5rem,20vw,9rem)]"
				style={{
					borderColor: scoreColor,
					backgroundColor: scoreBackground,
					color: scoreColor,
				}}
			>
				<strong className="text-[1.8rem] leading-none sm:text-[clamp(2rem,6vw,2.8rem)]">
					{result.score}
				</strong>
				<span className="mt-[-0.35rem] text-[0.9rem] font-bold">/10</span>
			</div>

			<p className="m-0 max-w-lg leading-[1.6] text-text-muted">
				Acertaste{" "}
				<strong>
					{result.correctAnswers} de {result.totalCountries}
				</strong>{" "}
				banderas, equivalente al {percentage}%.
			</p>

			{result.region !== "world" && (
				<p className="mt-3 mb-0 text-[0.9rem] text-text-subtle">
					Esta calificación se guardó para <strong>{REGION_LABELS[result.region]}</strong>
					.
				</p>
			)}

			<div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3 sm:mt-8">
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
