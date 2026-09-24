import { ThemeSwitcher } from "@/components/game/configuration/ThemeSwitcher";
import { AutoHeight } from "@/components/ui/AutoHeight";
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
import { RUSH_PENALTY_SUMMARY } from "@/utils/rush-penalty";

/** Botón "?" enfocable: el texto de ayuda va en `aria-label` (lo oyen los
 *  lectores de pantalla al enfocar) y también en el tooltip visual para ratón. */
function HelpHint({ label }: { label: string }) {
	return (
		<Tooltip position="left" label={label}>
			<button
				type="button"
				aria-label={label}
				className="inline-flex size-5 items-center justify-center rounded-full bg-surface-hover text-text-placeholder text-[0.7rem] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface-soft"
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
						{/* ⚠️ Copy provisional — `CONTENT_CHECKLIST.md` #21 ("cada respuesta": vale para los tres juegos) y #26 (castigo, D075: el rush de Países no tiene). */}
						<HelpHint
							label={`Competitivo: contrarreloj, guarda tu mejor tiempo; en Banderas y Capitales ${RUSH_PENALTY_SUMMARY}. Práctica: sin cronómetro, calificas cada respuesta para repasarla.`}
						/>
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

			<AutoHeight show={mode === "practice"}>
				<div className="flex flex-col gap-5">
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

						<AutoHeight show={timerEnabled} className="mt-1.5">
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
						</AutoHeight>
					</Fieldset>

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
				</div>
			</AutoHeight>

			<AutoHeight show={mode === "competitive"}>
				<p className="m-0 text-[0.8rem] text-text-placeholder">
					En modo competitivo el orden es aleatorio y la dificultad es difícil
					siempre, para que el ranking compare partidas equivalentes.
				</p>
			</AutoHeight>

			<Fieldset legend="Tema">
				<ThemeSwitcher />
			</Fieldset>
		</div>
	);
}
