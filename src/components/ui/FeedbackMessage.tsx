import { Alert } from "@heroui/react";
import { motion } from "framer-motion";
import { type ReactNode, useEffect } from "react";
import { motionTransition, motionVariants } from "@/styles/animations";

type FeedbackVariant = "success" | "danger";
type FeedbackSize = "sm" | "md";

interface FeedbackMessageProps {
	variant: FeedbackVariant;
	size?: FeedbackSize;
	role?: "alert" | "status";
	autoDismissMs?: number;
	onDismiss?: () => void;
	children: ReactNode;
}

const sizeClass: Record<FeedbackSize, string> = {
	sm: "px-3 py-2 text-xs font-semibold",
	md: "px-3.5 py-3 text-[0.9rem]",
};

export function FeedbackMessage({
	variant,
	size = "md",
	role,
	autoDismissMs,
	onDismiss,
	children,
}: FeedbackMessageProps) {
	useEffect(() => {
		if (!autoDismissMs) return;

		const timeoutId = window.setTimeout(() => {
			onDismiss?.();
		}, autoDismissMs);

		return () => window.clearTimeout(timeoutId);
		// biome-ignore lint/correctness/useExhaustiveDependencies: onDismiss estabilizado por React Compiler (ver docs/components.md)
	}, [autoDismissMs, onDismiss]);

	return (
		<motion.div
			layout
			transition={{ layout: motionTransition(0.2) }}
			variants={
				size === "sm"
					? motionVariants.feedbackEnter
					: motionVariants.answerFeedbackEnter
			}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			<Alert status={variant} role={role} className={`m-0 ${sizeClass[size]}`}>
				<Alert.Indicator />
				<Alert.Content>{children}</Alert.Content>
			</Alert>
		</motion.div>
	);
}
