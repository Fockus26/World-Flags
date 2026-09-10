import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { AuthEffects } from "./AuthEffects";
import { GameEffects } from "./GameEffects";
import { ThemeEffects } from "./ThemeEffects";

export default function Providers({ children }: { children: ReactNode }) {
	return (
		<Provider store={store}>
			{/* `reducedMotion="user"` hace que framer-motion respete el ajuste
			    "reducir movimiento" del sistema (el bloque CSS de global.css solo
			    cubre transiciones/animaciones CSS, no las de framer). */}
			<MotionConfig reducedMotion="user">
				<ThemeEffects />
				<AuthEffects />
				<GameEffects />
				{children}
			</MotionConfig>
		</Provider>
	);
}
