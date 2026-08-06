import type { Region } from "./country";

export const AVATAR_STYLES = [
	"adventurer",
	"avataaars",
	"bottts",
	"lorelei",
	"thumbs",
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export interface UserProfile {
	name: string;
	avatarStyle: AvatarStyle;
	avatarSeed: string;
}

export interface CountryLearningHistory {
	attempts: boolean[];
}

export type CountriesLearningHistory = Record<
	string,
	CountryLearningHistory
>;

export type RegionGameScores = Partial<
	Record<Region, number[]>
>;

export interface UserLearningData {
	profile: UserProfile;
	countryHistory: CountriesLearningHistory;
	regionGameScores: RegionGameScores;
}