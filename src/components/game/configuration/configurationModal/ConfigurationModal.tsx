import { Tabs } from "@heroui/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type {
	Difficulty,
	GameMode,
	PracticeOrder,
	TimerDuration,
} from "@/types/country";
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
	timerEnabled: boolean;
	onTimerEnabledChange: (enabled: boolean) => void;
	difficulty: Difficulty;
	onDifficultyChange: (difficulty: Difficulty) => void;
}

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
	timerEnabled,
	onTimerEnabledChange,
	difficulty,
	onDifficultyChange,
}: ConfigurationModalProps) {
	const [activeTab, setActiveTab] = useState<ConfigurationModalTab>("account");

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className="w-[min(30rem,92vw)] text-left"
			ariaLabelledby="user-modal-title"
		>
			<header className="mb-3 flex items-center justify-between">
				<h2 id="user-modal-title">Perfil y configuración</h2>
				<Button
					variant="text"
					color="danger"
					type="button"
					fullWidth={false}
					onClick={onClose}
				>
					Cerrar
				</Button>
			</header>

			<Tabs
				selectedKey={activeTab}
				onSelectionChange={(key) => setActiveTab(key as ConfigurationModalTab)}
			>
				<Tabs.List aria-label="Secciones" className="mb-4">
					<Tabs.Tab id="account">Usuario</Tabs.Tab>
					<Tabs.Tab id="game">Juego</Tabs.Tab>
				</Tabs.List>

				<Tabs.Panel id="account" className="flex flex-col gap-4">
					<AccountTab profile={profile} onSaveProfile={onSaveProfile} />
				</Tabs.Panel>

				<Tabs.Panel id="game" className="flex flex-col gap-4">
					<GameTab
						mode={mode}
						onModeChange={onModeChange}
						order={order}
						onOrderChange={onOrderChange}
						timerDuration={timerDuration}
						onTimerDurationChange={onTimerDurationChange}
						timerEnabled={timerEnabled}
						onTimerEnabledChange={onTimerEnabledChange}
						difficulty={difficulty}
						onDifficultyChange={onDifficultyChange}
					/>
				</Tabs.Panel>
			</Tabs>
		</Modal>
	);
}
