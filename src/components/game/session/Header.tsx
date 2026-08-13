import { Button } from "@/components/ui/Button";
import { Timer } from "./Timer";

interface HeaderProps {
	regionLabel: string;
	currentIndex: number;
	totalCountries: number;
	timeLeft?: number;
	timerDuration?: number;
	onExit: () => void;
}

export function Header({
	regionLabel,
	currentIndex,
	totalCountries,
	timeLeft,
	timerDuration,
	onExit,
}: HeaderProps) {
	const progress = ((currentIndex + 1) / totalCountries) * 100;

	return (
		<>
			<header className="flex shrink-0 items-center justify-between gap-4">
				<div>
					<p className="m-0 text-xs font-extrabold uppercase tracking-widest text-primary">
						{regionLabel}
					</p>
					<p className="m-[0.2rem_0_0] text-[clamp(1rem,2.5vh,1.3rem)] font-extrabold text-text">
						{currentIndex + 1} / {totalCountries}
					</p>
				</div>

				{timeLeft !== undefined && timerDuration !== undefined && (
					<Timer timeLeft={timeLeft} totalDuration={timerDuration} />
				)}

				<Button variant="exit" type="button" onClick={onExit}>
					Abandonar
				</Button>
			</header>

			<div
				className="mt-[clamp(0.6rem,1.5vh,1rem)] h-2 shrink-0 overflow-hidden rounded-full bg-progress-bg"
				aria-hidden="true"
			>
				<div
					className="h-full rounded-[inherit] bg-primary transition-[width] duration-250 ease-in-out"
					style={{ width: `${progress}%` }}
				/>
			</div>
		</>
	);
}
