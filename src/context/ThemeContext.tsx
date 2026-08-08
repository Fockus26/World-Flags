import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

type ThemeMode = "light" | "dark" | "system";

type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
	theme: ThemeMode;
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(
	undefined,
);

export function useTheme() {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}

	return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<ThemeMode>("system");
	const [systemPrefersDark, setSystemPrefersDark] =
		useState(false);

	useEffect(() => {
		const storedTheme = localStorage.getItem("theme") as
			| ThemeMode
			| null;

		if (
			storedTheme === "light" ||
			storedTheme === "dark" ||
			storedTheme === "system"
		) {
			setTheme(storedTheme);
			return;
		}

		const mediaQuery = window.matchMedia(
			"(prefers-color-scheme: dark)",
		);
		setSystemPrefersDark(mediaQuery.matches);
	}, []);

	useEffect(() => {
		const mediaQuery = window.matchMedia(
			"(prefers-color-scheme: dark)",
		);

		const handleChange = (event: MediaQueryListEvent) => {
			setSystemPrefersDark(event.matches);
		};

		setSystemPrefersDark(mediaQuery.matches);
		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, []);

	const resolvedTheme: ResolvedTheme =
		theme === "system"
			? systemPrefersDark
				? "dark"
				: "light"
			: theme;

	useEffect(() => {
		document.documentElement.dataset.theme = resolvedTheme;
		localStorage.setItem("theme", theme);
	}, [resolvedTheme, theme]);

	const value = { theme, resolvedTheme, setTheme };

	return (
		<ThemeContext.Provider value={value}>
			{children}
		</ThemeContext.Provider>
	);
}
