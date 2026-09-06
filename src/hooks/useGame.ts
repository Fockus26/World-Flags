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
	type Region,
} from "@/types/country";
import type { ReviewGrade, UserProfile } from "@/types/progress";
import {
	getDueCountries,
	getUnpracticedCodesToday,
	registerCountryAttempt,
	registerCountryPracticed,
	registerRegionBestTime,
	registerRegionGame,
	saveLastConfiguration,
	saveReviewResult,
	saveUserProfile,
	updateLastConfiguration,
} from "@/utils/learning-storage";
import { prepareCountries } from "@/utils/prepare-countries";
import { getExactSingleRegion, getScopeCountryCodes } from "@/utils/practice-scope";

export function useGame() {
	const dispatch = useAppDispatch();

	const learningData = useAppSelector((state) => state.game.learningData);

	const activeGame = useAppSelector((state) => state.game.activeGame);

	const lastResult = useAppSelector((state) => state.game.lastResult);

	const dailyPracticeQueue = useAppSelector((state) => state.game.dailyPracticeQueue);

	/** Cuántos países de esa región ya se practicaron hoy, de cuántos en total. */
	const getRegionPracticeProgress = (region: Region) => {
		const regionCodes = countries.filter((country) => country.region === region);
		const unpracticed = getUnpracticedCodesToday(
			learningData,
			regionCodes.map((country) => country.code),
		);

		return { practiced: regionCodes.length - unpracticed.length, total: regionCodes.length };
	};

	const startGame = (configuration: GameConfigurationType): boolean => {
		let effectiveConfiguration = configuration;

		if (configuration.mode === "practice") {
			const requestedCodes = getScopeCountryCodes(countries, configuration.scope);
			const effectiveCodes = getUnpracticedCodesToday(learningData, requestedCodes);

			if (effectiveCodes.length === 0) {
				return false;
			}

			// Algunos países ya se practicaron hoy (por esta u otra selección
			// que los incluía): se excluyen de esta sesión en vez de bloquearla.
			if (effectiveCodes.length !== requestedCodes.length) {
				effectiveConfiguration = {
					...configuration,
					scope: { type: "custom", regions: [], countryCodes: effectiveCodes },
				};
			}
		}

		dispatch(setLastResult(null));

		// Se recuerda la selección tal como la pidió el usuario (no la
		// recortada), para que la próxima vez vea marcado lo que eligió.
		const updatedData = saveLastConfiguration(learningData, configuration);

		dispatch(setLearningData(updatedData));

		dispatch(
			setActiveGame({
				configuration: effectiveConfiguration,
				countries: prepareCountries(countries, effectiveConfiguration),
			}),
		);

		return true;
	};

	const markCountryPracticed = (countryCode: string) => {
		const updatedData = registerCountryPracticed(learningData, countryCode);

		dispatch(setLearningData(updatedData));
	};

	const finishGame = (result: GameResult) => {
		dispatch(setLastResult(result));
		dispatch(setActiveGame(null));

		const region = getExactSingleRegion(result.scope);

		if (!region) {
			return;
		}

		const updatedData =
			result.mode === "practice"
				? registerRegionGame(learningData, region, result.score)
				: registerRegionBestTime(learningData, region, result.elapsedMs);

		dispatch(setLearningData(updatedData));
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
			scope: lastResult.scope,
			order: learningData.lastConfiguration?.order ?? "random",
			timerDuration: learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION,
			timerEnabled: learningData.lastConfiguration?.timerEnabled ?? false,
			difficulty: learningData.lastConfiguration?.difficulty ?? "hard",
			mode: learningData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE,
		});

		if (!started) {
			// Todos los países de esa selección ya se practicaron hoy: vuelve a
			// la configuración en vez de dejar al usuario en un callejón sin salida.
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
		markCountryPracticed,
		getRegionPracticeProgress,
	};
}
