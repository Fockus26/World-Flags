import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AchievementToastItem {
	/** Identifica esta aparición del aviso — no el logro (uno solo se desbloquea una vez, pero necesita un id de instancia para poder quitarse de la cola). */
	instanceId: string;
	achievementId: string;
}

interface AchievementToastState {
	queue: AchievementToastItem[];
}

const initialState: AchievementToastState = {
	queue: [],
};

function createToastInstanceId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Cola de avisos de logro EN PANTALLA (snackbars). A propósito NO es parte de
 * `UserLearningData`: no se persiste, no se sincroniza, y se vacía al recargar
 * — son notificaciones efímeras de UI, no progreso del usuario. El progreso
 * real (qué logros están desbloqueados) sigue viviendo solo en
 * `game.learningData.achievements`; esta cola solo dice "cuáles hay que
 * anunciar todavía".
 */
const achievementToastSlice = createSlice({
	name: "achievementToasts",
	initialState,
	reducers: {
		enqueueAchievementToasts: (state, action: PayloadAction<string[]>) => {
			for (const achievementId of action.payload) {
				state.queue.push({
					instanceId: createToastInstanceId(),
					achievementId,
				});
			}
		},
		dismissAchievementToast: (state, action: PayloadAction<string>) => {
			state.queue = state.queue.filter(
				(item) => item.instanceId !== action.payload,
			);
		},
	},
});

export const { enqueueAchievementToasts, dismissAchievementToast } =
	achievementToastSlice.actions;

export default achievementToastSlice.reducer;
