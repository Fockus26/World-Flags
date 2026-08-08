import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { GameProvider } from "@/context/GameContext";
import { ThemeProvider } from "@/context/ThemeContext";

export default function Providers({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider>
			<AuthProvider>
				<GameProvider>{children}</GameProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}
