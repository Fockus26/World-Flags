import { countries } from "@/data/countries";
import {
	type Country,
	DEFAULT_TIMER_DURATION,
	type GameConfiguration,
	type GameResult,
	type PracticeScope,
	type Region,
} from "@/types/country";
import type { UserLearningData } from "@/types/progress";
import { createDefaultLearningData } from "@/utils/learning-storage";
import { prepareCountries } from "@/utils/prepare-countries";

/**
 * La partida de ejemplo del tutorial (D071/D072), como estado **puro**: sin
 * React, sin Redux y —lo importante— sin una sola llamada a las funciones de
 * `learning-storage.ts` que escriben.
 *
 * Por qué vive aquí y no como un `flag` dentro de `useGame`: todo el flujo
 * normal de partida persiste (historial SRS, candado de "practicado hoy", nota
 * del continente, mejor tiempo y ranking público, estadísticas, historial de
 * sesiones, día activo de la racha y evaluación de logros), y encima
 * `GameEffects` sube `learningData` a Supabase con cada cambio. Una condición
 * colada en medio de ese flujo se olvida en el siguiente cambio y nadie se
 * entera: el progreso se mueve en silencio. Así que la partida guiada no pasa
 * por ahí en absoluto — corre sobre este estado, que no tiene forma de
 * escribir nada, y `tests/unit/tutorial-sandbox.test.ts` lo demuestra
 * comprobando que `localStorage` no recibe ni una escritura.
 */

/**
 * Los tres países del ejemplo **no están elegidos a dedo**: son Norteamérica
 * completa, el continente más pequeño del catálogo (Canadá, Estados Unidos y
 * México, `data/countries.ts`). Así la partida guiada es un alcance real del
 * juego, terminado de verdad, en vez de un recorte artificial de tres países
 * sueltos — y de paso son de los más reconocibles para el público en español,
 * que es el mercado de la app.
 */
export const TUTORIAL_REGION: Region = "north-america";

export const TUTORIAL_SCOPE: PracticeScope = {
	type: "custom",
	regions: [TUTORIAL_REGION],
	countryCodes: [],
};

/** Los países de la partida guiada, del catálogo real. */
export function getTutorialCountries() {
	return countries.filter((country) => country.region === TUTORIAL_REGION);
}

/**
 * Con lo que arranca la partida de ejemplo: Países en modo práctica (D030, el
 * juego con el que se encuentra un usuario nuevo), sin temporizador, en orden
 * alfabético y en fácil. Los pasos del recorrido dejan tocar el juego (Países,
 * Banderas o Capitales, D121), el orden, la dificultad y el temporizador antes
 * de jugar; el modo se explica pero la partida guiada
 * siempre es práctica (el competitivo es una carrera contra el reloj, no algo
 * que se aprenda con tres tarjetas).
 */
export const TUTORIAL_CONFIGURATION: GameConfiguration = {
	scope: TUTORIAL_SCOPE,
	order: "alphabetical",
	timerDuration: DEFAULT_TIMER_DURATION,
	timerEnabled: false,
	difficulty: "easy",
	mode: "practice",
	gameType: "countries",
};

export interface SandboxState {
	/** `null` mientras no se está jugando; identifica la partida para remontar. */
	gameId: string | null;
	configuration: GameConfiguration;
	/**
	 * Los países ya preparados (filtrados y ordenados) de la partida en curso.
	 * Se calculan **una vez, al empezar**, y no en cada render: con
	 * `order: "random"` (que el recorrido deja elegir) `prepareCountries` baraja
	 * con `Math.random`, así que recalcularlo por render reordenaría las
	 * tarjetas a mitad de partida.
	 */
	preparedCountries: Country[];
	/**
	 * Cuántas tarjetas se calificaron y cuántos intentos se registraron. No es
	 * progreso: es lo que deja al test comprobar que la partida guiada corrió
	 * de verdad y aun así no escribió nada.
	 */
	gradedCount: number;
	attemptedCount: number;
	/** El resultado de la partida guiada, para el paso de cierre. */
	result: GameResult | null;
}

function createGameId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createSandboxState(): SandboxState {
	return {
		gameId: null,
		configuration: TUTORIAL_CONFIGURATION,
		preparedCountries: [],
		gradedCount: 0,
		attemptedCount: 0,
		result: null,
	};
}

/** Cambia los ajustes que el recorrido deja tocar, antes de empezar a jugar. */
export function configureSandbox(
	state: SandboxState,
	partial: Partial<GameConfiguration>,
): SandboxState {
	return {
		...state,
		configuration: { ...state.configuration, ...partial },
	};
}

/** Arranca (o reinicia) la partida guiada con la configuración actual. */
export function startSandboxGame(state: SandboxState): SandboxState {
	return {
		...state,
		gameId: createGameId(),
		preparedCountries: prepareCountries(
			getTutorialCountries(),
			state.configuration,
		),
		gradedCount: 0,
		attemptedCount: 0,
		result: null,
	};
}

export function recordSandboxGrade(state: SandboxState): SandboxState {
	return { ...state, gradedCount: state.gradedCount + 1 };
}

export function recordSandboxAttempts(
	state: SandboxState,
	howMany: number,
): SandboxState {
	return { ...state, attemptedCount: state.attemptedCount + howMany };
}

/** La partida guiada terminó: se guarda el resultado para el cierre, nada más. */
export function finishSandboxGame(
	state: SandboxState,
	result: GameResult,
): SandboxState {
	return { ...state, gameId: null, preparedCountries: [], result };
}

/** Abandonar la partida guiada (botón "Salir" de la sesión). */
export function exitSandboxGame(state: SandboxState): SandboxState {
	return { ...state, gameId: null, preparedCountries: [], result: null };
}

/**
 * El progreso sobre el que juega la partida guiada: uno vacío, recién creado,
 * **nunca el del usuario**. Dos razones: la sesión no puede filtrar ni un dato
 * real (ni leerlo), y las tres tarjetas se comportan igual para todo el mundo
 * — sin historial SRS previo que cambie cuántas veces se repite una tarjeta.
 *
 * Se crea una sola vez por recorrido (el hook lo memoriza): la sesión compara
 * identidades de objeto en algún sitio y un objeto nuevo por render remontaría
 * cosas sin motivo.
 */
export function createSandboxLearningData(): UserLearningData {
	return createDefaultLearningData();
}
