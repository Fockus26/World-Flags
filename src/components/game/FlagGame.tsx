import { useGame } from "@/hooks/useGame";
import { Configuration } from "./configuration/Configuration";
import styles from "./FlagGame.module.css";
import { Results } from "./Results";
import { DailyPractice } from "./session/DailyPractice";
import { Session } from "./session/Session";

function FlagGameContent() {
	const { activeGame, lastResult, dailyPracticeQueue, exitGame, exitDailyPractice, restartGame } =
		useGame();

	if (activeGame) {
		return <Session />;
	}

	if (dailyPracticeQueue) {
		return <DailyPractice countryCodes={dailyPracticeQueue} onFinish={exitDailyPractice} />;
	}

	if (lastResult) {
		return <Results result={lastResult} onRestart={restartGame} onExit={exitGame} />;
	}

	return <Configuration />;
}

export default function FlagGame() {
	return (
		<main className={styles.application}>
			<FlagGameContent />
		</main>
	);
}
