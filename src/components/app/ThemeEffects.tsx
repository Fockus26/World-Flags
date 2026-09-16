import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSystemPrefersDark } from "@/store/slices/themeSlice";

export function ThemeEffects() {
	const dispatch = useAppDispatch();

	const theme = useAppSelector((state) => state.theme.theme);

	const systemPrefersDark = useAppSelector(
		(state) => state.theme.systemPrefersDark,
	);

	const resolvedTheme =
		theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

	// Sin lectura inicial de `localStorage`/`matchMedia` aquí: el estado ya
	// arranca correcto desde `themeSlice` (ver el comentario ahí sobre por
	// qué evitarlo corta el parpadeo). Este efecto solo escucha CAMBIOS en
	// vivo del `prefers-color-scheme` mientras la app está abierta.
	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (event: MediaQueryListEvent) => {
			dispatch(setSystemPrefersDark(event.matches));
		};

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
