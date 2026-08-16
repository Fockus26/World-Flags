import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { motionVariants } from "@/styles/animations";
import type { Difficulty, GameMode, PracticeOrder, TimerDuration } from "@/types/country";
import type { UserProfile } from "@/types/progress";
import { AccountTab } from "./AccountTab";
import { GameTab } from "./GameTab";

type ConfigurationModalTab = "account" | "game";

interface ConfigurationModalProps {
	isOpen: boolean;
	onClose: () => void;
	profile: UserProfile;
	onSaveProfile: (profile: UserProfile) => void;
	mode: GameMode;
	onModeChange: (mode: GameMode) => void;
	order: PracticeOrder;
	onOrderChange: (order: PracticeOrder) => void;
	timerDuration: TimerDuration;
	onTimerDurationChange: (duration: TimerDuration) => void;
	difficulty: Difficulty;
	onDifficultyChange: (difficulty: Difficulty) => void;
}

const TABS: { id: ConfigurationModalTab; label: string }[] = [
	{ id: "account", label: "Usuario" },
	{ id: "game", label: "Juego" },
];

export function ConfigurationModal({
	isOpen,
	onClose,
	profile,
	onSaveProfile,
	mode,
	onModeChange,
	order,
	onOrderChange,
	timerDuration,
	onTimerDurationChange,
	difficulty,
	onDifficultyChange,
}: ConfigurationModalProps) {
	const [activeTab, setActiveTab] = useState<ConfigurationModalTab>("account");

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			animateHeight
			className="w-[min(30rem,92vw)] text-left"
			ariaLabelledby="user-modal-title"
		>
			<header className="mb-3 flex items-center justify-between">
				<h2 id="user-modal-title">Perfil y configuración</h2>
				<Button variant="exit" type="button" onClick={onClose}>
					Cerrar
				</Button>
			</header>

			<div
				className="mb-4 flex gap-1 border-border-lighter border-b"
				role="tablist"
				aria-label="Secciones"
			>
				{TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						id={`tab-${tab.id}`}
						aria-selected={activeTab === tab.id}
						aria-controls={`panel-${tab.id}`}
						className="relative flex-1 cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-[0.2rem] py-2 text-center font-[inherit] font-bold text-text-subtle transition-colors duration-150 hover:text-text aria-selected:text-text"
						onClick={() => setActiveTab(tab.id)}
					>
						{tab.label}
						{activeTab === tab.id && (
							<motion.span
								className="absolute right-0 bottom-px left-0 h-0.5 bg-text"
								layoutId="configurationTabIndicator"
								transition={{ type: "spring", stiffness: 500, damping: 40 }}
							/>
						)}
					</button>
				))}
			</div>

			<motion.div className="overflow-hidden">
				<AnimatePresence mode="wait" initial={false}>
					{activeTab === "account" ? (
						<motion.div
							key="account"
							id="panel-account"
							role="tabpanel"
							aria-labelledby="tab-account"
							className="flex flex-col gap-4"
							variants={motionVariants.tabContentSwitch}
							initial="hidden"
							animate="visible"
							exit="hidden"
						>
							<AccountTab profile={profile} onSaveProfile={onSaveProfile} />
						</motion.div>
					) : (
						<motion.div
							key="game"
							id="panel-game"
							role="tabpanel"
							aria-labelledby="tab-game"
							className="flex flex-col gap-4"
							variants={motionVariants.tabContentSwitch}
							initial="hidden"
							animate="visible"
							exit="hidden"
						>
							<GameTab
								mode={mode}
								onModeChange={onModeChange}
								order={order}
								onOrderChange={onOrderChange}
								timerDuration={timerDuration}
								onTimerDurationChange={onTimerDurationChange}
								difficulty={difficulty}
								onDifficultyChange={onDifficultyChange}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</Modal>
	);
}
