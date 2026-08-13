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
} from "@/types/country";
import type { ReviewGrade, UserProfile } from "@/types/progress";
import {
	getDueCountries,
	registerCountryAttempt,
	registerRegionGame,
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

	const startGame = (configuration: GameConfigurationType) => {
		dispatch(setLastResult(null));

		const updatedData = saveLastConfiguration(configuration);

		dispatch(setLearningData(updatedData));

		dispatch(
			setActiveGame({
				configuration,
				countries: prepareCountries(countries, configuration),
			}),
		);
	};

	const finishGame = (result: GameResult) => {
		dispatch(setLastResult(result));
		dispatch(setActiveGame(null));

		if (result.region !== "world") {
			const updatedData = registerRegionGame(result.region, result.score);

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

		startGame({
			region: lastResult.region,
			order: learningData.lastConfiguration?.order ?? "random",
			timerDuration: learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION,
			difficulty: learningData.lastConfiguration?.difficulty ?? "hard",
			mode: learningData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE,
		});
	};

	const attemptCountry = (countryCode: string, isCorrect: boolean) => {
		const updatedData = registerCountryAttempt(countryCode, isCorrect);

		dispatch(setLearningData(updatedData));
	};

	const gradeCountryReview = (countryCode: string, grade: ReviewGrade) => {
		const updatedData = saveReviewResult(countryCode, grade);

		dispatch(setLearningData(updatedData));
	};

	const startDailyPractice = () => {
		const allCodes = countries.map((country) => country.code);

		const dueCodes = getDueCountries(learningData.countryHistory, allCodes);

		dispatch(setDailyPracticeQueue(dueCodes));
	};

	const exitDailyPractice = () => {
		dispatch(setDailyPracticeQueue(null));
	};

	const saveProfile = (profile: UserProfile) => {
		const updatedData = saveUserProfile(profile);

		dispatch(setLearningData(updatedData));
	};

	const updateSettings = (partial: Partial<GameConfigurationType>) => {
		const updatedData = updateLastConfiguration(partial);

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
	};
}
