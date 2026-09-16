import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
	Country,
	GameConfiguration as GameConfigurationType,
	GameResult,
	GameType,
} from "@/types/country";

import type { UserLearningData } from "@/types/progress";

import { DEFAULT_DATA } from "@/utils/learning-storage";

export type HydrationStatus = "idle" | "loading" | "ready";

export interface ActiveGame {
	/** Identifica esta partida en particular (no la configuración): fuerza a
	 *  `Session` a remontar en `restartGame`, donde `mode`/`scope` pueden
	 *  quedar iguales a la partida anterior pero el progreso interno
	 *  (índice, racha, cronómetro) tiene que arrancar de cero. */
	id: string;
	configuration: GameConfigurationType;
	countries: Country[];
}

/** Cola de práctica diaria: guarda de qué juego son los códigos, para que
 *  `finishDailyPractice` registre la sesión en el juego correcto aunque la
 *  configuración visible cambie mientras la cola sigue abierta. */
export interface DailyPracticeQueue {
	gameType: GameType;
	codes: string[];
}

interface GameState {
	learningData: UserLearningData;
	activeGame: ActiveGame | null;
	lastResult: GameResult | null;
	dailyPracticeQueue: DailyPracticeQueue | null;
	hydrationStatus: HydrationStatus;
}

const initialState: GameState = {
	learningData: DEFAULT_DATA,
	activeGame: null,
	lastResult: null,
	dailyPracticeQueue: null,
	hydrationStatus: "idle",
};

const gameSlice = createSlice({
	name: "game",

	initialState,

	reducers: {
		setLearningData: (state, action: PayloadAction<UserLearningData>) => {
			state.learningData = action.payload;
		},

		setHydrationStatus: (state, action: PayloadAction<HydrationStatus>) => {
			state.hydrationStatus = action.payload;
		},

		setActiveGame: (state, action: PayloadAction<ActiveGame | null>) => {
			state.activeGame = action.payload;
		},

		setLastResult: (state, action: PayloadAction<GameResult | null>) => {
			state.lastResult = action.payload;
		},

		setDailyPracticeQueue: (
			state,
			action: PayloadAction<DailyPracticeQueue | null>,
		) => {
			state.dailyPracticeQueue = action.payload;
		},

		resetGameState: (state) => {
			state.activeGame = null;
			state.lastResult = null;
			state.dailyPracticeQueue = null;
		},
	},
});

export const {
	setLearningData,
	setHydrationStatus,
	setActiveGame,
	setLastResult,
	setDailyPracticeQueue,
	resetGameState,
} = gameSlice.actions;

export default gameSlice.reducer;
