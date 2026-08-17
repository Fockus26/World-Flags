import { motion } from "framer-motion";

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
			className={`relative flex size-14 shrink-0 items-center justify-center ${
				isDanger ? "text-danger-text" : ""
			}`}
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
					className={`fill-none ${isDanger ? "stroke-(--color-danger-text)" : "stroke-(--color-progress-bg)"}`}
					cx="30"
					cy="30"
					r={RADIUS}
					strokeWidth="5"
				/>
				<motion.circle
					className={`fill-none ${
						isDanger ? "stroke-(--color-danger-bg)" : "stroke-(--color-primary)"
					}`}
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
				className="relative text-[1.1rem] font-extrabold tabular-nums text-text transition-colors duration-180 ease-in-out"
				key={timeLeft}
				initial={{ opacity: 0.4, scale: 0.85 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.18 }}
				style={isDanger ? { color: "var(--color-danger-text)" } : undefined}
			>
				{timeLeft}
			</motion.span>
		</div>
	);
}
