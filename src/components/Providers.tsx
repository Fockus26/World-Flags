import type { ReactNode } from "react";
import { GameProvider } from "../context/GameContext";
import { ThemeProvider } from "../context/ThemeContext";

export default function Providers({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider>
			<GameProvider>{children}</GameProvider>
		</ThemeProvider>
	);
}
