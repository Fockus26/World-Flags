import { countries } from "@/data/countries";
import { store } from "@/store";
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
import type { ReviewGrade, UserLearningData, UserProfile } from "@/types/progress";
import {
	getDueCountries,
	getUnpracticedCodesToday,
	hasPracticedCountryToday,
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

/**
 * Varias acciones seguidas (calificar una bandera y de paso marcarla como
 * practicada hoy, o calificar la última bandera y de paso cerrar la sesión)
 * pueden despachar más de un `setLearningData` en el mismo evento. Si cada
 * una arma su cambio sobre el `learningData` que quedó fijo en el closure de
 * este render, la última en despachar pisa a la anterior (setLearningData
 * reemplaza el slice entero, no lo mezcla). Por eso las funciones de acá
 * arman su cambio sobre el estado más reciente del store en ese instante,
 * no sobre el valor de `useAppSelector` de este render.
 */
function getCurrentLearningData(): UserLearningData {
	return store.getState().game.learningData;
}

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

	const isCountryPracticedToday = (countryCode: string) =>
		hasPracticedCountryToday(learningData, countryCode);

	const startGame = (configuration: GameConfigurationType): boolean => {
		let effectiveConfiguration = configuration;

		if (configuration.mode === "practice") {
			const requestedCodes = getScopeCountryCodes(countries, configuration.scope);
			const effectiveCodes = getUnpracticedCodesToday(
				getCurrentLearningData(),
				requestedCodes,
			);

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
		const updatedData = saveLastConfiguration(getCurrentLearningData(), configuration);

		dispatch(setLearningData(updatedData));

		dispatch(
			setActiveGame({
				configuration: effectiveConfiguration,
				countries: prepareCountries(countries, effectiveConfiguration),
			}),
		);

		return true;
	};

	const finishGame = (result: GameResult) => {
		dispatch(setLastResult(result));
		dispatch(setActiveGame(null));

		const region = getExactSingleRegion(result.scope);

		if (!region) {
			return;
		}

		const currentData = getCurrentLearningData();
		const updatedData =
			result.mode === "practice"
				? registerRegionGame(currentData, region, result.score)
				: registerRegionBestTime(currentData, region, result.elapsedMs);

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
		const updatedData = registerCountryAttempt(getCurrentLearningData(), countryCode, isCorrect);

		dispatch(setLearningData(updatedData));
	};

	/**
	 * `markPracticed` se resuelve en el mismo despacho (no en uno aparte):
	 * calificar la primera vez que aparece una bandera en la sesión también
	 * la marca como practicada hoy.
	 */
	const gradeCountryReview = (
		countryCode: string,
		grade: ReviewGrade,
		markPracticed = false,
	) => {
		let updatedData = saveReviewResult(getCurrentLearningData(), countryCode, grade);

		if (markPracticed) {
			updatedData = registerCountryPracticed(updatedData, countryCode);
		}

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
		const updatedData = saveUserProfile(getCurrentLearningData(), profile);

		dispatch(setLearningData(updatedData));
	};

	const updateSettings = (partial: Partial<GameConfigurationType>) => {
		const updatedData = updateLastConfiguration(getCurrentLearningData(), partial);

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
		getRegionPracticeProgress,
		isCountryPracticedToday,
	};
}
