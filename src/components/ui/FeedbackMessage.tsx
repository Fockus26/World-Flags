import { Alert } from "@heroui/react";
import { type ReactNode, useEffect } from "react";

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

/**
 * El Alert de HeroUI por defecto es una tarjeta muy sutil (fondo `--surface`,
 * solo el ícono/título llevan color). Aquí se le fuerza un fondo `*-soft` con
 * borde del color, ícono y texto centrados verticalmente, y radios/espaciado
 * más contenidos para que se lea claramente como aviso.
 */
const variantClass: Record<FeedbackVariant, string> = {
	success:
		"!bg-[var(--success-soft)] border border-[color-mix(in_oklab,var(--success)_45%,transparent)]",
	danger:
		"!bg-[var(--danger-soft)] border border-[color-mix(in_oklab,var(--danger)_45%,transparent)]",
};

const sizeClass: Record<FeedbackSize, string> = {
	sm: "!py-2 !px-3 !gap-2 text-xs",
	md: "!py-2.5 !px-3.5 !gap-2.5 text-[0.9rem]",
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
	}, [autoDismissMs, onDismiss]);

	return (
		<Alert
			status={variant}
			role={role}
			className={`m-0 !items-center !rounded-[var(--radius)] !shadow-none animate-in fade-in-0 slide-in-from-top-1 duration-200 ${variantClass[variant]} ${sizeClass[size]}`}
		>
			<Alert.Indicator />
			<Alert.Content className="!justify-center">{children}</Alert.Content>
		</Alert>
	);
}
