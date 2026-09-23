import { createSlice } from "@reduxjs/toolkit";

interface TutorialState {
	isOpen: boolean;
	/**
	 * Ya se decidió si ofrecerlo solo en esta carga. Impide que el recorrido
	 * vuelva a aparecer por su cuenta si `learningData` cambia de identidad
	 * más tarde (una re-hidratación, una sincronización que llega) — y que
	 * reaparezca justo después de cerrarlo, cuando la marca de "visto" ya está
	 * en `localStorage` pero el efecto vuelve a evaluarse.
	 */
	hasBeenOffered: boolean;
}

const initialState: TutorialState = {
	isOpen: false,
	hasBeenOffered: false,
};

/**
 * Estado EN PANTALLA de la partida guiada (D071): si está abierta y si ya se
 * ofreció en esta carga. Efímero a propósito, como `achievementToasts`: lo
 * único que se persiste del tutorial es la marca de "ya se ofreció en este
 * dispositivo", y vive en su clave propia de `localStorage` vía
 * `learning-storage.ts` (`getTutorialSeen`/`saveTutorialSeen`) — nunca en
 * `UserLearningData`.
 *
 * Está en Redux, y no en un estado local de `FlagGame`, porque quien lo vuelve
 * a abrir es el pie de "Perfil y configuración", varios niveles por debajo, y
 * el recorrido tiene que montarse por encima de toda la app.
 */
const tutorialSlice = createSlice({
	name: "tutorial",
	initialState,
	reducers: {
		/** Lo abre el usuario a mano (pie del modal de configuración). */
		openTutorial: (state) => {
			state.isOpen = true;
			state.hasBeenOffered = true;
		},

		/** Lo abre la app sola, la primera vez (ver `shouldOfferTutorial`). */
		offerTutorial: (state) => {
			state.isOpen = true;
			state.hasBeenOffered = true;
		},

		/** Se decidió no ofrecerlo en esta carga; no se vuelve a evaluar. */
		skipOfferingTutorial: (state) => {
			state.hasBeenOffered = true;
		},

		closeTutorial: (state) => {
			state.isOpen = false;
		},
	},
});

export const {
	openTutorial,
	offerTutorial,
	skipOfferingTutorial,
	closeTutorial,
} = tutorialSlice.actions;

export default tutorialSlice.reducer;
