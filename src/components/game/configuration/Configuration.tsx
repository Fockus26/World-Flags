import { motion } from "framer-motion";
import { type SubmitEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useGame } from "@/hooks/useGame";
import { motionVariants } from "@/styles/animations";
import {
	DEFAULT_DIFFICULTY,
	DEFAULT_GAME_MODE,
	DEFAULT_SCOPE,
	DEFAULT_TIMER_DURATION,
} from "@/types/country";
import { getAvatarUrl } from "@/utils/avatar";
import {
	calculateLearningProgress,
	countLearnedCountries,
	getDueCountries,
} from "@/utils/learning-storage";
import { getScopeLabel, isEmptyScope } from "@/utils/practice-scope";
import { CountryPickerModal } from "./CountryPickerModal";
import { ConfigurationModal } from "./configurationModal/ConfigurationModal";
import { LeaderboardModal } from "./LeaderboardModal";
import { RegionSelector } from "./RegionSelector";
import { UserSummary } from "./UserSummary";

export function Configuration() {
	const {
		learningData,
		saveProfile,
		startGame,
		updateSettings,
		startDailyPractice,
		getRegionPracticeProgress,
		isCountryPracticedToday,
	} = useGame();
	const [isConfigurationModalOpen, setIsConfigurationModalOpen] =
		useState(false);
	const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
	const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
	const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
	const { status, user } = useAuth();

	const accountLabel =
		status === "authenticated" ? (user?.email ?? "Cuenta") : "Invitado";

	const order = learningData.lastConfiguration?.order ?? "alphabetical";
	const timerDuration =
		learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION;
	const timerEnabled = learningData.lastConfiguration?.timerEnabled ?? false;
	const difficulty =
		learningData.lastConfiguration?.difficulty ?? DEFAULT_DIFFICULTY;
	const mode = learningData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE;
	const scope = learningData.lastConfiguration?.scope ?? DEFAULT_SCOPE;
	const customCodes = scope.type === "custom" ? scope.countryCodes : [];

	const learnedCountries = countLearnedCountries(learningData.countryHistory);
	const learningProgress = calculateLearningProgress(
		learningData.countryHistory,
		196,
	);

	const dueCount = getDueCountries(learningData.countryHistory).length;

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isEmptyScope(scope)) {
			setBlockedMessage(
				"Elige al menos un continente o algún país para practicar.",
			);
			return;
		}

		const started = startGame({
			scope,
			order,
			timerDuration,
			timerEnabled,
			difficulty,
			mode,
		});

		if (!started) {
			setBlockedMessage(
				`Ya practicaste ${getScopeLabel(scope)} hoy en modo práctica. Vuelve mañana o elige otros países.`,
			);
			return;
		}

		setBlockedMessage(null);
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
					border
					border-surface-border
					bg-surface
					p-3
					shadow-xl
					rounded-lg
					min-[44rem]:rounded-2xl
					min-[44rem]:p-4
				"
				variants={motionVariants.contentEnter}
				initial={false}
				animate="visible"
			>
				<div className="flex items-center gap-2">
					<UserSummary
						className="min-w-0 flex-1"
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

					<Tooltip label="Ranking" position="left" side="bottom">
						<IconButton
							type="button"
							color="neutral"
							variant="text"
							aria-label="Ver ranking"
							onClick={() => setIsLeaderboardOpen(true)}
						>
							🏆
						</IconButton>
					</Tooltip>

					<Tooltip
						label={
							customCodes.length > 0
								? `${customCodes.length} país${customCodes.length === 1 ? "" : "es"} elegidos a mano`
								: "Elegir países específicos"
						}
						position="left"
						side="bottom"
					>
						<span className="relative inline-flex">
							<IconButton
								type="button"
								color="neutral"
								variant="text"
								aria-label="Elegir países específicos"
								onClick={() => setIsCountryPickerOpen(true)}
							>
								📍
							</IconButton>

							{customCodes.length > 0 && (
								<span
									aria-hidden="true"
									className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-black text-primary-soft"
								>
									{customCodes.length}
								</span>
							)}
						</span>
					</Tooltip>
				</div>

				<header className="shrink-0">
					<h1
						className="
							m-0
							text-2xl
							font-bold
							leading-tight
							text-surface-soft
							min-[44rem]:text-3xl
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
						gap-4
					"
					onSubmit={handleSubmit}
				>
					<RegionSelector
						scope={scope}
						onScopeChange={(nextScope) => {
							updateSettings({ scope: nextScope });
							setBlockedMessage(null);
						}}
						regionGameScores={learningData.regionGameScores}
						regionBestTimes={learningData.regionBestTimes}
						mode={mode}
						getRegionPracticeProgress={getRegionPracticeProgress}
					/>

					{blockedMessage && (
						<FeedbackMessage variant="danger" size="sm" role="alert">
							{blockedMessage}
						</FeedbackMessage>
					)}

					<Button type="submit" className="shrink-0">
						Comenzar práctica
					</Button>
				</form>

				{dueCount > 0 && (
					<Button
						color="secondary"
						type="button"
						className="shrink-0"
						onClick={startDailyPractice}
					>
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
				onModeChange={(value) =>
					// Competitivo siempre es difícil y aleatorio: no son ajustables.
					updateSettings(
						value === "competitive"
							? { mode: value, order: "random", difficulty: "hard" }
							: { mode: value },
					)
				}
				order={order}
				onOrderChange={(value) => updateSettings({ order: value })}
				timerDuration={timerDuration}
				onTimerDurationChange={(value) =>
					updateSettings({ timerDuration: value })
				}
				timerEnabled={timerEnabled}
				onTimerEnabledChange={(value) =>
					updateSettings({ timerEnabled: value })
				}
				difficulty={difficulty}
				onDifficultyChange={(value) => updateSettings({ difficulty: value })}
			/>

			<CountryPickerModal
				isOpen={isCountryPickerOpen}
				onClose={() => setIsCountryPickerOpen(false)}
				initialSelectedCodes={customCodes}
				isCountryDisabled={
					mode === "practice" ? isCountryPracticedToday : undefined
				}
				onConfirm={(countryCodes) => {
					const regions = scope.type === "custom" ? scope.regions : [];
					updateSettings({ scope: { type: "custom", regions, countryCodes } });
					setBlockedMessage(null);
				}}
			/>

			<LeaderboardModal
				isOpen={isLeaderboardOpen}
				onClose={() => setIsLeaderboardOpen(false)}
			/>
		</>
	);
}
