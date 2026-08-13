import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTheme, type ThemeMode } from "@/store/slices/themeSlice";

export type ResolvedTheme = "light" | "dark";

export function useTheme() {
	const dispatch = useAppDispatch();

	const theme = useAppSelector((state) => state.theme.theme);

	const systemPrefersDark = useAppSelector((state) => state.theme.systemPrefersDark);

	const resolvedTheme: ResolvedTheme =
		theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

	const changeTheme = (theme: ThemeMode) => {
		dispatch(setTheme(theme));
	};

	return {
		theme,
		resolvedTheme,
		setTheme: changeTheme,
	};
}
