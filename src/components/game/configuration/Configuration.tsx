import { motion } from "framer-motion";
import { type SubmitEvent, useState } from "react";
import { AutoHeight } from "@/components/ui/AutoHeight";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { IconButton } from "@/components/ui/IconButton";
import { LoadingAnnouncer } from "@/components/ui/LoadingAnnouncer";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { countries } from "@/data/countries";
import { useAchievements } from "@/hooks/useAchievements";
import { useAuth } from "@/hooks/useAuth";
import { useGame } from "@/hooks/useGame";
import { useHydration } from "@/hooks/useHydration";
import { motionVariants } from "@/styles/animations";
import {
	DEFAULT_DIFFICULTY,
	DEFAULT_GAME_MODE,
	DEFAULT_SCOPE,
	DEFAULT_TIMER_DURATION,
	GAME_TYPE_TITLES,
	resolveGameType,
} from "@/types/country";
import { getAvatarUrl } from "@/utils/avatar";
import { isCatalogCountryCode } from "@/utils/country-catalog";
import {
	calculateLearningProgress,
	countLearnedCountries,
	getDueCountries,
	toGameView,
} from "@/utils/learning-storage";
import { getScopeLabel, isEmptyScope } from "@/utils/practice-scope";
import { AchievementsModal } from "./AchievementsModal";
import { CountryPickerModal } from "./CountryPickerModal";
import { ConfigurationModal } from "./configurationModal/ConfigurationModal";
import { GameTypeToggle } from "./GameTypeToggle";
import { LeaderboardModal } from "./LeaderboardModal";
import { RegionSelector } from "./RegionSelector";
import { StreakPanel } from "./StreakPanel";
import { UserSummary } from "./UserSummary";

const EMPTY_SCOPE_MESSAGE =
	"Elige al menos un continente o algún país para practicar.";

// ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #16): solo lo oyen los lectores
// de pantalla, pendiente de aprobación del dueño.
const LOADING_MESSAGE = "Cargando tu progreso…";
const LOADED_MESSAGE = "Progreso cargado";

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
	const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
	const [isStreakOpen, setIsStreakOpen] = useState(false);
	const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
	const { status, user } = useAuth();
	const { unseenCount, markAllSeen } = useAchievements();
	// Mientras sea `true`, `learningData` es `DEFAULT_DATA`, no el del usuario:
	// todo lo que sale de ahí se pinta como skeleton (D042).
	const { isInitialLoad } = useHydration();

	const accountLabel =
		status === "authenticated" ? (user?.email ?? "Cuenta") : "Invitado";

	const order = learningData.lastConfiguration?.order ?? "alphabetical";
	const timerDuration =
		learningData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION;
	const timerEnabled = learningData.lastConfiguration?.timerEnabled ?? false;
	const difficulty =
		learningData.lastConfiguration?.difficulty ?? DEFAULT_DIFFICULTY;
	const mode = learningData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE;
	// Sin config guardada (usuario nuevo): arranca en Países (D030). Con
	// config vieja sin `gameType`, `migrateConfiguration` ya la migró a
	// "flags". Un juego que este cliente no conoce (de una versión más nueva,
	// llegado por la nube) también cae al de usuario nuevo, pero solo aquí,
	// al leerlo: lo guardado no se toca (D062). Es el único sitio que lee el
	// juego de la configuración; todo lo demás lo recibe ya resuelto.
	const gameType = resolveGameType(learningData.lastConfiguration?.gameType);
	const scope = learningData.lastConfiguration?.scope ?? DEFAULT_SCOPE;
	const customCodes = scope.type === "custom" ? scope.countryCodes : [];
	// El selector recibe `customCodes` entero (los devuelve intactos al
	// confirmar); el contador del 📍 solo cuenta los que existen en el catálogo.
	const customCatalogCount = customCodes.filter(isCatalogCountryCode).length;

	// El progreso mostrado (aprendidos, puntajes, mejores tiempos) es el del
	// juego seleccionado, no siempre el de Banderas — de ahí `toGameView`.
	const gameView = toGameView(learningData, gameType);
	const learnedCountries = countLearnedCountries(gameView.countryHistory);
	const learningProgress = calculateLearningProgress(
		gameView.countryHistory,
		countries.length,
	);

	const dueCount = getDueCountries(gameView.countryHistory).length;
	const dailyPracticeLabel = `Práctica diaria (${dueCount})`;
	const title = GAME_TYPE_TITLES[gameType];

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isEmptyScope(scope)) {
			setBlockedMessage(EMPTY_SCOPE_MESSAGE);
			return;
		}

		const started = startGame({
			scope,
			order,
			timerDuration,
			timerEnabled,
			difficulty,
			mode,
			gameType,
		});

		if (!started) {
			// En competitivo `startGame` solo se niega si el scope no resuelve
			// a ningún país: "ya practicaste hoy" no aplica ahí.
			setBlockedMessage(
				mode === "practice"
					? `Ya practicaste ${getScopeLabel(scope)} hoy en modo práctica. Vuelve mañana o elige otros países.`
					: EMPTY_SCOPE_MESSAGE,
			);
			return;
		}

		setBlockedMessage(null);
	}

	return (
		<>
			{/* La sección es el único contenedor con scroll: todo va a su alto
			    natural y, si no cabe (pantallas bajas, móvil en horizontal o
			    el panel de racha abierto), se scrollea la tarjeta entera. Si
			    cabe, `max-h-full` no llega a actuar y no aparece barra. Ver
			    el comentario de `RegionSelector` sobre por qué no es el grid
			    de continentes el que hace scroll. */}
			<motion.section
				className="
					flex
					w-full
					max-w-232
					max-h-full
					flex-col
					gap-4
					overflow-x-hidden
					overflow-y-auto
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
				// Carga inicial (D042): la tarjeta entera queda `inert` — nada
				// enfocable ni clicable, y fuera del árbol de accesibilidad, así
				// que ni los skeletons ni los valores por defecto se anuncian como
				// contenido. Actuar sobre ella ahora sería hacerlo sobre
				// `DEFAULT_DATA` (empezar una partida con la configuración por
				// defecto, elegir continentes que la sincronización pisaría). La
				// carga la anuncia `LoadingAnnouncer`, fuera de la sección.
				inert={isInitialLoad}
				aria-busy={isInitialLoad || undefined}
			>
				<div className="flex items-center gap-2">
					<UserSummary
						isLoading={isInitialLoad}
						className="min-w-0 flex-1"
						name={learningData.profile.name}
						avatarUrl={getAvatarUrl(
							learningData.profile.avatarStyle,
							learningData.profile.avatarSeed,
						)}
						accountLabel={accountLabel}
						learningProgress={learningProgress}
						learnedCountries={learnedCountries}
						totalCountries={countries.length}
						activeDays={learningData.stats.activeDays}
						isStreakOpen={isStreakOpen}
						onToggleStreak={() => setIsStreakOpen((current) => !current)}
						onOpenModal={() => setIsConfigurationModalOpen(true)}
					/>

					<Tooltip
						label={
							unseenCount > 0 ? `Logros (${unseenCount} sin ver)` : "Logros"
						}
						position="left"
						side="bottom"
					>
						<span className="relative inline-flex">
							<IconButton
								type="button"
								color="neutral"
								variant="text"
								// El contador va en el nombre accesible, no solo en el
								// badge: si no, "tienes logros nuevos" sería un estado
								// comunicado únicamente por color y forma.
								aria-label={
									unseenCount > 0
										? `Ver logros, ${unseenCount} sin ver`
										: "Ver logros"
								}
								onClick={() => setIsAchievementsOpen(true)}
							>
								🏅
							</IconButton>

							{/* Los iconos no dependen del progreso y se ven desde el
							    principio; sus contadores sí, así que esperan a los
							    datos. Son `absolute`: al aparecer no mueven nada. */}
							{!isInitialLoad && unseenCount > 0 && (
								<span
									aria-hidden="true"
									className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-black text-primary-soft"
								>
									{unseenCount}
								</span>
							)}
						</span>
					</Tooltip>

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
							customCatalogCount > 0
								? `${customCatalogCount} país${customCatalogCount === 1 ? "" : "es"} elegidos a mano`
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

							{!isInitialLoad && customCatalogCount > 0 && (
								<span
									aria-hidden="true"
									className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-black text-primary-soft"
								>
									{customCatalogCount}
								</span>
							)}
						</span>
					</Tooltip>
				</div>

				<AutoHeight show={isStreakOpen} className="shrink-0">
					<StreakPanel activeDays={learningData.stats.activeDays} />
				</AutoHeight>

				{/* ⚠️ Copy provisional (leyenda y título, `CONTENT_CHECKLIST.md` #9):
				    pendiente de aprobación del dueño. */}
				<GameTypeToggle
					legend="Qué practicar"
					value={gameType}
					onChange={(type) => {
						updateSettings({ gameType: type });
						setBlockedMessage(null);
					}}
					isLoading={isInitialLoad}
					className="shrink-0"
				/>

				<header className="min-w-0 shrink-0">
					{/* Sin `whitespace-nowrap`: "Aprende las capitales del mundo" se
					    pasa por 2 px del ancho disponible a 320 px y se cortaba con
					    "…". Los otros dos títulos caben en una línea; este baja a
					    dos solo en las pantallas más estrechas. */}
					<h1
						className="
							m-0
							text-lg
							font-bold
							leading-tight
							text-surface-soft
							sm:text-xl
							min-[44rem]:text-3xl
						"
					>
						{isInitialLoad ? (
							<Skeleton shape="line" className="w-fit max-w-full">
								{title}
							</Skeleton>
						) : (
							title
						)}
					</h1>
				</header>

				<form
					className="
						flex
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
						regionGameScores={gameView.regionGameScores}
						regionBestTimes={gameView.regionBestTimes}
						mode={mode}
						getRegionPracticeProgress={(region) =>
							getRegionPracticeProgress(region, gameType)
						}
						isLoading={isInitialLoad}
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

				{/* Mientras carga se le reserva el sitio: quien vuelve cada día
				    suele tener países pendientes, y es quien más espera a la
				    sincronización. Si al final no hay, la tarjeta se acorta una
				    vez (D042). La referencia es el propio botón, invisible, así
				    que el skeleton mide lo mismo en cada breakpoint. */}
				{isInitialLoad ? (
					<Skeleton className="shrink-0 rounded-3xl">
						<Button color="secondary" type="button">
							{dailyPracticeLabel}
						</Button>
					</Skeleton>
				) : (
					dueCount > 0 && (
						<Button
							color="secondary"
							type="button"
							className="shrink-0"
							onClick={() => startDailyPractice(gameType)}
						>
							{dailyPracticeLabel}
						</Button>
					)
				)}
			</motion.section>

			<LoadingAnnouncer
				isLoading={isInitialLoad}
				loadingMessage={LOADING_MESSAGE}
				readyMessage={LOADED_MESSAGE}
			/>

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
					mode === "practice"
						? (code: string) => isCountryPracticedToday(code, gameType)
						: undefined
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
				defaultGameType={gameType}
			/>

			<AchievementsModal
				isOpen={isAchievementsOpen}
				gameType={gameType}
				onClose={() => {
					setIsAchievementsOpen(false);
					// Se marcan como vistos al cerrar, no al abrir: mientras el
					// modal está abierto necesita poder distinguir cuáles son
					// "nuevos" (resaltado + scroll automático) de los ya vistos.
					markAllSeen();
				}}
			/>
		</>
	);
}
