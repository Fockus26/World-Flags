import { LogOut } from "iconoir-react";
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
			<header className="flex flex-wrap shrink-0 items-center justify-between gap-x-3 gap-y-2">
				<div className="min-w-0">
					<p className="m-0 truncate text-[0.65rem] font-extrabold uppercase tracking-wide text-primary sm:text-xs sm:tracking-widest">
						{regionLabel}
					</p>
					<p className="m-[0.2rem_0_0] text-base font-extrabold text-surface-soft sm:text-[clamp(1rem,2.5vh,1.3rem)]">
						{currentIndex + 1} / {totalCountries}
					</p>
				</div>

				<div className="flex shrink-0 items-center gap-4">
					{timeLeft !== undefined && timerDuration !== undefined && (
						<Timer timeLeft={timeLeft} totalDuration={timerDuration} />
					)}
					<Button
						variant="text"
						color="danger"
						type="button"
						onClick={onExit}
						aria-label="Abandonar"
						className="gap-2 px-2 sm:px-4"
					>
						<LogOut className="size-6 sm:hidden" aria-hidden="true" />
						<span className="hidden sm:inline">Abandonar</span>
					</Button>
				</div>
			</header>

			<div
				className="mt-[clamp(0.6rem,1.5vh,1rem)] h-2 shrink-0 overflow-hidden rounded-full bg-surface-hover"
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
