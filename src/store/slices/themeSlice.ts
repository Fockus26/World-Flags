import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
	theme: ThemeMode;
	systemPrefersDark: boolean;
}

const initialState: ThemeState = {
	theme: "system",
	systemPrefersDark: false,
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
