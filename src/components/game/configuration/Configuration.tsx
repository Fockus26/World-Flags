import { motion } from "framer-motion";
import { type SubmitEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { countries } from "@/data/countries";
import { useAuth } from "@/hooks/useAuth";
import { useGame } from "@/hooks/useGame";
import { motionVariants } from "@/styles/animations";
import {
	DEFAULT_DIFFICULTY,
	DEFAULT_GAME_MODE,
	DEFAULT_TIMER_DURATION,
	type PracticeRegion,
} from "@/types/country";
import { getAvatarUrl } from "@/utils/avatar";
import {
	calculateLearningProgress,
	countLearnedCountries,
	getDueCountries,
} from "@/utils/learning-storage";
import { ConfigurationModal } from "./ConfigurationModal/ConfigurationModal";
import { RegionSelector } from "./RegionSelector";
import { UserSummary } from "./UserSummary";

export function Configuration() {
	const { learningData, saveProfile, startGame, updateSettings, startDailyPractice } = useGame();
	const [isConfigurationModalOpen, setIsConfigurationModalOpen] = useState(false);
	const { status, user } = useAuth();

	const accountLabel = status === "authenticated" ? (user?.email ?? "Cuenta") : "Invitado";

	const order = learningData.lastConfiguration?.order ?? "alphabetical";
	const timerDuration = learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION;
	const difficulty = learningData.lastConfiguration?.difficulty ?? DEFAULT_DIFFICULTY;
	const mode = learningData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE;
	const lastRegion = learningData.lastConfiguration?.region ?? "world";

	const learnedCountries = countLearnedCountries(learningData.countryHistory);
	const learningProgress = calculateLearningProgress(learningData.countryHistory, 196);

	const dueCount = getDueCountries(
		learningData.countryHistory,
		countries.map((country) => country.code),
	).length;

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const region = formData.get("region") as PracticeRegion;

		startGame({
			region,
			order,
			timerDuration,
			difficulty,
			mode,
		});
	}

	return (
		<>
			<motion.section
				className="
					flex
					w-full
					max-w-232
					max-h-full
					flex-col
					gap-4
					overflow-hidden
					rounded-2xl
					border
					border-border
					bg-surface
					p-4
					shadow-xl
					max-[44rem]:rounded-lg
					max-[30rem]:p-3
					max-[43rem]:py-3
				"
				variants={motionVariants.contentEnter}
				initial="hidden"
				animate="visible"
			>
				<UserSummary
					name={learningData.profile.name}
					avatarUrl={getAvatarUrl(
						learningData.profile.avatarStyle,
						learningData.profile.avatarSeed,
					)}
					accountLabel={accountLabel}
					learningProgress={learningProgress}
					learnedCountries={learnedCountries}
					totalCountries={196}
					onOpenModal={() => setIsConfigurationModalOpen(true)}
				/>

				<header className="shrink-0">
					<h1
						className="
							m-0
							text-3xl
							font-bold
							leading-tight
							text-text
							max-[30rem]:text-2xl
							max-[43rem]:text-2xl
						"
					>
						Aprende las banderas del mundo
					</h1>
				</header>

				<form
					className="
						flex
						min-h-0
						flex-1
						flex-col
						gap-3
						max-[43rem]:gap-2
					"
					onSubmit={handleSubmit}
				>
					<RegionSelector
						lastRegion={lastRegion}
						regionGameScores={learningData.regionGameScores}
					/>

					<Button variant="primary" type="submit">
						Comenzar práctica
					</Button>
				</form>

				{dueCount > 0 && (
					<Button variant="secondary" type="button" onClick={startDailyPractice}>
						Práctica diaria ({dueCount})
					</Button>
				)}
			</motion.section>

			<ConfigurationModal
				isOpen={isConfigurationModalOpen}
				onClose={() => setIsConfigurationModalOpen(false)}
				profile={learningData.profile}
				onSaveProfile={saveProfile}
				mode={mode}
				onModeChange={(value) => updateSettings({ mode: value })}
				order={order}
				onOrderChange={(value) => updateSettings({ order: value })}
				timerDuration={timerDuration}
				onTimerDurationChange={(value) => updateSettings({ timerDuration: value })}
				difficulty={difficulty}
				onDifficultyChange={(value) => updateSettings({ difficulty: value })}
			/>
		</>
	);
}
