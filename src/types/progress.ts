import type { GameConfiguration, Region } from "./country";

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

export interface UserLearningData {
	profile: UserProfile;
	countryHistory: CountriesLearningHistory;
	regionGameScores: RegionGameScores;
	lastConfiguration: GameConfiguration | null;
}
