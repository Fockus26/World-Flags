import { GameProvider, useGame } from "../../context/GameContext";
import { GameConfiguration } from "./GameConfiguration";
import { GameResults } from "./GameResults";
import { GameSession } from "./GameSession";
import styles from "./FlagGame.module.css";

function FlagGameContent() {
	const { activeGame, lastResult, exitGame, restartGame } = useGame();

	if (activeGame) {
		return <GameSession />;
	}

	if (lastResult) {
		return (
			<GameResults
				result={lastResult}
				onRestart={restartGame}
				onExit={exitGame}
			/>
		);
	}

	return <GameConfiguration />;
}

export default function FlagGame() {
	return (
		<GameProvider>
			<main className={styles.application}>
				<FlagGameContent />
			</main>
		</GameProvider>
	);
}
