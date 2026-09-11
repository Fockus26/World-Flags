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
import type {
	ReviewGrade,
	SessionRecord,
	UserLearningData,
	UserProfile,
} from "@/types/progress";
import {
	createSessionRecord,
	getDueCountries,
	getUnpracticedCodesToday,
	hasPracticedCountryToday,
	registerCountryAttempt,
	registerCountryPracticed,
	registerRegionBestTime,
	registerRegionGame,
	registerSessionOutcome,
	saveLastConfiguration,
	saveReviewResult,
	saveUserProfile,
	touchActiveDay,
	updateLastConfiguration,
} from "@/utils/learning-storage";
import {
	getScopeCountryCodes,
	getScopeLabel,
	getScopeRegionKey,
} from "@/utils/practice-scope";
import { prepareCountries } from "@/utils/prepare-countries";
import { calculateScore } from "@/utils/score";

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

function toSessionRecord(result: GameResult): SessionRecord {
	return createSessionRecord({
		finishedAt: result.finishedAt,
		mode: result.mode,
		scopeKey: getScopeRegionKey(result.scope),
		scopeLabel: getScopeLabel(result.scope),
		totalCountries: result.totalCountries,
		correctAnswers: result.correctAnswers,
		skippedAnswers: result.skippedAnswers,
		score: result.mode === "practice" ? result.score : null,
		elapsedMs: result.elapsedMs,
	});
}

/** Lo que la práctica diaria aporta al historial: no tiene scope ni modo de juego. */
export interface DailyPracticeSummary {
	totalCountries: number;
	correctAnswers: number;
	elapsedMs: number;
}

export function useGame() {
	const dispatch = useAppDispatch();

	const learningData = useAppSelector((state) => state.game.learningData);

	const activeGame = useAppSelector((state) => state.game.activeGame);

	const lastResult = useAppSelector((state) => state.game.lastResult);

	const dailyPracticeQueue = useAppSelector(
		(state) => state.game.dailyPracticeQueue,
	);

	/** Cuántos países de esa región ya se practicaron hoy, de cuántos en total. */
	const getRegionPracticeProgress = (region: Region) => {
		const regionCodes = countries.filter(
			(country) => country.region === region,
		);
		const unpracticed = getUnpracticedCodesToday(
			learningData,
			regionCodes.map((country) => country.code),
		);

		return {
			practiced: regionCodes.length - unpracticed.length,
			total: regionCodes.length,
		};
	};

	const isCountryPracticedToday = (countryCode: string) =>
		hasPracticedCountryToday(learningData, countryCode);

	const startGame = (
		requestedConfiguration: GameConfigurationType,
	): boolean => {
		// El modo competitivo ("rush") siempre es difícil y aleatorio: no son
		// ajustables, así que se fuerzan acá sin importar qué haya quedado
		// guardado (incluida configuración vieja de antes de esta regla).
		const configuration: GameConfigurationType =
			requestedConfiguration.mode === "competitive"
				? { ...requestedConfiguration, order: "random", difficulty: "hard" }
				: requestedConfiguration;

		let effectiveConfiguration = configuration;

		if (configuration.mode === "practice") {
			const requestedCodes = getScopeCountryCodes(
				countries,
				configuration.scope,
			);
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
		const updatedData = saveLastConfiguration(
			getCurrentLearningData(),
			configuration,
		);

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

		// El puntaje de práctica se actualiza para CADA continente que tuvo
		// países en la sesión (regionBreakdown), sin importar si el scope era
		// un solo continente, varios combinados, o países sueltos de cada uno.
		// El mejor tiempo del rush, en cambio, también aplica a "Todo el mundo"
		// (getScopeRegionKey) pero no se desglosa por continente.
		// El registro de la sesión va PRIMERO, antes de cualquier salida
		// temprana: un rush con scope mixto no tiene continente al que atribuir
		// la marca, pero la sesión igual ocurrió y cuenta para las estadísticas.
		// Todo se encadena sobre el mismo objeto y se despacha una sola vez
		// (ver el comentario de `getCurrentLearningData` arriba).
		let updatedData = registerSessionOutcome(
			getCurrentLearningData(),
			toSessionRecord(result),
		);

		if (result.mode === "practice") {
			for (const [region, stats] of Object.entries(result.regionBreakdown) as [
				Region,
				{ correct: number; total: number },
			][]) {
				const score = calculateScore(stats.correct, stats.total);
				updatedData = registerRegionGame(updatedData, region, score);
			}
		} else {
			const region = getScopeRegionKey(result.scope);

			if (region) {
				updatedData = registerRegionBestTime(
					updatedData,
					region,
					result.elapsedMs,
				);
			}
		}

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
			timerDuration:
				learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION,
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

	/**
	 * El día se marca como activo aquí y en `gradeCountryReview`, no al terminar
	 * la sesión: quien responde veinte banderas y abandona practicó ese día
	 * igual, y así la racha funciona en los tres modos (incluida la práctica
	 * diaria, que no pasa por `finishGame`) sin escribir nada de más
	 * — `touchActiveDay` no toca los datos si hoy ya estaba marcado.
	 */
	const attemptCountry = (countryCode: string, isCorrect: boolean) => {
		const updatedData = touchActiveDay(
			registerCountryAttempt(getCurrentLearningData(), countryCode, isCorrect),
		);

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
		let updatedData = saveReviewResult(
			getCurrentLearningData(),
			countryCode,
			grade,
		);

		if (markPracticed) {
			updatedData = registerCountryPracticed(updatedData, countryCode);
		}

		dispatch(setLearningData(touchActiveDay(updatedData)));
	};

	const startDailyPractice = () => {
		const dueCodes = getDueCountries(learningData.countryHistory);

		dispatch(setDailyPracticeQueue(dueCodes));
	};

	/** La práctica diaria sí completada: entra al historial y cierra la cola. */
	const finishDailyPractice = (summary: DailyPracticeSummary) => {
		const updatedData = registerSessionOutcome(
			getCurrentLearningData(),
			createSessionRecord({
				finishedAt: new Date().toISOString(),
				mode: "daily",
				scopeKey: null,
				scopeLabel: "Práctica diaria",
				totalCountries: summary.totalCountries,
				correctAnswers: summary.correctAnswers,
				skippedAnswers: 0,
				score: null,
				elapsedMs: summary.elapsedMs,
			}),
		);

		dispatch(setLearningData(updatedData));
		dispatch(setDailyPracticeQueue(null));
	};

	/** Abandono: no cuenta como sesión completada (el día activo ya se marcó al calificar). */
	const exitDailyPractice = () => {
		dispatch(setDailyPracticeQueue(null));
	};

	const saveProfile = (profile: UserProfile) => {
		const updatedData = saveUserProfile(getCurrentLearningData(), profile);

		dispatch(setLearningData(updatedData));
	};

	const updateSettings = (partial: Partial<GameConfigurationType>) => {
		const updatedData = updateLastConfiguration(
			getCurrentLearningData(),
			partial,
		);

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
		finishDailyPractice,
		exitDailyPractice,
		saveProfile,
		updateSettings,
		getRegionPracticeProgress,
		isCountryPracticedToday,
	};
}
