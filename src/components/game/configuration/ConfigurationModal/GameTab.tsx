import { ThemeSwitcher } from "@/components/game/configuration/ThemeSwitcher";
import { type PracticeOrder, TIMER_DURATIONS, type TimerDuration } from "@/types/country";
import styles from "./GameTab.module.css";

interface GameTabProps {
	order: PracticeOrder;
	onOrderChange: (order: PracticeOrder) => void;
	timerDuration: TimerDuration;
	onTimerDurationChange: (duration: TimerDuration) => void;
}

export function GameTab({
	order,
	onOrderChange,
	timerDuration,
	onTimerDurationChange,
}: GameTabProps) {
	return (
		<div className={styles.gameTab}>
			<fieldset className={styles.fieldset}>
				<legend>Orden</legend>
				<div className={styles.optionGrid}>
					<label className={styles.option}>
						<input
							type="radio"
							name="settings-order"
							checked={order === "alphabetical"}
							onChange={() => onOrderChange("alphabetical")}
						/>
						<span>Alfabético</span>
					</label>
					<label className={styles.option}>
						<input
							type="radio"
							name="settings-order"
							checked={order === "random"}
							onChange={() => onOrderChange("random")}
						/>
						<span>Aleatorio</span>
					</label>
				</div>
			</fieldset>

			<fieldset className={styles.fieldset}>
				<legend>Temporizador</legend>
				<div className={styles.timerGrid}>
					{TIMER_DURATIONS.map((duration) => (
						<label className={styles.option} key={duration}>
							<input
								type="radio"
								name="settings-timer"
								checked={timerDuration === duration}
								onChange={() => onTimerDurationChange(duration)}
							/>
							<span>{duration}s</span>
						</label>
					))}
				</div>
			</fieldset>

			<fieldset className={styles.fieldset}>
				<legend>Tema</legend>
				<ThemeSwitcher />
			</fieldset>
		</div>
	);
}
