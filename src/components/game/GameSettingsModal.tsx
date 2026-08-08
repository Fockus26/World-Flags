import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ThemeSwitcher } from "./ThemeSwitcher";
import {
	TIMER_DURATIONS,
	type PracticeOrder,
	type TimerDuration,
} from "../../types/country";
import styles from "./GameSettingsModal.module.css";

interface GameSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	order: PracticeOrder;
	onOrderChange: (order: PracticeOrder) => void;
	timerDuration: TimerDuration;
	onTimerDurationChange: (duration: TimerDuration) => void;
}

export function GameSettingsModal({
	isOpen,
	onClose,
	order,
	onOrderChange,
	timerDuration,
	onTimerDurationChange,
}: GameSettingsModalProps) {
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