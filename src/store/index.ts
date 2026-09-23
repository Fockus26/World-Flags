import { configureStore } from "@reduxjs/toolkit";
import achievementToastsReducer from "./slices/achievementToastSlice";
import authReducer from "./slices/authSlice";
import gameReducer from "./slices/gameSlice";
import syncReducer from "./slices/syncSlice";
import themeReducer from "./slices/themeSlice";
import tutorialReducer from "./slices/tutorialSlice";

export const store = configureStore({
	reducer: {
		auth: authReducer,
		game: gameReducer,
		theme: themeReducer,
		// Efímero a propósito: avisos de logro en pantalla, no progreso
		// persistido. Ver el comentario en `slices/achievementToastSlice.ts`.
		achievementToasts: achievementToastsReducer,
		// Efímero: conexión y estado de la sincronización (D050).
		sync: syncReducer,
		// Efímero: la partida guiada en pantalla (D071). Lo único persistido
		// del tutorial es su marca de "visto", en `localStorage`.
		tutorial: tutorialReducer,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
