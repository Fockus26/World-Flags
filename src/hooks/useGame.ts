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
	type GameType,
	type PracticeScope,
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
	fromGameView,
	getDueCountries,
	getUnpracticedCodesToday,
	hasPracticedCountryToday,
	registerCountryAttempt,
	registerCountryAttempts,
	registerCountryPracticed,
	registerRegionBestTime,
	registerRegionGame,
	registerSessionOutcome,
	saveLastConfiguration,
	saveReviewResult,
	saveUserProfile,
	toGameView,
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
		gameType: result.gameType,
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

	/** Cuántos países de esa región ya se practicaron hoy, de cuántos en total (para el `gameType` pedido). */
	const getRegionPracticeProgress = (region: Region, gameType: GameType) => {
		const regionCodes = countries.filter(
			(country) => country.region === region,
		);
		const unpracticed = getUnpracticedCodesToday(
			toGameView(learningData, gameType),
			regionCodes.map((country) => country.code),
		);

		return {
			practiced: regionCodes.length - unpracticed.length,
			total: regionCodes.length,
		};
	};

	const isCountryPracticedToday = (countryCode: string, gameType: GameType) =>
		hasPracticedCountryToday(toGameView(learningData, gameType), countryCode);

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
				toGameView(getCurrentLearningData(), configuration.gameType),
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
				id: crypto.randomUUID(),
				configuration: effectiveConfiguration,
				countries: prepareCountries(countries, effectiveConfiguration),
			}),
		);

		return true;
	};

	const finishGame = (result: GameResult) => {
		dispatch(setLastResult(result));
		dispatch(setActiveGame(null));

		const { gameType } = result;

		// El puntaje de práctica se actualiza para CADA continente que tuvo
		// países en la sesión (regionBreakdown), sin importar si el scope era
		// un solo continente, varios combinados, o países sueltos de cada uno.
		// El mejor tiempo del rush, en cambio, también aplica a "Todo el mundo"
		// (getScopeRegionKey) pero no se desglosa por continente.
		// El registro de la sesión va PRIMERO, antes de cualquier salida
		// temprana: un rush con scope mixto no tiene continente al que atribuir
		// la marca, pero la sesión igual ocurrió y cuenta para las estadísticas.
		// `sessionHistory`/`stats` son compartidos entre juegos, así que esto
		// opera sobre el objeto completo, no sobre una vista.
		// Todo se encadena sobre el mismo objeto y se despacha una sola vez
		// (ver el comentario de `getCurrentLearningData` arriba).
		let updatedData = registerSessionOutcome(
			getCurrentLearningData(),
			toSessionRecord(result),
		);

		if (result.mode === "practice") {
			let view = toGameView(updatedData, gameType);

			for (const [region, stats] of Object.entries(result.regionBreakdown) as [
				Region,
				{ correct: number; total: number },
			][]) {
				const score = calculateScore(stats.correct, stats.total);
				view = registerRegionGame(view, region, score);
			}

			updatedData = fromGameView(updatedData, view, gameType);

			// Un continente que ya se terminó de practicar hoy queda bloqueado
			// (candado "practicado hoy"), así que no tiene sentido dejarlo
			// seleccionado en la config: se deselecciona solo. Los países
			// sueltos elegidos a mano (scope.countryCodes) no se tocan.
			// `lastConfiguration` es compartido, pero el candado "practicado
			// hoy" que decide si queda algo pendiente es del `gameType` de
			// esta sesión.
			const lastScope = updatedData.lastConfiguration?.scope;
			if (lastScope?.type === "custom" && lastScope.regions.length > 0) {
				const viewForLock = toGameView(updatedData, gameType);
				const remainingRegions = lastScope.regions.filter((region) => {
					const regionCodes = countries
						.filter((country) => country.region === region)
						.map((country) => country.code);
					return (
						getUnpracticedCodesToday(viewForLock, regionCodes).length > 0
					);
				});

				if (remainingRegions.length !== lastScope.regions.length) {
					const nextScope: PracticeScope = {
						...lastScope,
						regions: remainingRegions,
					};
					updatedData = updateLastConfiguration(updatedData, {
						scope: nextScope,
					});
				}
			}
		} else {
			const region = getScopeRegionKey(result.scope);

			// El mejor tiempo solo se registra si el rush se completó al 100 %
			// (D033): un rush de Países abandonado a medio camino no debe
			// mejorar ni crear una marca.
			if (region && result.completed) {
				const view = registerRegionBestTime(
					toGameView(updatedData, gameType),
					region,
					result.elapsedMs,
				);
				updatedData = fromGameView(updatedData, view, gameType);
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
			// Del resultado, no de `lastConfiguration`: es el juego que
			// produjo esta partida, y es el que hay que repetir.
			gameType: lastResult.gameType,
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
	const attemptCountry = (
		countryCode: string,
		isCorrect: boolean,
		gameType: GameType,
	) => {
		const current = getCurrentLearningData();

		const view = touchActiveDay(
			registerCountryAttempt(
				toGameView(current, gameType),
				countryCode,
				isCorrect,
			),
		);

		dispatch(setLearningData(fromGameView(current, view, gameType)));
	};

	/**
	 * Igual que `attemptCountry`, pero para varios países a la vez con un
	 * solo despacho y un solo guardado en `localStorage` (ver
	 * `registerCountryAttempts` en `learning-storage.ts`, de
	 * `perf/batch-country-attempts`). Pensada para flujos que revelan/fallan
	 * muchos países de golpe por un solo evento del usuario — p. ej. el rush
	 * de países al rendirse — en vez de llamar a `attemptCountry` en un bucle.
	 */
	const attemptCountries = (
		codes: readonly string[],
		isCorrect: boolean,
		gameType: GameType,
	) => {
		if (codes.length === 0) return;

		const current = getCurrentLearningData();

		const view = touchActiveDay(
			registerCountryAttempts(
				toGameView(current, gameType),
				codes.map((countryCode) => ({ countryCode, isCorrect })),
			),
		);

		dispatch(setLearningData(fromGameView(current, view, gameType)));
	};

	/**
	 * `markPracticed` se resuelve en el mismo despacho (no en uno aparte):
	 * calificar la primera vez que aparece un país en la sesión también lo
	 * marca como practicado hoy.
	 */
	const gradeCountryReview = (
		countryCode: string,
		grade: ReviewGrade,
		gameType: GameType,
		markPracticed = false,
	) => {
		const current = getCurrentLearningData();

		let view = saveReviewResult(
			toGameView(current, gameType),
			countryCode,
			grade,
		);

		if (markPracticed) {
			view = registerCountryPracticed(view, countryCode);
		}

		dispatch(
			setLearningData(fromGameView(current, touchActiveDay(view), gameType)),
		);
	};

	const startDailyPractice = (gameType: GameType) => {
		const dueCodes = getDueCountries(
			toGameView(learningData, gameType).countryHistory,
		);

		dispatch(setDailyPracticeQueue({ gameType, codes: dueCodes }));
	};

	/** La práctica diaria sí completada: entra al historial y cierra la cola. */
	const finishDailyPractice = (summary: DailyPracticeSummary) => {
		// La cola ya se cerró para cuando esto corre en la mayoría de los
		// casos, pero el `gameType` con el que se abrió es el que corresponde
		// a este resumen — nunca el de la config actual, que pudo cambiar
		// mientras tanto en otra pestaña.
		const gameType: GameType = dailyPracticeQueue?.gameType ?? "flags";

		const updatedData = registerSessionOutcome(
			getCurrentLearningData(),
			createSessionRecord({
				finishedAt: new Date().toISOString(),
				mode: "daily",
				gameType,
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
		attemptCountries,
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
