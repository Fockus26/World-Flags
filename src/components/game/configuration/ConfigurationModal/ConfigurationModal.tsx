import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { PracticeOrder, TimerDuration } from "@/types/country";
import type { UserProfile } from "@/types/progress";
import { AccountTab } from "./AccountTab";
import styles from "./ConfigurationModal.module.css";
import { GameTab } from "./GameTab";

type ConfigurationModalTab = "account" | "game";

interface ConfigurationModalProps {
	isOpen: boolean;
	onClose: () => void;
	profile: UserProfile;
	onSaveProfile: (profile: UserProfile) => void;
	order: PracticeOrder;
	onOrderChange: (order: PracticeOrder) => void;
	timerDuration: TimerDuration;
	onTimerDurationChange: (duration: TimerDuration) => void;
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
	order,
	onOrderChange,
	timerDuration,
	onTimerDurationChange,
}: ConfigurationModalProps) {
	const [activeTab, setActiveTab] = useState<ConfigurationModalTab>("account");

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className={styles.configurationModal}
			ariaLabelledby="user-modal-title"
		>
			<header className={styles.header}>
				<h2 id="user-modal-title">Perfil y configuración</h2>
				<Button variant="exit" type="button" onClick={onClose}>
					Cerrar
				</Button>
			</header>

			<div className={styles.tabList} role="tablist" aria-label="Secciones">
				{TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						id={`tab-${tab.id}`}
						aria-selected={activeTab === tab.id}
						aria-controls={`panel-${tab.id}`}
						className={
							activeTab === tab.id
								? `${styles.tabButton} ${styles.tabButtonActive}`
								: styles.tabButton
						}
						onClick={() => setActiveTab(tab.id)}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div
				id="panel-account"
				role="tabpanel"
				aria-labelledby="tab-account"
				hidden={activeTab !== "account"}
				className={styles.tabPanel}
			>
				{activeTab === "account" && (
					<AccountTab profile={profile} onSaveProfile={onSaveProfile} />
				)}
			</div>

			<div
				id="panel-game"
				role="tabpanel"
				aria-labelledby="tab-game"
				hidden={activeTab !== "game"}
				className={styles.tabPanel}
			>
				{activeTab === "game" && (
					<GameTab
						order={order}
						onOrderChange={onOrderChange}
						timerDuration={timerDuration}
						onTimerDurationChange={onTimerDurationChange}
					/>
				)}
			</div>
		</Modal>
	);
}
