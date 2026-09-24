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

/**
 * La capital de un país, para el modo Capitales (`data/capitals.ts`). Vive
 * aparte de `Country` a propósito (D063): el catálogo lo comparten los tres
 * juegos, y los alias y las notas son contenido solo de este.
 */
export interface Capital {
	/** Lo que se muestra al revelar o al fallar. */
	name: string;
	/** Otras respuestas que también valen (otras capitales del país, variantes documentadas). */
	accepted?: readonly string[];
	/** Frase breve al revelar: capitales múltiples o disputadas, cambios recientes. */
	note?: string;
}

export const GAME_MODES = ["competitive", "practice"] as const;
export type GameMode = (typeof GAME_MODES)[number];
export const DEFAULT_GAME_MODE: GameMode = "competitive";

export const GAME_MODE_LABELS: Record<GameMode, string> = {
	competitive: "Competitivo",
	practice: "Práctica",
};

/**
 * Qué se está aprendiendo: qué país pertenece a cada continente ("countries"),
 * qué bandera pertenece a cada país ("flags", el juego original) o cuál es la
 * capital de cada país ("capitals"). Este orden es también el orden en que se
 * muestran en el selector de la configuración: Países primero (D030), porque
 * aprender los países ayuda luego a ubicar sus banderas y sus capitales;
 * Capitales al final para no mover lo que ya existía (D066).
 */
export const GAME_TYPES = ["countries", "flags", "capitals"] as const;
export type GameType = (typeof GAME_TYPES)[number];
/** Un usuario nuevo arranca en Países (D030); uno con configuración vieja sin
 *  `gameType` se migra a "flags" en `migrateConfiguration`, no a este default. */
export const DEFAULT_GAME_TYPE: GameType = "countries";

export function isGameType(value: unknown): value is GameType {
	return (GAME_TYPES as readonly unknown[]).includes(value);
}

/**
 * El juego guardado en la configuración, o el de un usuario nuevo si este
 * cliente no lo conoce (D062). La configuración puede traer, por la nube, el
 * juego de una versión más nueva de la app: se conserva tal cual al guardar
 * (como los códigos de país de D040) y solo se sustituye al leerlo, aquí.
 */
export function resolveGameType(value: unknown): GameType {
	return isGameType(value) ? value : DEFAULT_GAME_TYPE;
}

/** ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #9 y #21). */
export const GAME_TYPE_LABELS: Record<GameType, string> = {
	countries: "Países",
	flags: "Banderas",
	capitals: "Capitales",
};

// Lo que cambia por juego en la UI vive en mapas como estos, no en ternarios
// repartidos por los componentes (D061): con `Record`, TypeScript obliga a
// rellenar un juego nuevo en todos ellos.

/** Título de la pantalla de configuración. ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #9 y #21). */
export const GAME_TYPE_TITLES: Record<GameType, string> = {
	countries: "Aprende los países del mundo",
	flags: "Aprende las banderas del mundo",
	capitals: "Aprende las capitales del mundo",
};

/** Qué se recorre en una partida, en plural ("Recorriste 45 países"). */
export const GAME_TYPE_NOUNS: Record<GameType, string> = {
	countries: "países",
	flags: "banderas",
	capitals: "capitales",
};

/**
 * Castigo del competitivo de Banderas y Capitales (D075): cada respuesta
 * incorrecta y cada salto suman este tiempo al cronómetro. El rush de Países
 * no tiene castigo (se completa o se rinde, D033). Cambiar estos números
 * cambia la regla: los tiempos dejan de ser comparables y hace falta una
 * clave nueva en `WORLD_BEST_TIME_KEYS` y en `LEADERBOARD_SCOPES` (D076).
 */
export const RUSH_WRONG_PENALTY_MS = 10_000;
export const RUSH_SKIP_PENALTY_MS = 20_000;

/**
 * Dónde se guarda en `regionBestTimes` el mejor tiempo de "Todo el mundo".
 * `"world"` es la de siempre; `"world@2"` la de la regla de castigo 2
 * (+10 s / +20 s, D075). La marca de versión va en la clave y no en un campo
 * aparte porque así un cliente viejo (el SW lo mantiene en caché) no puede
 * mezclar reglas: solo escribe en `"world"`, y las claves que no conoce las
 * conserva al normalizar y al fusionar (por el menor, clave a clave). Un
 * campo de versión suelto, en cambio, lo perdería o lo dejaría desfasado de
 * su tiempo (D076).
 */
export type WorldBestTimeKey = "world" | "world@2";

/** Todas las claves de "Todo el mundo", la vigente y las de reglas anteriores. */
export const WORLD_BEST_TIME_KEY_HISTORY: readonly WorldBestTimeKey[] = [
	"world",
	"world@2",
];

/**
 * La clave vigente de cada juego (D076). Países no cambió de regla: sigue en
 * `"world"`, con sus tiempos de siempre. En Banderas y Capitales, el `"world"`
 * viejo se queda en los datos (lo siguen escribiendo los clientes viejos),
 * pero ya no se muestra ni se sube al ranking.
 */
export const WORLD_BEST_TIME_KEYS: Record<GameType, WorldBestTimeKey> = {
	countries: "world",
	flags: "world@2",
	capitals: "world@2",
};

/**
 * Scope del ranking público de "Todo el mundo" en `leaderboard_entries`
 * (PK `(user_id, scope)`, sin migración por juego). Va a la par de
 * `WORLD_BEST_TIME_KEYS`: con la regla 2 (D076) Banderas y Capitales
 * estrenan scope, así el ranking empieza vacío y lo que siguen subiendo los
 * clientes viejos (a "world" y "capitals:world") cae donde ya nadie lee.
 */
export const LEADERBOARD_SCOPES: Record<GameType, string> = {
	countries: "countries:world",
	flags: "flags:world@2",
	capitals: "capitals:world@2",
};

/**
 * Qué se va a practicar en una sesión:
 * - "world": todos los países del catálogo (`countries.length`).
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
