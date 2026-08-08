import {
	DEFAULT_TIMER_DURATION,
	type GameConfiguration,
	type Region,
} from "@/types/country";
import type {
	CountriesLearningHistory,
	UserLearningData,
	UserProfile,
} from "@/types/progress";

const STORAGE_KEY = "world-flags-learning-data";
export const MAX_COUNTRY_ATTEMPTS = 3;
export const MAX_REGION_GAMES = 3;

const DEFAULT_PROFILE: UserProfile = {
	name: "Explorador",
	avatarStyle: "adventurer",
	avatarSeed: "explorer-1",
};

const DEFAULT_DATA: UserLearningData = {
	profile: DEFAULT_PROFILE,
	countryHistory: {},
	regionGameScores: {},
	lastConfiguration: null,
};

export function getLearningData(): UserLearningData {
	if (typeof window === "undefined") {
		return DEFAULT_DATA;
	}

	try {
		const storedData = window.localStorage.getItem(STORAGE_KEY);

		if (!storedData) {
			return DEFAULT_DATA;
		}

		const parsedData = JSON.parse(storedData) as Partial<UserLearningData>;

		return {
			profile: {
				...DEFAULT_PROFILE,
				...parsedData.profile,
			},
			countryHistory: parsedData.countryHistory ?? {},
			regionGameScores: parsedData.regionGameScores ?? {},
			lastConfiguration: parsedData.lastConfiguration ?? null,
		};
	} catch {
		return DEFAULT_DATA;
	}
}

export function saveLearningData(data: UserLearningData): void {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearLearningData(): void {
	window.localStorage.removeItem(STORAGE_KEY);
}

export function saveUserProfile(profile: UserProfile): UserLearningData {
	const currentData = getLearningData();

	const updatedData: UserLearningData = {
		...currentData,
		profile,
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function saveLastConfiguration(
	configuration: GameConfiguration,
): UserLearningData {
	const currentData = getLearningData();

	const updatedData: UserLearningData = {
		...currentData,
		lastConfiguration: configuration,
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function updateLastConfiguration(
	partial: Partial<GameConfiguration>,
): UserLearningData {
	const currentData = getLearningData();

	const updatedData: UserLearningData = {
		...currentData,
		lastConfiguration: {
			region: currentData.lastConfiguration?.region ?? "world",
			order: currentData.lastConfiguration?.order ?? "alphabetical",
			timerDuration:
				currentData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION,
			...partial,
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function registerCountryAttempt(
	countryCode: string,
	isCorrect: boolean,
): UserLearningData {
	const currentData = getLearningData();

	const previousAttempts =
		currentData.countryHistory[countryCode]?.attempts ?? [];

	const attempts = [...previousAttempts, isCorrect].slice(
		-MAX_COUNTRY_ATTEMPTS,
	);

	const updatedData: UserLearningData = {
		...currentData,
		countryHistory: {
			...currentData.countryHistory,
			[countryCode]: {
				attempts,
			},
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function registerRegionGame(
	region: Region,
	score: number,
): UserLearningData {
	const currentData = getLearningData();

	const previousScores = currentData.regionGameScores[region] ?? [];

	const regionScores = [...previousScores, score].slice(-MAX_REGION_GAMES);

	const updatedData: UserLearningData = {
		...currentData,
		regionGameScores: {
			...currentData.regionGameScores,
			[region]: regionScores,
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function isCountryLearned(attempts: boolean[]): boolean {
	return attempts.some(Boolean);
}

export function countLearnedCountries(
	history: CountriesLearningHistory,
): number {
	return Object.values(history).filter(({ attempts }) =>
		isCountryLearned(attempts),
	).length;
}

export function calculateLearningProgress(
	history: CountriesLearningHistory,
	totalCountries: number,
): number {
	if (totalCountries <= 0) {
		return 0;
	}

	const learnedCountries = countLearnedCountries(history);

	return Math.round((learnedCountries / totalCountries) * 100);
}

export function calculateRegionAverage(
	scores: number[] | undefined,
): number | null {
	if (!scores?.length) {
		return null;
	}

	const total = scores.reduce((accumulator, score) => accumulator + score, 0);

	return Math.round((total / scores.length) * 10) / 10;
}

export function formatScore(score: number): string {
	return Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1);
}
