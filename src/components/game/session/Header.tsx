import { Button } from "@/components/ui/Button";
import styles from "./Header.module.css";
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
	return (
		<>
			<header className={styles.header}>
				<div>
					<p className={styles.eyebrow}>{regionLabel}</p>
					<p className={styles.progress}>
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

			<div className={styles.progressBar} aria-hidden="true">
				<div
					className={styles.progressBarValue}
					style={{ width: `${((currentIndex + 1) / totalCountries) * 100}%` }}
				/>
			</div>
		</>
	);
}
