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

/** Botón "?" enfocable: el texto de ayuda va en `aria-label` (lo oyen los
 *  lectores de pantalla al enfocar) y también en el tooltip visual para ratón. */
function HelpHint({ label }: { label: string }) {
	return (
		<Tooltip position="left" label={label}>
			<button
				type="button"
				aria-label={label}
				className="hidden md:inline-flex size-4 items-center justify-center rounded-full bg-surface-hover text-text-placeholder text-[0.625rem] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
			>
				<span aria-hidden="true">?</span>
			</button>
		</Tooltip>
	);
}

interface GameTabProps {
	mode: GameMode;
	onModeChange: (mode: GameMode) => void;
	order: PracticeOrder;
	onOrderChange: (order: PracticeOrder) => void;
	timerDuration: TimerDuration;
	onTimerDurationChange: (duration: TimerDuration) => void;
	timerEnabled: boolean;
	onTimerEnabledChange: (enabled: boolean) => void;
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
	timerEnabled,
	onTimerEnabledChange,
	difficulty,
	onDifficultyChange,
}: GameTabProps) {
	return (
		<div className="flex flex-col gap-5">
			<Fieldset
				legend={
					<span className="inline-flex items-center gap-2">
						Modo de juego
						<HelpHint label="Competitivo: a contrarreloj, se cronometra toda la sesión y se guarda tu mejor tiempo por continente; fallar o usar skip suma penalización de tiempo. Práctica: sin puntuación por tiempo, califica cada bandera para repasarla con repetición espaciada." />
					</span>
				}
			>
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

			{mode === "practice" && (
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
			)}

			{mode === "practice" && (
				<Fieldset legend="Temporizador">
					<div className="grid grid-cols-2 gap-1.5">
						<OptionTile
							name="settings-timer-enabled"
							value="off"
							checked={!timerEnabled}
							onChange={() => onTimerEnabledChange(false)}
						>
							Desactivado
						</OptionTile>
						<OptionTile
							name="settings-timer-enabled"
							value="on"
							checked={timerEnabled}
							onChange={() => onTimerEnabledChange(true)}
						>
							Activado
						</OptionTile>
					</div>

					{timerEnabled && (
						<div className="mt-1.5 flex gap-2">
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
					)}
				</Fieldset>
			)}

			{mode === "practice" && (
				<Fieldset
					legend={
						<span className="inline-flex items-center gap-2">
							Dificultad
							<HelpHint label="Fácil: acepta respuestas sin acentos (ej. 'mexico'). Difícil: exige los acentos exactos (ej. 'méxico')." />
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
			)}

			{mode === "competitive" && (
				<p className="m-0 text-[0.8rem] text-text-placeholder">
					En modo competitivo el orden es aleatorio y la dificultad es difícil
					siempre, para que el ranking compare partidas equivalentes.
				</p>
			)}

			<Fieldset legend="Tema">
				<ThemeSwitcher />
			</Fieldset>
		</div>
	);
}
