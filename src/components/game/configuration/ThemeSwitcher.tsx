import { useTheme } from "@/context/ThemeContext";
import styles from "./ThemeSwitcher.module.css";

const themeOptions = [
	{ value: "light", icon: "☀️", label: "Claro" },
	{ value: "dark", icon: "🌙", label: "Oscuro" },
	{ value: "system", icon: "🖥️", label: "Sistema" },
] as const;

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();

	return (
		<fieldset className={styles.switcher} aria-label="Seleccionar tema">
			{themeOptions.map((option) => (
				<button
					key={option.value}
					type="button"
					className={`${styles.themeButton}${
						theme === option.value ? ` ${styles.themeButtonActive}` : ""
					}`}
					aria-pressed={theme === option.value}
					onClick={() => setTheme(option.value)}
				>
					<span aria-hidden="true">{option.icon}</span>
					<span>{option.label}</span>
				</button>
			))}
		</fieldset>
	);
}
