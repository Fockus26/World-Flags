import type { GameConfiguration, PracticeRegion, Region } from "./country";

export const AVATAR_STYLES = [
	"adventurer-neutral",
	"fun-emoji",
	"bottts-neutral",
	"notionists-neutral",
	"voxel-art",
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export const AVATAR_STYLE_OPTIONS = AVATAR_STYLES.map((style) => ({
	value: style,
	label: style
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" "),
}));

export interface UserProfile {
	name: string;
	avatarStyle: AvatarStyle;
	avatarSeed: string;
}

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export interface ReviewState {
	dueDate: string;
	intervalDays: number;
	easeFactor: number;
	repetitions: number;
	lastReviewedAt: string;
}

export interface CountryLearningHistory {
	review: ReviewState | null;
}

export type CountriesLearningHistory = Record<string, CountryLearningHistory>;

export type RegionGameScores = Partial<Record<Region, number[]>>;

/** Mejor tiempo (ms) logrado en modo competitivo ("rush") por continente, o "world" para todo el mundo. */
export type RegionBestTimes = Partial<Record<PracticeRegion, number>>;

/** Última fecha (YYYY-MM-DD, hora local) en que se practicó cada país. */
export type LastPracticeByCountry = Partial<Record<string, string>>;

/** Sello de un logro desbloqueado. `seenAt` es null mientras no se haya mostrado. */
export interface AchievementUnlock {
	unlockedAt: string;
	seenAt: string | null;
}

/**
 * La clave es el id del logro, tipado como `string` a propósito y NO como
 * `AchievementId`: un cliente viejo (el service worker cachea agresivo) puede
 * leer una fila que ya trae logros de una versión más nueva. Si el
 * normalizador filtrara por los ids que este cliente conoce, los borraría en
 * el siguiente push — y con merge por unión, borrar es irreversible. Se
 * estrecha a `AchievementId` solo al buscar en el catálogo; los desconocidos
 * se ignoran en la UI y se conservan intactos en el almacenamiento.
 */
export type UnlockedAchievements = Record<string, AchievementUnlock>;

export type SessionMode = "practice" | "competitive" | "daily";

/**
 * Una sesión terminada. Es independiente de `GameResult` (que no cubre la
 * práctica diaria, sin scope ni modo de juego) y guarda la etiqueta del
 * alcance ya resuelta en vez del `PracticeScope` crudo: un scope con 60
 * códigos sueltos pesa más del doble por registro y no aporta nada que la
 * etiqueta y `scopeKey` no cubran.
 */
export interface SessionRecord {
	id: string;
	finishedAt: string;
	mode: SessionMode;
	/** Continente exacto o "world"; null en la práctica diaria y en scopes mixtos. */
	scopeKey: PracticeRegion | null;
	scopeLabel: string;
	totalCountries: number;
	correctAnswers: number;
	skippedAnswers: number;
	/** Solo en modo práctica (1-10). */
	score: number | null;
	elapsedMs: number | null;
}

export interface UserStats {
	totalSessions: number;
	totalAnswers: number;
	totalCorrect: number;
	totalSkips: number;
	perfectSessions: number;
	totalTimePlayedMs: number;
	/** Días con actividad (YYYY-MM-DD local), ordenados y sin repetir. */
	activeDays: string[];
	/** Sobrevive al truncado de `activeDays`, para logros de veteranía. */
	firstActiveDay: string | null;
}

export interface UserLearningData {
	profile: UserProfile;
	countryHistory: CountriesLearningHistory;
	regionGameScores: RegionGameScores;
	regionBestTimes: RegionBestTimes;
	lastConfiguration: GameConfiguration | null;
	lastPracticeByCountry: LastPracticeByCountry;
	achievements: UnlockedAchievements;
	stats: UserStats;
	sessionHistory: SessionRecord[];
}
