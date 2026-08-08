import {
	useState,
	type CSSProperties,
	type SubmitEvent,
} from "react";
import { motion } from "framer-motion";
import { motionVariants } from "../../styles/animations";

import {
	DEFAULT_TIMER_DURATION, 
	REGION_LABELS,
	REGIONS,
	type PracticeRegion,
} from "../../types/country";
import {
	getScoreBackgroundColor,
	getScoreColor,
} from "../../utils/score";
import {
	calculateLearningProgress,
	calculateRegionAverage,
	countLearnedCountries,
	formatScore,
} from "../../utils/learning-storage";
import { REGION_COUNTRY_COUNTS } from "../../utils/region-stats";

import { UserProfileEditor } from "./UserProfileEditor";
import { GameSettingsModal } from "./GameSettingsModal";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { useGame } from "../../context/GameContext";

import styles from "./GameConfiguration.module.css";
import { useTheme } from "../../context/ThemeContext";

interface ScoreStyle extends CSSProperties {
	"--score-color": string;
	"--score-background": string;
}

export function GameConfiguration() {
const { resolvedTheme } = useTheme();
const isDarkTheme = resolvedTheme === "dark";
	const { learningData, saveProfile, startGame, updateSettings } = useGame();
	const [isProfileEditorOpen, setIsProfileEditorOpen] =
		useState(false);
	const [isSettingsModalOpen, setIsSettingsModalOpen] =
		useState(false);

	const order = learningData.lastConfiguration?.order ?? "alphabetical";
	const timerDuration = learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION;

	const learnedCountries = countLearnedCountries(
		learningData.countryHistory,
	);

	const learningProgress = calculateLearningProgress(
		learningData.countryHistory,
		196,
	);

	const avatarUrl =
		`https://api.dicebear.com/9.x/` +
		`${learningData.profile.avatarStyle}/svg` +
		`?seed=${encodeURIComponent(
			learningData.profile.avatarSeed,
		)}`;

		const lastRegion = learningData.lastConfiguration?.region ?? "world";

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);

		const region = formData.get(
			"region",
		) as PracticeRegion;

		startGame({
			region,
			order,
			timerDuration,
		});
	}

	return (
        <>
		<motion.section
			className={styles.configuration}
			variants={motionVariants.contentEnter}
			initial="hidden"
			animate="visible"
		>
           <motion.div
	className={styles.userSummary}
	variants={motionVariants.contentEnter}
	initial="hidden"
	animate="visible"
>
	<button
		className={styles.profileButton}
		type="button"
		onClick={() => setIsProfileEditorOpen(true)}
	>
		<img
			className={styles.profileAvatar}
			src={avatarUrl}
			alt={`Avatar de ${learningData.profile.name}`}
		/>

		<span className={styles.profileText}>
			<strong>{learningData.profile.name}</strong>
		</span>
	</button>

	<div className={styles.globalProgress}>
		<div className={styles.globalProgressHeader}>
			<span>Progreso global</span>
			<span className={styles.globalProgressStats}>
				<strong>{learningProgress}%</strong>
				<small>{learnedCountries}/196</small>
			</span>
		</div>

		<div
			className={styles.globalProgressBar}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={learningProgress}
		>
			<div
				className={styles.globalProgressValue}
				style={{ width: `${learningProgress}%` }}
			/>
		</div>
	</div>
	
	<Button
		variant="secondary"
		type="button"
		className={styles.settingsButton}
		aria-label="Configuración"
		onClick={() => setIsSettingsModalOpen(true)}
	>
		⚙️
	</Button>
</motion.div>

			<header className={styles.header}>
				<h1>Aprende las banderas del mundo</h1>
			</header>

			<form
				className={styles.configurationForm}
				onSubmit={handleSubmit}
			>
				<fieldset className={styles.fieldset}>
					<legend>Continentes</legend>

					<div className={styles.regionGrid}>
	<label className={styles.option}>
		<input
			type="radio"
			name="region"
			value="world"
			defaultChecked={lastRegion === "world"}
		/>
		<span className={styles.optionContent}>
			<span className={styles.optionTop}>
				<span className={styles.optionName}>Todo el mundo</span>
			</span>
			<span className={styles.optionMeta}>196 países</span>
		</span>
	</label>

	{REGIONS.map((region) => {
		const recentScores = learningData.regionGameScores[region];
		const score = calculateRegionAverage(recentScores);
		const countryCount = REGION_COUNTRY_COUNTS[region];

		const scoreStyle: ScoreStyle | undefined =
	score !== null
		? {
				"--score-color": getScoreColor(score, isDarkTheme), 
				"--score-background": getScoreBackgroundColor(score, isDarkTheme), 
			}
		: undefined;

		return (
			<label className={styles.option} key={region} style={scoreStyle}>
				<input
					type="radio"
					name="region"
					value={region}
					defaultChecked={lastRegion === region}
				/>

				<span className={styles.optionContent}>
					<span className={styles.optionTop}>
						<span className={styles.optionName}>
							{REGION_LABELS[region]}
						</span>

						{score !== null && (
							<Tooltip label="Promedio de tus últimas 3 partidas">
								<span
									className={styles.optionScoreValue}
									tabIndex={0}
									aria-label="Promedio de las últimas tres partidas completadas"
								>
									{formatScore(score)}/10
								</span>
							</Tooltip>
						)}
					</span>

					<span className={styles.optionMeta}>
						{countryCount} países
					</span>
				</span>
			</label>
		);
	})}
</div>
				</fieldset>

				<Button variant="primary" type="submit">
					Comenzar práctica
				</Button>
			</form>
		</motion.section>
		<UserProfileEditor
			isOpen={isProfileEditorOpen}
			profile={learningData.profile}
			onClose={() => setIsProfileEditorOpen(false)}
			onSave={(profile) => {
				saveProfile(profile);
				setIsProfileEditorOpen(false);
			}}
		/>
		<GameSettingsModal
			isOpen={isSettingsModalOpen}
			onClose={() => setIsSettingsModalOpen(false)}
			order={order}
			onOrderChange={(value) => updateSettings({ order: value })}
			timerDuration={timerDuration}
			onTimerDurationChange={(value) => updateSettings({ timerDuration: value })} 
		/>
</>
	);
}