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
}

interface GameResultBase {
	scope: PracticeScope;
	totalCountries: number;
}

export interface PracticeGameResult extends GameResultBase {
	mode: "practice";
	score: number;
	correctAnswers: number;
}

/** Competitivo = "rush": se cronometra la sesión completa, no cada bandera. */
export interface CompetitiveGameResult extends GameResultBase {
	mode: "competitive";
	elapsedMs: number;
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
