import { useGame } from "@/context/GameContext";
import { Configuration } from "./configuration/Configuration";
import styles from "./FlagGame.module.css";
import { Results } from "./Results";
import { Session } from "./session/Session";

function FlagGameContent() {
	const { activeGame, lastResult, exitGame, restartGame } = useGame();

	if (activeGame) {
		return <Session />;
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
		<main className={styles.application}>
			<FlagGameContent />
		</main>
	);
}
