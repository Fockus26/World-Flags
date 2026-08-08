import { motion } from "framer-motion";
import { type SubmitEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useGame } from "@/context/GameContext";
import { motionVariants } from "@/styles/animations";
import { DEFAULT_TIMER_DURATION, type PracticeRegion } from "@/types/country";
import { getAvatarUrl } from "@/utils/avatar";
import {
	calculateLearningProgress,
	countLearnedCountries,
} from "@/utils/learning-storage";
import styles from "./Configuration.module.css";
import { RegionSelector } from "./RegionSelector";
import { SettingsModal } from "./SettingsModal";
import { UserEditorModal } from "./UserEditorModal/UserEditorModal";
import { UserSummary } from "./UserSummary";

export function Configuration() {
	const { learningData, saveProfile, startGame, updateSettings } = useGame();
	const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

	const order = learningData.lastConfiguration?.order ?? "alphabetical";
	const timerDuration =
		learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION;
	const lastRegion = learningData.lastConfiguration?.region ?? "world";

	const learnedCountries = countLearnedCountries(learningData.countryHistory);
	const learningProgress = calculateLearningProgress(
		learningData.countryHistory,
		196,
	);

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
					learningProgress={learningProgress}
					learnedCountries={learnedCountries}
					totalCountries={196}
					onEditProfile={() => setIsProfileEditorOpen(true)}
					onOpenSettings={() => setIsSettingsModalOpen(true)}
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

			<UserEditorModal
				isOpen={isProfileEditorOpen}
				profile={learningData.profile}
				onClose={() => setIsProfileEditorOpen(false)}
				onSave={(profile) => {
					saveProfile(profile);
					setIsProfileEditorOpen(false);
				}}
			/>

			<SettingsModal
				isOpen={isSettingsModalOpen}
				onClose={() => setIsSettingsModalOpen(false)}
				order={order}
				onOrderChange={(value) => updateSettings({ order: value })}
				timerDuration={timerDuration}
				onTimerDurationChange={(value) =>
					updateSettings({ timerDuration: value })
				}
			/>
		</>
	);
}
