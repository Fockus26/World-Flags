import { motion } from "framer-motion";
import styles from "./Timer.module.css";

const DANGER_THRESHOLD = 3;
const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface TimerProps {
	timeLeft: number;
	totalDuration: number;
}

export function Timer({ timeLeft, totalDuration }: TimerProps) {
	const isDanger = timeLeft <= DANGER_THRESHOLD;
	const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
	const dashOffset = CIRCUMFERENCE * (1 - progress);

	return (
		<div
			className={`${styles.timer}${isDanger ? ` ${styles.timerDanger}` : ""}`}
			role="timer"
			aria-live="polite"
			aria-label={`${timeLeft} segundos restantes`}
		>
			<svg className={styles.ring} viewBox="0 0 60 60" aria-hidden="true">
				<circle className={styles.ringTrack} cx="30" cy="30" r={RADIUS} />
				<motion.circle
					className={styles.ringValue}
					cx="30"
					cy="30"
					r={RADIUS}
					strokeDasharray={CIRCUMFERENCE}
					animate={{ strokeDashoffset: dashOffset }}
					transition={{ duration: 0.9, ease: "linear" }}
				/>
			</svg>

			<motion.span
				className={styles.value}
				key={timeLeft}
				initial={{ opacity: 0.4, scale: 0.85 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.18 }}
			>
				{timeLeft}
			</motion.span>
		</div>
	);
}
