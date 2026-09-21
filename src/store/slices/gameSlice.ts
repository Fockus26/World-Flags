import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
	Country,
	GameConfiguration as GameConfigurationType,
	GameResult,
	GameType,
} from "@/types/country";

import type { UserLearningData } from "@/types/progress";

import { DEFAULT_DATA } from "@/utils/learning-storage";

/**
 * - `idle`: arranque; aún no se hidrató nada (el store tiene `DEFAULT_DATA`).
 * - `loading`: sincronizando con Supabase la cuenta autenticada.
 * - `local`: se muestran los datos de `localStorage` sin haberlos contrastado
 *   con la nube, por una de dos: Supabase Auth no resolvió en 2,5 s (sin
 *   confirmar aún de quién son, D042), o la sincronización de la cuenta falló
 *   o no respondió en 10 s (`GameEffects` la reintenta, D044). Se puede jugar,
 *   pero el push a Supabase, el ranking y los logros siguen bloqueados como
 *   en `idle`: subir esa copia pisaría el progreso de la cuenta.
 * - `ready`: los datos del usuario actual ya están en el store.
 */
export type HydrationStatus = "idle" | "loading" | "local" | "ready";

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
	/** Pegajoso: pasa a `true` la primera vez que llegan datos a la pantalla
	 *  (`local` o `ready`) y ya no vuelve atrás. Distingue la carga inicial
	 *  (skeleton) de las re-hidrataciones posteriores — un login, o la
	 *  sincronización que llega después del fallback `local` —, que
	 *  reemplazan los datos en el sitio en vez de volver al skeleton (D042). */
	hasHydratedOnce: boolean;
}

const initialState: GameState = {
	learningData: DEFAULT_DATA,
	activeGame: null,
	lastResult: null,
	dailyPracticeQueue: null,
	hydrationStatus: "idle",
	hasHydratedOnce: false,
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

			if (action.payload === "local" || action.payload === "ready") {
				state.hasHydratedOnce = true;
			}
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
