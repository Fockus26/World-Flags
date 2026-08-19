import type { Transition } from "framer-motion";

export const motionTransition = (
	duration = 0.2,
	ease: Transition["ease"] = "easeOut",
): Transition => ({
	duration,
	ease,
});

export const motionVariants = {
	contentEnter: {
		hidden: { opacity: 0, y: 8 },
		visible: {
			opacity: 1,
			y: 0,
			transition: motionTransition(0.28),
		},
	},

	flagEnter: {
		hidden: { opacity: 0, y: 12, scale: 0.96 },
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: motionTransition(0.28),
		},
	},

	feedbackEnter: {
		hidden: { opacity: 0, y: 4 },
		visible: {
			opacity: 1,
			y: 0,
			transition: motionTransition(0.2),
		},
		exit: {
			opacity: 0,
			y: -4,
			transition: motionTransition(0.15),
		},
	},

	answerFeedbackEnter: {
		hidden: { opacity: 0, y: 4 },
		visible: {
			opacity: 1,
			y: 0,
			transition: motionTransition(0.12),
		},
		exit: {
			opacity: 0,
			y: -4,
			transition: motionTransition(0.1),
		},
	},

	overlayAppear: {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: motionTransition(0.16),
		},
		exit: {
			opacity: 0,
			transition: motionTransition(0.14, "easeIn"),
		},
	},

	modalAppear: {
		hidden: { opacity: 0, y: 12, scale: 0.97 },
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: motionTransition(0.18),
		},
		exit: {
			opacity: 0,
			y: 8,
			scale: 0.98,
			transition: motionTransition(0.14, "easeIn"),
		},
	},
	tabContentSwitch: {
		hidden: { opacity: 0, x: 8 },
		visible: {
			opacity: 1,
			x: 0,
			transition: motionTransition(0.2),
		},
	},
	dropdownAppear: {
		hidden: { opacity: 0, y: -4, scale: 0.98 },
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: motionTransition(0.14),
		},
	},
	rotateArrow: {
		closed: { rotate: 0 },
		open: { rotate: 180 },
	},
	timerCritical: {
		scale: [1, 1.05, 1],
		transition: { duration: 0.7, repeat: Infinity, ease: "easeInOut" },
	},
};

export function createMotionVariant(
	source: { opacity?: number; y?: number; scale?: number },
	duration = 0.2,
) {
	return {
		hidden: { ...source },
		visible: {
			...source,
			opacity: 1,
			y: 0,
			scale: source.scale ?? 1,
			transition: motionTransition(duration),
		},
	};
}

export const spinTransition = {
	repeat: Infinity,
	duration: 1,
	ease: "linear",
} as const;
