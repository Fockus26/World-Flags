import type { ReactNode } from "react";
import {
	GAME_TYPE_LABELS,
	type GameType,
	REGION_LABELS,
} from "@/types/country";
import { RUSH_PENALTY_SUMMARY } from "@/utils/rush-penalty";
import { TUTORIAL_REGION } from "@/utils/tutorial-sandbox";

/**
 * El guion de la partida guiada. `context/CONTENT_CHECKLIST.md` filas #24 (el
 * guion) y #25 (los textos de navegación y los nombres accesibles), aprobadas
 * por el dueño el 2026-09-24.
 *
 * ⚠️ **Copy provisional (`CONTENT_CHECKLIST.md` #39)** lo que cambió en
 * `feat/tutorial-modo-de-juego` (D120–D122): el título y el texto del paso de
 * ajustes (ahora también se elige el juego), el cuerpo del paso de la partida
 * (que ahora dice que no cuenta y cómo se sale) con sus instrucciones por
 * juego, y el aviso de abandonar la partida de ejemplo.
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
	/**
	 * El texto del paso. Una función cuando depende del juego elegido para la
	 * partida de ejemplo (D121): las instrucciones de Países no sirven para
	 * Banderas ni Capitales.
	 */
	body: ReactNode | ((gameType: GameType) => ReactNode);
}

const DEMO_REGION_LABEL = REGION_LABELS[TUTORIAL_REGION];

/**
 * Qué hay que hacer en la partida de ejemplo, según el juego elegido (D121).
 * Un `Record` y no un ternario: un juego nuevo obliga a escribir el suyo
 * (D061). ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #39; el de Países es el
 * de siempre, #24).
 */
const DEMO_INSTRUCTIONS: Record<GameType, ReactNode> = {
	countries: (
		<>
			Escribe el país que falta en el tablero. Si no te sale, tienes
			&laquo;Pista&raquo; para ir revelando letras.
		</>
	),
	flags: (
		<>
			Escribe de qué país es cada bandera. Si no te sale, &laquo;Saltar&raquo;
			te enseña la respuesta.
		</>
	),
	capitals: (
		<>
			Escribe la capital de cada país. Si no te sale, &laquo;Saltar&raquo; te
			enseña la respuesta.
		</>
	),
};

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
	{
		id: "welcome",
		title: "Cómo se juega",
		kind: "text",
		body: (
			<>
				{/* Que la partida no cuenta se dice una sola vez, en el paso de la
				    partida, justo antes de empezarla (D122). */}
				<p>
					En unos pocos pasos: los juegos, los modos y los ajustes. Y antes de
					acabar juegas una partida corta de {DEMO_REGION_LABEL}, con tres
					países.
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
		// ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #39): título y texto.
		title: "Juego y ajustes",
		kind: "practice-settings",
		body: (
			<p>
				Elige a qué juego quieres jugar la partida del paso siguiente. Orden,
				dificultad y temporizador son los ajustes del modo Práctica: la partida
				empieza con lo que dejes aquí.
			</p>
		),
	},
	{
		id: "play",
		title: `Practica ${DEMO_REGION_LABEL}`,
		kind: "play",
		// ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #39). Es el único sitio
		// del recorrido que dice que la partida no cuenta (D122): mientras se
		// juega ya no hay aviso encima, así que se dice aquí, justo antes de
		// pulsar "Empezar la partida", junto a cómo se sale de ella.
		body: (gameType) => (
			<>
				<p>{DEMO_INSTRUCTIONS[gameType]}</p>
				<p>
					Es una partida de ejemplo: no cuenta para tu progreso, tu racha ni el
					ranking, así que puedes fallar sin miedo. Para dejarla a medias, pulsa
					&laquo;Abandonar&raquo;; con Escape cierras el recorrido.
				</p>
			</>
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
	startDemo: "Empezar la partida",
	finish: "Empezar a jugar",
	demoFinished: "Partida terminada: así es como se juega.",
	demoReplay: "Jugar otra vez",
	/**
	 * Sustituye al aviso de abandonar de siempre ("el progreso de esta partida
	 * se perderá"), que aquí sería falso: no había progreso que perder.
	 * Mientras se juega ya no hay aviso encima de la partida (D122), así que
	 * este texto recuerda que no se guarda nada, en la misma frase que dice a
	 * dónde se vuelve. ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #39).
	 */
	demoExitDescription:
		"Es la partida de ejemplo: no se guarda nada. Vuelves al recorrido y puedes empezarla otra vez cuando quieras.",
	/** `aria-label` del contador de pasos. */
	stepLabel: (current: number, total: number) => `Paso ${current} de ${total}`,
} as const;
