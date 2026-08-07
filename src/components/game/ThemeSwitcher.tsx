import { Select } from "../ui/Select";
import { useTheme } from "../../context/ThemeContext";
import styles from "./ThemeSwitcher.module.css";

const themeOptions = [
	{ value: "light", label: "☀️ Claro" },
	{ value: "dark", label: "🌙 Oscuro" },
	{ value: "system", label: "🖥️ Sistema" },
];

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();

	return (
		<div className={styles.switcher}>
			<label htmlFor="theme-select" className={styles.label}>
				Tema
			</label>
			<Select
				id="theme-select"
				value={theme}
				onChange={(event) =>
					setTheme(event.target.value as "light" | "dark" | "system")
				}
				options={themeOptions}
				aria-label="Seleccionar tema"
			/>
		</div>
	);
}
