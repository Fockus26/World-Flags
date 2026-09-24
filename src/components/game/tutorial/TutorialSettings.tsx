import { AutoHeight } from "@/components/ui/AutoHeight";
import { Fieldset } from "@/components/ui/Fieldset";
import { OptionTile } from "@/components/ui/OptionTile";
import {
	type Difficulty,
	GAME_MODE_LABELS,
	GAME_MODES,
	type GameConfiguration,
	type GameMode,
	type PracticeOrder,
	TIMER_DURATIONS,
	type TimerDuration,
} from "@/types/country";

interface TutorialSettingsProps {
	configuration: GameConfiguration;
	onChange: (partial: Partial<GameConfiguration>) => void;
}

/**
 * Los ajustes que enseña el recorrido, **de verdad y tocables** (D073), sobre
 * la configuración del sandbox: lo que se elija aquí es con lo que arranca la
 * partida de ejemplo, y no toca la configuración guardada del usuario.
 *
 * Por qué así y no abriendo "Perfil y configuración" y señalando sus controles
 * con un resaltado: las vistas del juego viven dentro del giro 3D de
 * `PageFlip`, que mantiene montada la vista anterior en su ranura oculta y
 * aplica `rotateY`/`perspective` al contenedor. Medir posiciones ahí dentro
 * (`getBoundingClientRect` sobre un elemento transformado en 3D, con un gemelo
 * del mismo marcado en la otra ranura) es frágil de una forma que no se nota
 * hasta que se rompe. Enseñar los controles en su sitio, funcionando, no
 * necesita medir nada — y el paso de cierre dice dónde viven en la app.
 *
 * Usa los mismos primitivos y las mismas constantes que `GameTab` (`GAME_MODES`,
 * `GAME_MODE_LABELS`, `TIMER_DURATIONS`), no una copia de sus etiquetas: añadir
 * un modo o una duración allí aparece aquí solo. Los `name` de los radios sí
 * son propios (`tutorial-*`), para no agruparse con los del modal si llegaran a
 * coexistir en el DOM.
 */
export function TutorialSettings({
	configuration,
	onChange,
}: TutorialSettingsProps) {
	return (
		<div className="flex flex-col gap-5">
			<Fieldset legend="Orden">
				<div className="grid grid-cols-2 gap-1.5">
					{(
						[
							["alphabetical", "Alfabético"],
							["random", "Aleatorio"],
						] as const satisfies readonly (readonly [PracticeOrder, string])[]
					).map(([value, label]) => (
						<OptionTile
							key={value}
							name="tutorial-order"
							value={value}
							checked={configuration.order === value}
							onChange={() => onChange({ order: value })}
						>
							{label}
						</OptionTile>
					))}
				</div>
			</Fieldset>

			<Fieldset legend="Dificultad">
				<div className="grid grid-cols-2 gap-1.5">
					{(
						[
							["easy", "Fácil"],
							["hard", "Difícil"],
						] as const satisfies readonly (readonly [Difficulty, string])[]
					).map(([value, label]) => (
						<OptionTile
							key={value}
							name="tutorial-difficulty"
							value={value}
							checked={configuration.difficulty === value}
							onChange={() => onChange({ difficulty: value })}
						>
							{label}
						</OptionTile>
					))}
				</div>
				{/* ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #24). Mismo criterio
				    que la ayuda "?" de `GameTab`, en texto porque aquí hay sitio. */}
				<p className="m-0 text-xs text-text-placeholder">
					En Fácil valen las respuestas sin acentos (&laquo;mexico&raquo;); en
					Difícil hay que escribirlos (&laquo;México&raquo;).
				</p>
			</Fieldset>

			<Fieldset legend="Temporizador">
				<div className="grid grid-cols-2 gap-1.5">
					<OptionTile
						name="tutorial-timer-enabled"
						value="off"
						checked={!configuration.timerEnabled}
						onChange={() => onChange({ timerEnabled: false })}
					>
						Desactivado
					</OptionTile>
					<OptionTile
						name="tutorial-timer-enabled"
						value="on"
						checked={configuration.timerEnabled}
						onChange={() => onChange({ timerEnabled: true })}
					>
						Activado
					</OptionTile>
				</div>

				<AutoHeight show={configuration.timerEnabled} className="mt-1.5">
					<div className="flex gap-2">
						{TIMER_DURATIONS.map((duration) => (
							<OptionTile
								key={duration}
								name="tutorial-timer"
								value={String(duration)}
								checked={configuration.timerDuration === duration}
								onChange={() =>
									onChange({ timerDuration: duration as TimerDuration })
								}
							>
								{duration}s
							</OptionTile>
						))}
					</div>
				</AutoHeight>

				{/* ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #24). */}
				<p className="m-0 text-xs text-text-placeholder">
					Con el temporizador encendido, cada tarjeta se salta sola si no
					respondes a tiempo.
				</p>
			</Fieldset>
		</div>
	);
}

interface TutorialModeChoiceProps {
	mode: GameMode;
	onChange: (mode: GameMode) => void;
}

/**
 * El selector de modo, aparte porque tiene su propio paso en el recorrido.
 *
 * La partida de ejemplo se juega **siempre en Práctica**: el competitivo es una
 * carrera contra el reloj con penalizaciones, y aprenderlo con tres tarjetas no
 * enseña nada. Elegir "Competitivo" aquí solo muestra qué implica — y lo dice,
 * en vez de prometer una carrera que luego no llega.
 */
export function TutorialModeChoice({
	mode,
	onChange,
}: TutorialModeChoiceProps) {
	return (
		<div className="flex flex-col gap-3">
			<Fieldset legend="Modo de juego">
				<div className="grid grid-cols-2 gap-1.5">
					{GAME_MODES.map((gameMode) => (
						<OptionTile
							key={gameMode}
							name="tutorial-mode"
							value={gameMode}
							checked={mode === gameMode}
							onChange={() => onChange(gameMode)}
						>
							{GAME_MODE_LABELS[gameMode]}
						</OptionTile>
					))}
				</div>
			</Fieldset>

			{/* ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #24). El aviso del
			    competitivo repite lo que dice `GameTab`: orden y dificultad no
			    son ajustables ahí, y el tutorial no puede prometer lo contrario. */}
			<AutoHeight show={mode === "competitive"}>
				<p className="m-0 text-xs text-text-placeholder">
					En Competitivo el orden es siempre aleatorio y la dificultad siempre
					difícil: no se ajustan, para que el ranking compare partidas
					equivalentes. La partida de este recorrido se juega en Práctica.
				</p>
			</AutoHeight>
		</div>
	);
}
