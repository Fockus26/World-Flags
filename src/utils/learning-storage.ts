import {
	DEFAULT_GAME_MODE,
	DEFAULT_SCOPE,
	DEFAULT_TIMER_DURATION,
	type GameConfiguration,
	type PracticeRegion,
	type PracticeScope,
	type Region,
} from "@/types/country";
import type {
	CountriesLearningHistory,
	ReviewGrade,
	ReviewState,
	UserLearningData,
	UserProfile,
} from "@/types/progress";
import { getLocalDateString } from "@/utils/date";
import { calculateNextReview, isDue } from "@/utils/spaced-repetition";

const STORAGE_KEY = "world-flags-learning-data";

export const MAX_REGION_GAMES = 3;

export const DEFAULT_PROFILE: UserProfile = {
	name: "Explorador",
	avatarStyle: "adventurer-neutral",
	avatarSeed: "explorer-1",
};

export const DEFAULT_DATA: UserLearningData = {
	profile: DEFAULT_PROFILE,
	countryHistory: {},
	regionGameScores: {},
	regionBestTimes: {},
	lastConfiguration: null,
	lastPracticeByCountry: {},
};

function migrateCountryHistory(
	history: CountriesLearningHistory | undefined,
): CountriesLearningHistory {
	if (!history) return {};

	return Object.fromEntries(
		Object.entries(history).map(([code, entry]) => [code, { review: entry.review ?? null }]),
	);
}

/** Configuraciones guardadas antes del scope combinable tenían `region` en vez de `scope`. */
function migrateConfiguration(
	configuration: (Partial<GameConfiguration> & { region?: PracticeRegion }) | null | undefined,
): GameConfiguration | null {
	if (!configuration) return null;

	const scope: PracticeScope =
		configuration.scope ??
		(configuration.region
			? configuration.region === "world"
				? { type: "world" }
				: { type: "custom", regions: [configuration.region], countryCodes: [] }
			: DEFAULT_SCOPE);

	return {
		scope,
		order: configuration.order ?? "alphabetical",
		timerDuration: configuration.timerDuration ?? DEFAULT_TIMER_DURATION,
		timerEnabled: configuration.timerEnabled ?? false,
		difficulty: configuration.difficulty ?? "hard",
		mode: configuration.mode ?? DEFAULT_GAME_MODE,
	};
}

export function createDefaultLearningData(): UserLearningData {
	return {
		profile: {
			...DEFAULT_PROFILE,
		},
		countryHistory: {},
		regionGameScores: {},
		regionBestTimes: {},
		lastConfiguration: null,
		lastPracticeByCountry: {},
	};
}

export function getLearningData(): UserLearningData {
	if (typeof window === "undefined") {
		return createDefaultLearningData();
	}

	try {
		const storedData = window.localStorage.getItem(STORAGE_KEY);

		if (!storedData) {
			return createDefaultLearningData();
		}

		const parsedData = JSON.parse(storedData) as Partial<UserLearningData>;

		return {
			profile: {
				...DEFAULT_PROFILE,
				...parsedData.profile,
			},
			countryHistory: migrateCountryHistory(parsedData.countryHistory),
			regionGameScores: parsedData.regionGameScores ?? {},
			regionBestTimes: parsedData.regionBestTimes ?? {},
			lastConfiguration: migrateConfiguration(parsedData.lastConfiguration),
			lastPracticeByCountry: parsedData.lastPracticeByCountry ?? {},
		};
	} catch {
		return createDefaultLearningData();
	}
}

export function hasLearningProgress(data: UserLearningData): boolean {
	const hasCountryHistory = Object.keys(data.countryHistory).length > 0;

	const hasRegionGameScores = Object.values(data.regionGameScores).some(
		(scores) => scores.length > 0,
	);

	return hasCountryHistory || hasRegionGameScores;
}

export function saveLearningData(data: UserLearningData): void {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearLearningData(): void {
	window.localStorage.removeItem(STORAGE_KEY);
}

export function saveUserProfile(
	currentData: UserLearningData,
	profile: UserProfile,
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		profile,
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function saveLastConfiguration(
	currentData: UserLearningData,
	configuration: GameConfiguration,
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		lastConfiguration: configuration,
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function updateLastConfiguration(
	currentData: UserLearningData,
	partial: Partial<GameConfiguration>,
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		lastConfiguration: {
			scope: currentData.lastConfiguration?.scope ?? DEFAULT_SCOPE,
			order: currentData.lastConfiguration?.order ?? "alphabetical",
			timerDuration: currentData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION,
			timerEnabled: currentData.lastConfiguration?.timerEnabled ?? false,
			difficulty: currentData.lastConfiguration?.difficulty ?? "hard",
			mode: currentData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE,
			...partial,
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function registerCountryAttempt(
	currentData: UserLearningData,
	countryCode: string,
	isCorrect: boolean,
): UserLearningData {
	return saveReviewResult(currentData, countryCode, isCorrect ? "good" : "again");
}

export function registerRegionGame(
	currentData: UserLearningData,
	region: Region,
	score: number,
): UserLearningData {
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

/** Modo competitivo ("rush"): guarda el tiempo solo si mejora la marca previa. */
export function registerRegionBestTime(
	currentData: UserLearningData,
	region: PracticeRegion,
	elapsedMs: number,
): UserLearningData {
	const previousBest = currentData.regionBestTimes[region];

	if (previousBest !== undefined && previousBest <= elapsedMs) {
		return currentData;
	}

	const updatedData: UserLearningData = {
		...currentData,
		regionBestTimes: {
			...currentData.regionBestTimes,
			[region]: elapsedMs,
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function hasPracticedCountryToday(
	data: UserLearningData,
	countryCode: string,
	today: string = getLocalDateString(),
): boolean {
	return data.lastPracticeByCountry[countryCode] === today;
}

/** De una lista de países pedida, cuáles NO se han practicado todavía hoy. */
export function getUnpracticedCodesToday(
	data: UserLearningData,
	countryCodes: readonly string[],
	today: string = getLocalDateString(),
): string[] {
	return countryCodes.filter((code) => data.lastPracticeByCountry[code] !== today);
}

export function registerCountryPracticed(
	currentData: UserLearningData,
	countryCode: string,
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		lastPracticeByCountry: {
			...currentData.lastPracticeByCountry,
			[countryCode]: getLocalDateString(),
		},
	};

	saveLearningData(updatedData);
	return updatedData;
}

export function isCountryLearned(review: ReviewState | null): boolean {
	return review !== null && review.repetitions > 0;
}

export function countLearnedCountries(history: CountriesLearningHistory): number {
	return Object.values(history).filter(({ review }) => isCountryLearned(review)).length;
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

export function calculateRegionAverage(scores: number[] | undefined): number | null {
	if (!scores?.length) {
		return null;
	}

	const total = scores.reduce((accumulator, score) => accumulator + score, 0);

	return Math.round((total / scores.length) * 10) / 10;
}

export function formatScore(score: number): string {
	return Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1);
}

/** Formatea milisegundos como "m:ss" (o "ss.d s" si dura menos de un minuto). */
/** Formatea milisegundos como "m:ss.cc" (minutos:segundos.centésimas), ej. 85590 -> "1:25.59". */
export function formatElapsedTime(elapsedMs: number): string {
	const totalHundredths = Math.round(elapsedMs / 10);
	const minutes = Math.floor(totalHundredths / 6000);
	const seconds = Math.floor((totalHundredths % 6000) / 100);
	const hundredths = totalHundredths % 100;

	return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function saveReviewResult(
	currentData: UserLearningData,
	countryCode: string,
	grade: ReviewGrade,
): UserLearningData {
	const previousReview = currentData.countryHistory[countryCode]?.review ?? null;

	const updatedData: UserLearningData = {
		...currentData,
		countryHistory: {
			...currentData.countryHistory,
			[countryCode]: { review: calculateNextReview(previousReview, grade) },
		},
	};

	saveLearningData(updatedData);
	return updatedData;
}

export function getDueCountries(history: CountriesLearningHistory): string[] {
	return Object.keys(history).filter((code) => isDue(history[code]?.review ?? null));
}
