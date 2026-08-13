import { ThemeSwitcher } from "@/components/game/configuration/ThemeSwitcher";
import { Fieldset } from "@/components/ui/Fieldset";
import { OptionTile } from "@/components/ui/OptionTile";
import { Tooltip } from "@/components/ui/Tooltip";
import {
	type Difficulty,
	GAME_MODE_LABELS,
	GAME_MODES,
	type GameMode,
	type PracticeOrder,
	TIMER_DURATIONS,
	type TimerDuration,
} from "@/types/country";
import styles from "./GameTab.module.css";

interface GameTabProps {
	mode: GameMode;
	onModeChange: (mode: GameMode) => void;
	order: PracticeOrder;
	onOrderChange: (order: PracticeOrder) => void;
	timerDuration: TimerDuration;
	onTimerDurationChange: (duration: TimerDuration) => void;
	difficulty: Difficulty;
	onDifficultyChange: (difficulty: Difficulty) => void;
}

export function GameTab({
	mode,
	onModeChange,
	order,
	onOrderChange,
	timerDuration,
	onTimerDurationChange,
	difficulty,
	onDifficultyChange,
}: GameTabProps) {
	return (
		<div className={styles.gameTab}>
			<Fieldset legend="Modo de juego">
				<div className={styles.optionGrid}>
					{GAME_MODES.map((gameMode) => (
						<OptionTile
							key={gameMode}
							name="settings-mode"
							value={gameMode}
							checked={mode === gameMode}
							onChange={() => onModeChange(gameMode)}
						>
							{GAME_MODE_LABELS[gameMode]}
						</OptionTile>
					))}
				</div>
			</Fieldset>

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

			{mode === "competitive" && (
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
			)}

			<Fieldset
				legend={
					<span className={styles.legendWithTooltip}>
						Dificultad
						<Tooltip
							position="left"
							label="Fácil: acepta respuestas sin acentos (ej. 'mexico'). Difícil: exige los acentos exactos (ej. 'méxico')."
						>
							<span className={styles.infoIcon} aria-hidden="true">
								?
							</span>
						</Tooltip>
					</span>
				}
			>
				<div className={styles.optionGrid}>
					<OptionTile
						name="settings-difficulty"
						value="easy"
						checked={difficulty === "easy"}
						onChange={() => onDifficultyChange("easy")}
					>
						Fácil
					</OptionTile>
					<OptionTile
						name="settings-difficulty"
						value="hard"
						checked={difficulty === "hard"}
						onChange={() => onDifficultyChange("hard")}
					>
						Difícil
					</OptionTile>
				</div>
			</Fieldset>

			<Fieldset legend="Tema">
				<ThemeSwitcher />
			</Fieldset>
		</div>
	);
}
