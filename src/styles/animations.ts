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
	},

	overlayAppear: {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: motionTransition(0.16),
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
