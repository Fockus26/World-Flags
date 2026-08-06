import { useEffect, useState } from "react";
import { countries } from "../../data/countries";
import type {
	Country,
	GameConfiguration as GameConfigurationType,
	GameResult,
} from "../../types/country";
import { prepareCountries } from "../../utils/prepare-countries";

import type {
	UserLearningData,
	UserProfile,
} from "../../types/progress";

import {
	getLearningData,
	registerCountryAttempt,
	registerRegionGame,
	saveUserProfile,
} from "../../utils/learning-storage";

import { GameConfiguration } from "./GameConfiguration";
import {
	GameResults,
	GameSession,
} from "./GameSession";
import styles from "./FlagGame.module.css";

interface ActiveGame {
	configuration: GameConfigurationType;
	countries: Country[];
}

export default function FlagGame() {
	const [activeGame, setActiveGame] =
		useState<ActiveGame | null>(null);

	const [lastResult, setLastResult] =
		useState<GameResult | null>(null);

	const [learningData, setLearningData] =
	    useState<UserLearningData>(() => getLearningData());

	useEffect(() => {
	setLearningData(getLearningData());
}, []);

	function handleStart(
		configuration: GameConfigurationType,
	) {
		setLastResult(null);

		setActiveGame({
			configuration,
			countries: prepareCountries(
				countries,
				configuration,
			),
		});
	}

	function handleFinish(result: GameResult) {
		setLastResult(result);
		setActiveGame(null);

		if (result.region !== "world") {
	const updatedData = registerRegionGame(
		result.region,
		result.score,
	);

	setLearningData(updatedData);
}
	}

	function handleExit() {
		setActiveGame(null);
		setLastResult(null);
	}

	function handleRestart() {
		if (!lastResult) {
			return;
		}

		handleStart({
			region: lastResult.region,
			order: "random",
		});
	}

    function handleCountryAttempt(
	countryCode: string,
	isCorrect: boolean,
) {
	const updatedData = registerCountryAttempt(
		countryCode,
		isCorrect,
	);

	setLearningData(updatedData);
}

function handleProfileSave(profile: UserProfile) {
	const updatedData = saveUserProfile(profile);

	setLearningData(updatedData);
}
	return (
		<main className={styles.application}>
			{activeGame ? (
				<GameSession
					countries={activeGame.countries}
					region={activeGame.configuration.region}
					onExit={handleExit}
					onFinish={handleFinish}
                    onCountryAttempt={handleCountryAttempt}
				/>
			) : lastResult ? (
				<GameResults
					result={lastResult}
					onRestart={handleRestart}
					onExit={handleExit}
				/>
			) : (
				<GameConfiguration
                    learningData={learningData}
                    onProfileSave={handleProfileSave}
					onStart={handleStart}
				/>
			)}
		</main>
	);
}