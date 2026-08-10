import { ThemeSwitcher } from "@/components/game/configuration/ThemeSwitcher";
import { Fieldset } from "@/components/ui/Fieldset";
import { OptionTile } from "@/components/ui/OptionTile";
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
			<Fieldset legend="Orden">
				<div className={styles.optionGrid}>
					<OptionTile
						name="settings-order"
						value="alphabetical"
						checked={order === "alphabetical"}
						onChange={() => onOrderChange("alphabetical")}
					>
						Alfabético
					</OptionTile>
					<OptionTile
						name="settings-order"
						value="random"
						checked={order === "random"}
						onChange={() => onOrderChange("random")}
					>
						Aleatorio
					</OptionTile>
				</div>
			</Fieldset>

			<Fieldset legend="Temporizador">
				<div className={styles.timerGrid}>
					{TIMER_DURATIONS.map((duration) => (
						<OptionTile
							key={duration}
							name="settings-timer"
							value={String(duration)}
							checked={timerDuration === duration}
							onChange={() => onTimerDurationChange(duration)}
						>
							{duration}s
						</OptionTile>
					))}
				</div>
			</Fieldset>

			<Fieldset legend="Tema">
				<ThemeSwitcher />
			</Fieldset>
		</div>
	);
}
