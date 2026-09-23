import { useMemo, useState } from "react";
import type { SessionRuntime } from "@/components/game/session/session-runtime";
import type { GameConfiguration, GameResult } from "@/types/country";
import {
	configureSandbox,
	createSandboxLearningData,
	createSandboxState,
	exitSandboxGame,
	finishSandboxGame,
	recordSandboxGrade,
	type SandboxState,
	startSandboxGame,
} from "@/utils/tutorial-sandbox";

export interface SandboxRuntime {
	/** Lo que se le pasa a la pantalla de sesión. */
	runtime: SessionRuntime;
	state: SandboxState;
	/** Cambia orden / dificultad / temporizador / modo antes de jugar. */
	configure: (partial: Partial<GameConfiguration>) => void;
	start: () => void;
}

/**
 * La partida de ejemplo del tutorial, montada como un `SessionRuntime`
 * completo pero sin ninguna salida hacia el progreso del usuario (D072).
 *
 * Todas las escrituras del flujo normal se quedan aquí dentro: `finishGame`
 * guarda el resultado para el paso de cierre y `gradeCountryReview` solo
 * cuenta cuántas tarjetas se calificaron. Nada llama a `learning-storage.ts`,
 * nada despacha `setLearningData`, y por lo tanto `GameEffects` no ve un solo
 * cambio: ni sube nada a Supabase, ni mueve la racha, ni el candado diario, ni
 * los logros, ni el ranking. `tests/unit/tutorial-sandbox.test.ts` lo
 * comprueba contando las escrituras a `localStorage`.
 */
export function useSandboxRuntime(): SandboxRuntime {
	const [state, setState] = useState(createSandboxState);

	// Una sola vez por recorrido: la sesión compara identidades de objeto para
	// decidir si remontar, y un progreso nuevo en cada render la reiniciaría.
	const learningData = useMemo(createSandboxLearningData, []);

	const runtime: SessionRuntime = {
		activeGame:
			state.gameId === null
				? null
				: {
						id: state.gameId,
						configuration: state.configuration,
						countries: state.preparedCountries,
					},

		learningData,

		exitGame: () => setState(exitSandboxGame),

		finishGame: (result: GameResult) =>
			setState((current) => finishSandboxGame(current, result)),

		gradeCountryReview: () => setState(recordSandboxGrade),
	};

	return {
		runtime,
		state,
		configure: (partial) =>
			setState((current) => configureSandbox(current, partial)),
		start: () => setState(startSandboxGame),
	};
}
