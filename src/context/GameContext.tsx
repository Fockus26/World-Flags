import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { countries } from "../data/countries";
import { prepareCountries } from "../utils/prepare-countries";
import {
  getLearningData,
  registerCountryAttempt,
  registerRegionGame,
  saveUserProfile,
  saveLastConfiguration,
  updateLastConfiguration,
} from "../utils/learning-storage";
import {
  DEFAULT_TIMER_DURATION,
  type Country,
  type GameConfiguration as GameConfigurationType,
  type GameResult,
} from "../types/country";
import type {
  UserLearningData,
  UserProfile,
} from "../types/progress";

interface ActiveGame {
  configuration: GameConfigurationType;
  countries: Country[];
}

interface GameContextValue {
  learningData: UserLearningData;
  activeGame: ActiveGame | null;
  lastResult: GameResult | null;
  startGame: (configuration: GameConfigurationType) => void;
  finishGame: (result: GameResult) => void;
  exitGame: () => void;
  restartGame: () => void;
  attemptCountry: (countryCode: string, isCorrect: boolean) => void;
  saveProfile: (profile: UserProfile) => void;
  updateSettings: (partial: Partial<GameConfigurationType>) => void;
}

const GameContext = createContext<GameContextValue | undefined>(
  undefined,
);

export function useGame() {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }

  return context;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [learningData, setLearningData] = useState<UserLearningData>(
    () => getLearningData(),
  );
  const [activeGame, setActiveGame] =
    useState<ActiveGame | null>(null);
  const [lastResult, setLastResult] =
    useState<GameResult | null>(null);

  useEffect(() => {
    setLearningData(getLearningData());
  }, []);

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
      const updatedData = registerRegionGame(
        result.region,
        result.score,
      );

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
      order: "random",
      timerDuration:
        learningData.lastConfiguration?.timerDuration ??
        DEFAULT_TIMER_DURATION,
    });
  };

  const attemptCountry = (countryCode: string, isCorrect: boolean) => {
    const updatedData = registerCountryAttempt(
      countryCode,
      isCorrect,
    );

    setLearningData(updatedData);
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
        startGame,
        finishGame,
        exitGame,
        restartGame,
        attemptCountry,
        saveProfile,
        updateSettings
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
