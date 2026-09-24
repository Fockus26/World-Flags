import type { ReactNode } from "react";
import { GAME_TYPE_LABELS, REGION_LABELS } from "@/types/country";
import { RUSH_PENALTY_SUMMARY } from "@/utils/rush-penalty";
import { TUTORIAL_REGION } from "@/utils/tutorial-sandbox";

/**
 * ⚠️ **TODO EL COPY DE ESTE ARCHIVO ES PROVISIONAL** — es el bloque de texto
 * nuevo más grande del proyecto y ninguna frase está aprobada.
 * `context/CONTENT_CHECKLIST.md` filas #24 (el guion) y #25 (los textos de
 * navegación y los nombres accesibles). El dueño aprueba el guion; hasta
 * entonces, nada de aquí es final.
 *
 * Lo que sí está fijado por el brief: el recorrido tiene que señalar los
 * distintos **modos de juego**, las **dificultades**, el **orden** y el
 * **temporizador**, y hacerlo alrededor de una partida que se juega de verdad
 * y que no cuenta para el progreso.
 */

/**
 * Qué añade cada paso además del texto:
 *
 * - `text`: solo explica.
 * - `mode`: los controles reales de modo de juego, sobre la configuración del
 *   sandbox.
 * - `practice-settings`: orden, dificultad y temporizador, también reales.
 * - `play`: la partida de ejemplo.
 * - `wrapup`: el cierre, con dónde queda todo esto en la app.
 */
export type TutorialStepKind =
	| "text"
	| "mode"
	| "practice-settings"
	| "play"
	| "wrapup";

export interface TutorialStep {
	id: string;
	title: string;
	kind: TutorialStepKind;
	body: ReactNode;
}

const DEMO_REGION_LABEL = REGION_LABELS[TUTORIAL_REGION];

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
	{
		id: "welcome",
		title: "Cómo se juega",
		kind: "text",
		body: (
			<>
				<p>
					Te lo enseño con una partida de ejemplo: {DEMO_REGION_LABEL}, tres
					países.
				</p>
				<p>
					<strong>Nada de lo que hagas aquí cuenta.</strong> No toca tu
					progreso, ni tu racha, ni tus mejores tiempos, ni el ranking. Puedes
					fallar todo a propósito.
				</p>
			</>
		),
	},
	{
		id: "games",
		title: "Tres juegos, tres progresos",
		kind: "text",
		body: (
			<>
				<p>
					<strong>{GAME_TYPE_LABELS.countries}</strong>: qué países hay en cada
					continente. Es con el que empiezas.
				</p>
				<p>
					<strong>{GAME_TYPE_LABELS.flags}</strong>: de qué país es cada
					bandera.
				</p>
				<p>
					<strong>{GAME_TYPE_LABELS.capitals}</strong>: cuál es la capital de
					cada país.
				</p>
				<p>
					Cada uno lleva su propia cuenta de lo que ya sabes, así que cambiar de
					juego no pierde nada.
				</p>
			</>
		),
	},
	{
		id: "mode",
		title: "Modo de juego",
		kind: "mode",
		body: (
			<>
				<p>
					En <strong>Práctica</strong> no hay reloj: respondes y luego dices lo
					difícil que te resultó. Con eso la app decide cuándo te lo vuelve a
					preguntar.
				</p>
				<p>
					En <strong>Competitivo</strong> es una carrera: se cronometra la
					partida entera (en Banderas y Capitales, {RUSH_PENALTY_SUMMARY}), y tu
					mejor tiempo de &laquo;Todo el mundo&raquo; entra en el ranking
					público.
				</p>
			</>
		),
	},
	{
		id: "practice-settings",
		title: "Orden, dificultad y temporizador",
		kind: "practice-settings",
		body: (
			<p>
				Estos tres ajustes son del modo Práctica. Cámbialos si quieres: la
				partida de ejemplo empieza con lo que dejes aquí.
			</p>
		),
	},
	{
		id: "play",
		title: `Practica ${DEMO_REGION_LABEL}`,
		kind: "play",
		body: (
			<p>
				Escribe el país que falta en el tablero. Si no te sale, tienes
				&laquo;Pista&raquo; para ir revelando letras.
			</p>
		),
	},
	{
		id: "wrapup",
		title: "Ya está",
		kind: "wrapup",
		body: (
			<>
				<p>
					Los ajustes que acabas de ver están en tu nombre, arriba a la
					izquierda, en la pestaña <strong>Juego</strong>.
				</p>
				<p>
					Cuando lleves unos días, te aparecerá <strong>Práctica diaria</strong>
					: solo lo que toca repasar hoy, de todos los continentes a la vez.
				</p>
				<p>
					Para volver a ver esto, en esa misma pantalla de ajustes, abajo:{" "}
					<strong>Cómo se juega</strong>.
				</p>
			</>
		),
	},
] as const;

/** ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #25). */
export const TUTORIAL_TEXTS = {
	dialogTitle: "Cómo se juega",
	skip: "Saltar tutorial",
	back: "Atrás",
	next: "Siguiente",
	startDemo: "Jugar el ejemplo",
	finish: "Empezar a jugar",
	/** Encima de la partida de ejemplo, siempre visible mientras se juega. */
	demoBanner: "Partida de ejemplo: no cuenta para tu progreso.",
	demoFinished: "Fin del ejemplo. Recuerda: no ha contado para tu progreso.",
	demoReplay: "Repetir el ejemplo",
	/**
	 * Sustituye al aviso de abandonar de siempre ("el progreso de esta partida
	 * se perderá"), que aquí sería falso: no había progreso que perder.
	 */
	demoExitDescription:
		"Es la partida de ejemplo: no se guarda nada, así que no pierdes nada. Puedes volver a jugarla.",
	/** `aria-label` del contador de pasos. */
	stepLabel: (current: number, total: number) => `Paso ${current} de ${total}`,
} as const;
