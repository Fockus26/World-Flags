import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { motionVariants } from "@/styles/animations";
import styles from "./UserSummary.module.css";

interface UserSummaryProps {
	name: string;
	avatarUrl: string;
	learningProgress: number;
	learnedCountries: number;
	totalCountries: number;
	onEditProfile: () => void;
	onOpenSettings: () => void;
}

export function UserSummary({
	name,
	avatarUrl,
	learningProgress,
	learnedCountries,
	totalCountries,
	onEditProfile,
	onOpenSettings,
}: UserSummaryProps) {
	return (
		<motion.div
			className={styles.userSummary}
			variants={motionVariants.contentEnter}
			initial="hidden"
			animate="visible"
		>
			<button
				className={styles.profileButton}
				type="button"
				onClick={onEditProfile}
			>
				<img
					className={styles.profileAvatar}
					src={avatarUrl}
					alt={`Avatar de ${name}`}
				/>
				<span className={styles.profileText}>
					<strong>{name}</strong>
				</span>
			</button>

			<div className={styles.globalProgress}>
				<div className={styles.globalProgressHeader}>
					<span>Progreso global</span>
					<span className={styles.globalProgressStats}>
						<strong>{learningProgress}%</strong>
						<small>
							{learnedCountries}/{totalCountries}
						</small>
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
				onClick={onOpenSettings}
			>
				⚙️
			</Button>
		</motion.div>
	);
}
