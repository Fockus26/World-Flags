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
		<div className="flex flex-col gap-5">
			<Fieldset legend="Modo de juego">
				<div className="grid grid-cols-2 gap-1.5">
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
				<div className="grid grid-cols-2 gap-1.5">
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
					<div className="flex gap-2">
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
					<span className="inline-flex items-center gap-1">
						Dificultad
						<Tooltip
							position="left"
							label="Fácil: acepta respuestas sin acentos (ej. 'mexico'). Difícil: exige los acentos exactos (ej. 'méxico')."
						>
							<span
								className="inline-flex size-4 items-center justify-center rounded-full bg-surface-secondary text-text-subtle text-[0.625rem] font-extrabold"
								aria-hidden="true"
							>
								?
							</span>
						</Tooltip>
					</span>
				}
			>
				<div className="grid grid-cols-2 gap-1.5">
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
