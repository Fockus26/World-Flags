import { motion } from "framer-motion";
import { type SubmitEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { motionVariants } from "@/styles/animations";
import { DEFAULT_TIMER_DURATION, type PracticeRegion } from "@/types/country";
import { getAvatarUrl } from "@/utils/avatar";
import { calculateLearningProgress, countLearnedCountries } from "@/utils/learning-storage";
import styles from "./Configuration.module.css";
import { AccountTab } from "./ConfigurationModal/AccountTab";
import { ConfigurationModal } from "./ConfigurationModal/ConfigurationModal";
import { RegionSelector } from "./RegionSelector";
import { UserSummary } from "./UserSummary";

export function Configuration() {
	const { learningData, saveProfile, startGame, updateSettings } = useGame();
	const [isConfigurationModalOpen, setIsConfigurationModalOpen] = useState(false);
	const { status, user } = useAuth();
	const accountLabel = status === "authenticated" ? (user?.email ?? "Cuenta") : "Invitado";

	const order = learningData.lastConfiguration?.order ?? "alphabetical";
	const timerDuration = learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION;
	const lastRegion = learningData.lastConfiguration?.region ?? "world";

	const learnedCountries = countLearnedCountries(learningData.countryHistory);
	const learningProgress = calculateLearningProgress(learningData.countryHistory, 196);

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const region = formData.get("region") as PracticeRegion;
		startGame({ region, order, timerDuration });
	}

	return (
		<>
			<motion.section
				className={styles.configuration}
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

				<header className={styles.header}>
					<h1>Aprende las banderas del mundo</h1>
				</header>

				<form className={styles.configurationForm} onSubmit={handleSubmit}>
					<RegionSelector
						lastRegion={lastRegion}
						regionGameScores={learningData.regionGameScores}
					/>
					<Button variant="primary" type="submit">
						Comenzar práctica
					</Button>
				</form>
			</motion.section>

			<ConfigurationModal
				isOpen={isConfigurationModalOpen}
				onClose={() => setIsConfigurationModalOpen(false)}
				profile={learningData.profile}
				onSaveProfile={saveProfile}
				order={order}
				onOrderChange={(value) => updateSettings({ order: value })}
				timerDuration={timerDuration}
				onTimerDurationChange={(value) => updateSettings({ timerDuration: value })}
			/>
		</>
	);
}
