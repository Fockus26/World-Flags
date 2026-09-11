import { useGame } from "@/hooks/useGame";
import { AchievementToasts } from "./AchievementToasts";
import { Configuration } from "./configuration/Configuration";
import { Results } from "./Results";
import { DailyPractice } from "./session/DailyPractice";
import { Session } from "./session/Session";

function FlagGameContent() {
	const {
		activeGame,
		lastResult,
		dailyPracticeQueue,
		exitGame,
		exitDailyPractice,
		finishDailyPractice,
		restartGame,
	} = useGame();

	if (activeGame) {
		return <Session />;
	}

	if (dailyPracticeQueue) {
		return (
			<DailyPractice
				countryCodes={dailyPracticeQueue}
				onComplete={finishDailyPractice}
				onAbandon={exitDailyPractice}
			/>
		);
	}

	if (lastResult) {
		return (
			<Results result={lastResult} onRestart={restartGame} onExit={exitGame} />
		);
	}

	return <Configuration />;
}

export default function FlagGame() {
	return (
		<main
			id="main-content"
			className="relative grid h-dvh w-full place-items-center overflow-hidden p-[0.4rem] sm:p-[clamp(0.5rem,2vh,1.5rem)]"
		>
			<FlagGameContent />
			{/* Fuera de `FlagGameContent`: tiene que verse en cualquier vista
			    (sesión, práctica diaria, resultados...), no solo en una. */}
			<AchievementToasts />
		</main>
	);
}
