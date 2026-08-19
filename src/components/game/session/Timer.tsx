import { motion } from "framer-motion";

type TimerTone = "primary" | "warning" | "danger";

const DANGER_THRESHOLD = 3;
const WARNING_THRESHOLD = 7;

const timerClasses: Record<TimerTone, { track: string; progress: string; text: string }> = {
	primary: {
		track: "stroke-primary-soft",
		progress: "stroke-primary",
		text: "text-primary",
	},
	warning: {
		track: "stroke-warning-soft",
		progress: "stroke-warning",
		text: "text-warning",
	},
	danger: {
		track: "stroke-danger-soft",
		progress: "stroke-danger",
		text: "text-danger",
	},
};

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface TimerProps {
	timeLeft: number;
	totalDuration: number;
}

export function Timer({ timeLeft, totalDuration }: TimerProps) {
	const warningThreshold = Math.min(WARNING_THRESHOLD, totalDuration);

	const tone: TimerTone =
		timeLeft <= DANGER_THRESHOLD
			? "danger"
			: timeLeft <= warningThreshold
				? "warning"
				: "primary";

	const { track, progress: progressClass, text } = timerClasses[tone];
	const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
	const dashOffset = CIRCUMFERENCE * (1 - progress);

	return (
		<div
			className="relative flex size-14 shrink-0 items-center justify-center"
			role="timer"
			aria-live="polite"
			aria-label={`${timeLeft} segundos restantes`}
		>
			<svg
				className="absolute inset-0 size-full -rotate-90"
				viewBox="0 0 60 60"
				aria-hidden="true"
			>
				<circle
					className={`fill-none ${track}`}
					cx="30"
					cy="30"
					r={RADIUS}
					strokeWidth="5"
				/>
				<motion.circle
					className={`fill-none ${progressClass}`}
					cx="30"
					cy="30"
					r={RADIUS}
					strokeWidth="5"
					strokeLinecap="round"
					strokeDasharray={CIRCUMFERENCE}
					animate={{ strokeDashoffset: dashOffset }}
					transition={{ duration: 0.9, ease: "linear" }}
				/>
			</svg>

			<motion.span
				className={`relative text-[1.1rem] font-extrabold tabular-nums transition-colors duration-180 ease-in-out ${text}`}
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
