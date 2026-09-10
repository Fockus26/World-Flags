import { ModalBackdrop, ModalContainer, ModalDialog } from "@heroui/react";
import type { ReactNode } from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	className?: string;
	role?: "dialog" | "alertdialog";
	ariaLabel?: string;
	ariaLabelledby?: string;
	ariaDescribedby?: string;
	size?: "xs" | "sm" | "md" | "lg";
	/** @deprecated HeroUI dimensiona el diálogo solo; se ignora. */
	animateHeight?: boolean;
}

/**
 * Diálogo modal sobre HeroUI v3 (React Aria): focus-trap, cierre con Escape,
 * scroll-lock y `aria-modal` vienen incluidos. `onClose` se dispara tanto con
 * Escape como al hacer clic fuera (`isDismissable`).
 */
export function Modal({
	isOpen,
	onClose,
	children,
	className,
	role = "dialog",
	ariaLabel,
	ariaLabelledby,
	ariaDescribedby,
	size = "md",
}: ModalProps) {
	return (
		<ModalBackdrop
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			isDismissable
			variant="blur"
		>
			<ModalContainer size={size} placement="center">
				<ModalDialog
					role={role}
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledby}
					aria-describedby={ariaDescribedby}
					className={className}
				>
					{children}
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
}
