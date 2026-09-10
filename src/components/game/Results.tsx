import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import type { GameResult } from "@/types/country";
import { formatElapsedTime } from "@/utils/learning-storage";
import { getScopeLabel } from "@/utils/practice-scope";
import {
	getScoreBackgroundColor,
	getScoreColor,
	getScoreMessage,
} from "@/utils/score";

interface ResultsProps {
	result: GameResult;
	onRestart: () => void;
	onExit: () => void;
}

function CompetitiveResults({
	result,
}: {
	result: Extract<GameResult, { mode: "competitive" }>;
}) {
	return (
		<>
			<p className="m-0 text-text-placeholder">Rush terminado</p>

			<h1 className="my-[0.35rem] mb-2 text-[1.45rem] leading-[1.08] text-surface-soft sm:text-[clamp(1.65rem,4vh,2.75rem)]">
				¡Completado!
			</h1>

			<div className="my-4 flex h-26 w-auto min-w-26 shrink-0 flex-col place-items-center justify-center rounded-full border-[0.45rem] border-primary-border bg-primary-soft px-5 text-primary sm:my-6 sm:h-[clamp(7.5rem,20vw,9rem)] sm:min-w-[clamp(7.5rem,20vw,9rem)]">
				<strong className="text-[1.35rem] leading-none tabular-nums whitespace-nowrap sm:text-[clamp(1.5rem,4.2vw,2.1rem)]">
					{formatElapsedTime(result.elapsedMs)}
				</strong>
				<span className="mt-1 text-[0.7rem] font-bold">tiempo</span>
			</div>

			<p className="m-0 max-w-lg leading-[1.6] text-text-placeholder">
				Recorriste <strong>{result.totalCountries} banderas</strong> en{" "}
				<strong>{formatElapsedTime(result.elapsedMs)}</strong>.
			</p>
		</>
	);
}

function PracticeResults({
	result,
}: {
	result: Extract<GameResult, { mode: "practice" }>;
}) {
	const isDark = useTheme().resolvedTheme === "dark";
	const scoreColor = getScoreColor(result.score, isDark);
	const scoreBackground = getScoreBackgroundColor(result.score, isDark);
	const percentage = Math.round(
		(result.correctAnswers / result.totalCountries) * 100,
	);

	return (
		<>
			<p className="m-0 text-text-placeholder">Práctica terminada</p>

			<h1 className="my-[0.35rem] mb-2 text-[1.45rem] leading-[1.08] text-surface-soft sm:text-[clamp(1.65rem,4vh,2.75rem)]">
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

			<p className="m-0 max-w-lg leading-[1.6] text-text-placeholder">
				Acertaste{" "}
				<strong>
					{result.correctAnswers} de {result.totalCountries}
				</strong>{" "}
				banderas a la primera, equivalente al {percentage}%.
			</p>
		</>
	);
}

export function Results({ result, onRestart, onExit }: ResultsProps) {
	const scopeLabel = getScopeLabel(result.scope);

	return (
		<section className="flex max-h-full w-[min(100%,38rem)] flex-col items-center overflow-auto rounded-2xl border border-surface-border bg-surface p-4 text-center shadow-xl sm:p-[clamp(1.5rem,4vh,2.5rem)]">
			{result.mode === "competitive" ? (
				<CompetitiveResults result={result} />
			) : (
				<PracticeResults result={result} />
			)}

			{result.scope.type !== "world" && (
				<p className="mt-3 mb-0 text-[0.9rem] text-text-placeholder">
					Esto se guardó para <strong>{scopeLabel}</strong>.
				</p>
			)}

			<div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3 sm:mt-8">
				<Button color="neutral" type="button" onClick={onExit}>
					Volver al inicio
				</Button>

				<Button color="primary" type="button" onClick={onRestart}>
					Repetir práctica
				</Button>
			</div>
		</section>
	);
}
