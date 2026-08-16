import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { AuthEffects } from "./AuthEffects";
import { GameEffects } from "./GameEffects";
import { ThemeEffects } from "./ThemeEffects";

export default function Providers({ children }: { children: ReactNode }) {
	return (
		<Provider store={store}>
			<ThemeEffects />
			<AuthEffects />
			<GameEffects />
			{children}
		</Provider>
	);
}
