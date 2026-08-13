import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { AuthProvider } from "@/context/AuthContext";
import { GameProvider } from "@/context/GameContext";
import { store } from "@/store";
import { ThemeEffects } from "./ThemeEffects";

export default function Providers({ children }: { children: ReactNode }) {
	return (
		<Provider store={store}>
			<ThemeEffects />

			<AuthProvider>
				<GameProvider>{children}</GameProvider>
			</AuthProvider>
		</Provider>
	);
}
