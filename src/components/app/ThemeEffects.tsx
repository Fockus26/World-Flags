import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSystemPrefersDark, setTheme, type ThemeMode } from "@/store/slices/themeSlice";

function isThemeMode(value: string | null): value is ThemeMode {
	return value === "light" || value === "dark" || value === "system";
}

export function ThemeEffects() {
	const dispatch = useAppDispatch();

	const theme = useAppSelector((state) => state.theme.theme);

	const systemPrefersDark = useAppSelector((state) => state.theme.systemPrefersDark);

	const resolvedTheme = theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

	useEffect(() => {
		const storedTheme = localStorage.getItem("theme");

		if (isThemeMode(storedTheme)) {
			dispatch(setTheme(storedTheme));
		}
	}, [dispatch]);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (event: MediaQueryListEvent) => {
			dispatch(setSystemPrefersDark(event.matches));
		};

		dispatch(setSystemPrefersDark(mediaQuery.matches));

		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, [dispatch]);

	useEffect(() => {
		document.documentElement.dataset.theme = resolvedTheme;
		localStorage.setItem("theme", theme);
	}, [resolvedTheme, theme]);

	return null;
}
