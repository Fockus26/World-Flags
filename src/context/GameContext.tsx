import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { countries } from "@/data/countries";
import {
	type Country,
	DEFAULT_GAME_MODE,
	DEFAULT_TIMER_DURATION,
	type GameConfiguration as GameConfigurationType,
	type GameResult,
} from "@/types/country";
import type { ReviewGrade, UserLearningData, UserProfile } from "@/types/progress";
import { pushLearningData, syncOnLogin } from "@/utils/cloud-storage";
import {
	clearLearningData,
	getDueCountries,
	getLearningData,
	registerCountryAttempt,
	registerRegionGame,
	saveLastConfiguration,
	saveLearningData,
	saveReviewResult,
	saveUserProfile,
	updateLastConfiguration,
} from "@/utils/learning-storage";
import { prepareCountries } from "@/utils/prepare-countries";

interface ActiveGame {
	configuration: GameConfigurationType;
	countries: Country[];
}

interface GameContextValue {
	learningData: UserLearningData;
	activeGame: ActiveGame | null;
	lastResult: GameResult | null;
	dailyPracticeQueue: string[] | null;
	startGame: (configuration: GameConfigurationType) => void;
	finishGame: (result: GameResult) => void;
	exitGame: () => void;
	restartGame: () => void;
	attemptCountry: (countryCode: string, isCorrect: boolean) => void;
	gradeCountryReview: (countryCode: string, grade: ReviewGrade) => void;
	startDailyPractice: () => void;
	exitDailyPractice: () => void;
	saveProfile: (profile: UserProfile) => void;
	updateSettings: (partial: Partial<GameConfigurationType>) => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function useGame() {
	const context = useContext(GameContext);

	if (!context) {
		throw new Error("useGame must be used within a GameProvider");
	}

	return context;
}

export function GameProvider({ children }: { children: ReactNode }) {
	const [learningData, setLearningData] = useState<UserLearningData>(() => getLearningData());
	const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
	const [lastResult, setLastResult] = useState<GameResult | null>(null);
	const [dailyPracticeQueue, setDailyPracticeQueue] = useState<string[] | null>(null);

	useEffect(() => {
		setLearningData(getLearningData());
	}, []);

	const { user, status } = useAuth();
	const hasSyncedRef = useRef(false);
	const pushTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		if (status !== "authenticated" || !user || hasSyncedRef.current) return;

		hasSyncedRef.current = true;

		syncOnLogin(user.id, getLearningData()).then((merged) => {
			saveLearningData(merged);
			setLearningData(merged);
		});
	}, [status, user]);

	useEffect(() => {
		if (status !== "guest" || !hasSyncedRef.current) return;

		hasSyncedRef.current = false;
		clearLearningData();
		setLearningData(getLearningData());
	}, [status]);

	useEffect(() => {
		if (status !== "authenticated" || !user) return;

		clearTimeout(pushTimeoutRef.current);
		pushTimeoutRef.current = setTimeout(() => {
			pushLearningData(user.id, learningData);
		}, 800);

		return () => clearTimeout(pushTimeoutRef.current);
	}, [learningData, status, user]);

	const startGame = (configuration: GameConfigurationType) => {
		setLastResult(null);

		const updatedData = saveLastConfiguration(configuration);
		setLearningData(updatedData);

		setActiveGame({
			configuration,
			countries: prepareCountries(countries, configuration),
		});
	};

	const finishGame = (result: GameResult) => {
		setLastResult(result);
		setActiveGame(null);

		if (result.region !== "world") {
			const updatedData = registerRegionGame(result.region, result.score);

			setLearningData(updatedData);
		}
	};

	const exitGame = () => {
		setActiveGame(null);
		setLastResult(null);
	};

	const restartGame = () => {
		if (!lastResult) {
			return;
		}

		startGame({
			region: lastResult.region,
			order: learningData.lastConfiguration?.order ?? "random",
			timerDuration: learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION,
			difficulty: learningData.lastConfiguration?.difficulty ?? "hard",
			mode: learningData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE,
		});
	};

	const attemptCountry = (countryCode: string, isCorrect: boolean) => {
		const updatedData = registerCountryAttempt(countryCode, isCorrect);

		setLearningData(updatedData);
	};

	const gradeCountryReview = (countryCode: string, grade: ReviewGrade) => {
		const updatedData = saveReviewResult(countryCode, grade);
		setLearningData(updatedData);
	};

	const startDailyPractice = () => {
		const allCodes = countries.map((country) => country.code);
		const dueCodes = getDueCountries(learningData.countryHistory, allCodes);
		setDailyPracticeQueue(dueCodes);
	};

	const exitDailyPractice = () => {
		setDailyPracticeQueue(null);
	};

	const saveProfile = (profile: UserProfile) => {
		const updatedData = saveUserProfile(profile);
		setLearningData(updatedData);
	};

	const updateSettings = (partial: Partial<GameConfigurationType>) => {
		const updatedData = updateLastConfiguration(partial);
		setLearningData(updatedData);
	};

	return (
		<GameContext.Provider
			value={{
				learningData,
				activeGame,
				lastResult,
				dailyPracticeQueue,
				startDailyPractice,
				exitDailyPractice,
				startGame,
				finishGame,
				exitGame,
				restartGame,
				attemptCountry,
				gradeCountryReview,
				saveProfile,
				updateSettings,
			}}
		>
			{children}
		</GameContext.Provider>
	);
}
