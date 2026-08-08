import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
	type PracticeOrder,
	TIMER_DURATIONS,
	type TimerDuration,
} from "@/types/country";
import styles from "./SettingsModal.module.css";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	order: PracticeOrder;
	onOrderChange: (order: PracticeOrder) => void;
	timerDuration: TimerDuration;
	onTimerDurationChange: (duration: TimerDuration) => void;
}

export function SettingsModal({
	isOpen,
	onClose,
	order,
	onOrderChange,
	timerDuration,
	onTimerDurationChange,
}: SettingsModalProps) {
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			ariaLabelledby="game-settings-title"
		>
			<header className={styles.header}>
				<h2 id="game-settings-title">Configuración</h2>
				<Button variant="exit" type="button" onClick={onClose}>
					Cerrar
				</Button>
			</header>

			<fieldset className={styles.fieldset}>
				<legend>Orden</legend>

				<div className={styles.optionGrid}>
					<label className={styles.option}>
						<input
							type="radio"
							name="settings-order"
							checked={order === "alphabetical"}
							onChange={() => onOrderChange("alphabetical")}
						/>
						<span>Alfabético</span>
					</label>

					<label className={styles.option}>
						<input
							type="radio"
							name="settings-order"
							checked={order === "random"}
							onChange={() => onOrderChange("random")}
						/>
						<span>Aleatorio</span>
					</label>
				</div>
			</fieldset>

			<fieldset className={styles.fieldset}>
				<legend>Temporizador</legend>

				<div className={styles.timerGrid}>
					{TIMER_DURATIONS.map((duration) => (
						<label className={styles.option} key={duration}>
							<input
								type="radio"
								name="settings-timer"
								checked={timerDuration === duration}
								onChange={() => onTimerDurationChange(duration)}
							/>
							<span>{duration}s</span>
						</label>
					))}
				</div>
			</fieldset>

			<fieldset className={styles.fieldset}>
				<legend>Tema</legend>
				<ThemeSwitcher />
			</fieldset>
		</Modal>
	);
}
