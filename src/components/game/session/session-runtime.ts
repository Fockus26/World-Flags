import type { ActiveGame } from "@/store/slices/gameSlice";
import type { GameResult, GameType } from "@/types/country";
import type { ReviewGrade, UserLearningData } from "@/types/progress";

/**
 * Todo lo que una pantalla de sesión necesita del exterior (D072): qué partida
 * se está jugando, sobre qué progreso, y a dónde van sus resultados. Nada más.
 *
 * Existe para que la **partida guiada del tutorial** pueda montar una sesión de
 * verdad sin tocar el progreso del usuario. El flujo normal persiste en cada
 * paso —historial SRS, candado de "practicado hoy", nota del continente, mejor
 * tiempo y ranking público, estadísticas, historial, día activo de la racha,
 * logros— y `GameEffects` sube `learningData` a Supabase con cada cambio; una
 * condición "si es el tutorial, no guardes" colada dentro de `useGame` se
 * olvidaría en el siguiente cambio sin que nada lo avise.
 *
 * Así que la dependencia se pasa desde fuera, explícita y obligatoria:
 * `FlagGame` inyecta el `useGame()` real (lo cumple tal cual, por estructura,
 * sin adaptador) y el tutorial inyecta su sandbox (`useSandboxRuntime`), que no
 * tiene forma de escribir en ningún sitio.
 *
 * Lo reciben `CountriesPractice` (Países) y `Session` (Banderas y Capitales,
 * D121): las dos pantallas que la partida guiada puede montar, según el juego
 * que se elija en el recorrido.
 *
 * **Si añades algo aquí**, pregúntate si escribe progreso: si lo hace, el
 * sandbox tiene que dejarlo en un no-op, y `tests/unit/tutorial-sandbox.test.ts`
 * está para que no se te pase.
 */
export interface SessionRuntime {
	activeGame: ActiveGame | null;
	/**
	 * Solo lectura. En la partida guiada es un progreso vacío recién creado, no
	 * el del usuario: así la sesión no puede ni leer datos reales.
	 */
	learningData: UserLearningData;
	exitGame: () => void;
	finishGame: (result: GameResult) => void;
	gradeCountryReview: (
		countryCode: string,
		grade: ReviewGrade,
		gameType: GameType,
		markPracticed?: boolean,
	) => void;
	/**
	 * Un intento del competitivo de Banderas y Capitales (`Session`). La
	 * partida guiada siempre es Práctica (D073) y no llega a llamarlo, pero el
	 * sandbox lo cumple igual —solo cuenta— para que el contrato no deje un
	 * hueco por donde colar el juego real.
	 */
	attemptCountry: (
		countryCode: string,
		isCorrect: boolean,
		gameType: GameType,
	) => void;
}
