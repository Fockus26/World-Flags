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

export interface GameConfiguration {
	region: PracticeRegion;
	order: PracticeOrder;
}

export interface GameResult {
	score: number;
	correctAnswers: number;
	totalCountries: number;
	region: PracticeRegion;
}

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