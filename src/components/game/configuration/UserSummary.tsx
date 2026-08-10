import { motion } from "framer-motion";
import { motionVariants } from "@/styles/animations";
import styles from "./UserSummary.module.css";

interface UserSummaryProps {
	name: string;
	avatarUrl: string;
	accountLabel: string;
	learningProgress: number;
	learnedCountries: number;
	totalCountries: number;
	onOpenModal: () => void;
}

export function UserSummary({
	name,
	avatarUrl,
	accountLabel,
	learningProgress,
	learnedCountries,
	totalCountries,
	onOpenModal,
}: UserSummaryProps) {
	return (
		<motion.button
			type="button"
			className={styles.userSummary}
			variants={motionVariants.contentEnter}
			initial="hidden"
			animate="visible"
			aria-label={`${name}, progreso ${learningProgress} por ciento. Abrir perfil y configuración.`}
			onClick={onOpenModal}
		>
			<img
				className={styles.profileAvatar}
				src={avatarUrl}
				alt=""
				aria-hidden="true"
			/>

			<span className={styles.profileInfo}>
				<span className={styles.profileNameRow}>
					<strong>{name}</strong>
					<span className={styles.accountBadge}>{accountLabel}</span>
				</span>

				<span className={styles.globalProgress}>
					<span
						className={styles.globalProgressBar}
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={learningProgress}
					>
						<span
							className={styles.globalProgressValue}
							style={{ width: `${learningProgress}%` }}
						/>
					</span>
					<span className={styles.globalProgressStats}>
						{learningProgress}% · {learnedCountries}/{totalCountries}
					</span>
				</span>
			</span>
		</motion.button>
	);
}
