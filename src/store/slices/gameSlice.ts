import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
	Country,
	GameConfiguration as GameConfigurationType,
	GameResult,
} from "@/types/country";
import type { UserLearningData } from "@/types/progress";
import { getLearningData } from "@/utils/learning-storage";

export interface ActiveGame {
	configuration: GameConfigurationType;
	countries: Country[];
}

interface GameState {
	learningData: UserLearningData;
	activeGame: ActiveGame | null;
	lastResult: GameResult | null;
	dailyPracticeQueue: string[] | null;
}

const initialState: GameState = {
	learningData: getLearningData(),
	activeGame: null,
	lastResult: null,
	dailyPracticeQueue: null,
};

const gameSlice = createSlice({
	name: "game",
	initialState,
	reducers: {
		setLearningData: (state, action: PayloadAction<UserLearningData>) => {
			state.learningData = action.payload;
		},

		setActiveGame: (state, action: PayloadAction<ActiveGame | null>) => {
			state.activeGame = action.payload;
		},

		setLastResult: (state, action: PayloadAction<GameResult | null>) => {
			state.lastResult = action.payload;
		},

		setDailyPracticeQueue: (state, action: PayloadAction<string[] | null>) => {
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
	setActiveGame,
	setLastResult,
	setDailyPracticeQueue,
	resetGameState,
} = gameSlice.actions;

export default gameSlice.reducer;
