export const DIFFICULTIES = ["easy", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DEFAULT_DIFFICULTY: Difficulty = "hard";

export const TIMER_DURATIONS = [5, 10, 15] as const;

export type TimerDuration = (typeof TIMER_DURATIONS)[number];

export const DEFAULT_TIMER_DURATION: TimerDuration = 10;

export const REGIONS = [
	"north-america",
	"central-america",
	"caribbean",
	"south-america",
	"europe",
	"oceania",
	"asia",
	"africa",
] as const;

export type Region = (typeof REGIONS)[number];

export type PracticeRegion = Region | "world";

export type PracticeOrder = "alphabetical" | "random";

export interface Country {
	code: string;
	name: string;
	region: Region;
}

export const GAME_MODES = ["competitive", "practice"] as const;
export type GameMode = (typeof GAME_MODES)[number];
export const DEFAULT_GAME_MODE: GameMode = "competitive";

export const GAME_MODE_LABELS: Record<GameMode, string> = {
	competitive: "Competitivo",
	practice: "Práctica",
};

/**
 * Qué se está aprendiendo: qué país pertenece a cada continente ("countries")
 * o qué bandera pertenece a cada país ("flags", el juego original). Este
 * orden es también el orden en que se muestran en el selector de la
 * configuración (D030): Países primero, porque aprender los países ayuda
 * luego a ubicar sus banderas.
 */
export const GAME_TYPES = ["countries", "flags"] as const;
export type GameType = (typeof GAME_TYPES)[number];
/** Un usuario nuevo arranca en Países (D030); uno con configuración vieja sin
 *  `gameType` se migra a "flags" en `migrateConfiguration`, no a este default. */
export const DEFAULT_GAME_TYPE: GameType = "countries";

export const GAME_TYPE_LABELS: Record<GameType, string> = {
	countries: "Países",
	flags: "Banderas",
};

/**
 * Qué se va a practicar en una sesión:
 * - "world": los 196 países.
 * - "custom": cero o más continentes completos (`regions`) más cero o más
 *   países sueltos elegidos a mano (`countryCodes`), de cualquier continente.
 *   Permite combinar varios continentes en una sesión y/o elegir solo un
 *   subconjunto de países de un continente en vez de todo el continente.
 */
export type PracticeScope =
	| { type: "world" }
	| { type: "custom"; regions: Region[]; countryCodes: string[] };

export const DEFAULT_SCOPE: PracticeScope = { type: "world" };

export interface GameConfiguration {
	scope: PracticeScope;
	order: PracticeOrder;
	timerDuration: TimerDuration;
	/** Solo aplica en modo práctica: el modo competitivo ya no usa temporizador por bandera. */
	timerEnabled: boolean;
	difficulty: Difficulty;
	mode: GameMode;
	gameType: GameType;
}

interface GameResultBase {
	scope: PracticeScope;
	gameType: GameType;
	totalCountries: number;
	/** Aciertos al primer intento. En competitivo cada bandera aparece una sola vez. */
	correctAnswers: number;
	skippedAnswers: number;
	/**
	 * Momento en que terminó la sesión (ISO). `Results` lo usa para saber qué
	 * logros se desbloquearon en ESTA sesión y no en una anterior.
	 */
	finishedAt: string;
	/**
	 * Duración de la sesión. En competitivo es el tiempo de carrera (ya incluye
	 * las penalizaciones por fallo y skip); en práctica es tiempo de reloj, y
	 * solo alimenta el total acumulado — no se muestra ni se compara.
	 */
	elapsedMs: number;
}

export interface PracticeGameResult extends GameResultBase {
	mode: "practice";
	score: number;
	/**
	 * Desglose por continente de los países de la sesión (independiente de
	 * cómo se armó el scope: continentes completos y/o países sueltos), para
	 * actualizar el puntaje de cada continente involucrado, no solo cuando el
	 * scope es exactamente un continente.
	 */
	regionBreakdown: Partial<Record<Region, { correct: number; total: number }>>;
}

/** Competitivo = "rush": se cronometra la sesión completa, no cada bandera. */
export interface CompetitiveGameResult extends GameResultBase {
	mode: "competitive";
	/**
	 * En Banderas siempre `true` (cada partida recorre el alcance completo).
	 * En el rush de Países puede terminar por rendición antes de encontrar
	 * todos los países: el mejor tiempo solo se registra cuando es `true`.
	 */
	completed: boolean;
}

export type GameResult = PracticeGameResult | CompetitiveGameResult;

export type AnswerStatus = "idle" | "correct" | "incorrect";

export type RegionScores = Partial<Record<Region, number>>;

export const REGION_LABELS: Record<PracticeRegion, string> = {
	world: "Todo el mundo",
	"north-america": "Norteamérica",
	"central-america": "Centroamérica",
	caribbean: "Caribe",
	"south-america": "Sudamérica",
	europe: "Europa",
	oceania: "Oceanía",
	asia: "Asia",
	africa: "África",
};
