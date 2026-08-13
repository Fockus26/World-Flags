import type { GameConfiguration, Region } from "./country";

export const AVATAR_STYLES = ["adventurer", "avataaars", "bottts", "lorelei", "thumbs"] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

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
