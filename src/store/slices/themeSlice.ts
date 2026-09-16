import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
	theme: ThemeMode;
	systemPrefersDark: boolean;
}

/**
 * Se leen de una vez al crear el store, no en un efecto de React: si el
 * estado arrancara siempre en "system"/`false` y se corrigiera después vía
 * `dispatch`, un tema guardado explícito ("dark") que no coincide con el
 * `prefers-color-scheme` del sistema produciría un primer render (y
 * `document.documentElement.dataset.theme`) equivocado que se corrige un
 * instante después — el mismo parpadeo que el script bloqueante de
 * `Layout.astro` evita para el primer pintado, pero ahora dentro de React.
 * Este módulo solo lo importa el árbol cliente (`client:load`), nunca código
 * de build/SSR (`context/PROJECT_CONTEXT.md`: sin SSR), así que `window`
 * siempre existe en tiempo de ejecución — el guard es solo para no romper un
 * `import` en un contexto de análisis estático que no llegue a evaluarlo.
 */
function getStoredTheme(): ThemeMode {
	if (typeof window === "undefined") return "system";
	const stored = window.localStorage.getItem("theme");
	return stored === "light" || stored === "dark" ? stored : "system";
}

function getSystemPrefersDark(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const initialState: ThemeState = {
	theme: getStoredTheme(),
	systemPrefersDark: getSystemPrefersDark(),
};

const themeSlice = createSlice({
	name: "theme",
	initialState,
	reducers: {
		setTheme: (state, action: PayloadAction<ThemeMode>) => {
			state.theme = action.payload;
		},

		setSystemPrefersDark: (state, action: PayloadAction<boolean>) => {
			state.systemPrefersDark = action.payload;
		},
	},
});

export const { setTheme, setSystemPrefersDark } = themeSlice.actions;

export default themeSlice.reducer;
