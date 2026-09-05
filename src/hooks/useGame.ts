import { countries } from "@/data/countries";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	setActiveGame,
	setDailyPracticeQueue,
	setLastResult,
	setLearningData,
} from "@/store/slices/gameSlice";
import {
	DEFAULT_GAME_MODE,
	DEFAULT_TIMER_DURATION,
	type GameConfiguration as GameConfigurationType,
	type GameResult,
	type PracticeRegion,
} from "@/types/country";
import type { ReviewGrade, UserProfile } from "@/types/progress";
import {
	getDueCountries,
	hasPracticedRegionToday,
	registerCountryAttempt,
	registerRegionGame,
	registerRegionPractice,
	saveLastConfiguration,
	saveReviewResult,
	saveUserProfile,
	updateLastConfiguration,
} from "@/utils/learning-storage";
import { prepareCountries } from "@/utils/prepare-countries";

export function useGame() {
	const dispatch = useAppDispatch();

	const learningData = useAppSelector((state) => state.game.learningData);

	const activeGame = useAppSelector((state) => state.game.activeGame);

	const lastResult = useAppSelector((state) => state.game.lastResult);

	const dailyPracticeQueue = useAppSelector((state) => state.game.dailyPracticeQueue);

	const isRegionPracticedToday = (region: PracticeRegion) =>
		hasPracticedRegionToday(learningData, region);

	const startGame = (configuration: GameConfigurationType): boolean => {
		if (configuration.mode === "practice" && isRegionPracticedToday(configuration.region)) {
			return false;
		}

		dispatch(setLastResult(null));

		const updatedData = saveLastConfiguration(learningData, configuration);

		dispatch(setLearningData(updatedData));

		dispatch(
			setActiveGame({
				configuration,
				countries: prepareCountries(countries, configuration),
			}),
		);

		return true;
	};

	const markRegionPracticed = (region: PracticeRegion) => {
		const updatedData = registerRegionPractice(learningData, region);

		dispatch(setLearningData(updatedData));
	};

	const finishGame = (result: GameResult) => {
		dispatch(setLastResult(result));
		dispatch(setActiveGame(null));

		if (result.region !== "world") {
			const updatedData = registerRegionGame(learningData, result.region, result.score);

			dispatch(setLearningData(updatedData));
		}
	};

	const exitGame = () => {
		dispatch(setActiveGame(null));
		dispatch(setLastResult(null));
	};

	const restartGame = () => {
		if (!lastResult) {
			return;
		}

		const started = startGame({
			region: lastResult.region,
			order: learningData.lastConfiguration?.order ?? "random",
			timerDuration: learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION,
			difficulty: learningData.lastConfiguration?.difficulty ?? "hard",
			mode: learningData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE,
		});

		if (!started) {
			// Región ya practicada hoy en modo práctica: vuelve a la configuración
			// en vez de dejar al usuario en una pantalla de resultados sin salida.
			exitGame();
		}
	};

	const attemptCountry = (countryCode: string, isCorrect: boolean) => {
		const updatedData = registerCountryAttempt(learningData, countryCode, isCorrect);

		dispatch(setLearningData(updatedData));
	};

	const gradeCountryReview = (countryCode: string, grade: ReviewGrade) => {
		const updatedData = saveReviewResult(learningData, countryCode, grade);

		dispatch(setLearningData(updatedData));
	};

	const startDailyPractice = () => {
		const dueCodes = getDueCountries(learningData.countryHistory);

		dispatch(setDailyPracticeQueue(dueCodes));
	};

	const exitDailyPractice = () => {
		dispatch(setDailyPracticeQueue(null));
	};

	const saveProfile = (profile: UserProfile) => {
		const updatedData = saveUserProfile(learningData, profile);

		dispatch(setLearningData(updatedData));
	};

	const updateSettings = (partial: Partial<GameConfigurationType>) => {
		const updatedData = updateLastConfiguration(learningData, partial);

		dispatch(setLearningData(updatedData));
	};

	return {
		learningData,
		activeGame,
		lastResult,
		dailyPracticeQueue,
		startGame,
		finishGame,
		exitGame,
		restartGame,
		attemptCountry,
		gradeCountryReview,
		startDailyPractice,
		exitDailyPractice,
		saveProfile,
		updateSettings,
		isRegionPracticedToday,
		markRegionPracticed,
	};
}
