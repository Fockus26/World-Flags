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

export interface UserLearningData {
	profile: UserProfile;
	countryHistory: CountriesLearningHistory;
	regionGameScores: RegionGameScores;
	regionBestTimes: RegionBestTimes;
	lastConfiguration: GameConfiguration | null;
	lastPracticeByCountry: LastPracticeByCountry;
}
