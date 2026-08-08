import { motion } from "framer-motion";
import { type MouseEvent, type ReactNode, useEffect } from "react";
import { motionVariants } from "@/styles/animations";
import styles from "./Modal.module.css";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	className?: string;
	role?: string;
	ariaLabelledby?: string;
	ariaDescribedby?: string;
}

export function Modal({
	isOpen,
	onClose,
	children,
	className,
	role = "dialog",
	ariaLabelledby,
	ariaDescribedby,
}: ModalProps) {
	useEffect(() => {
		if (!isOpen) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onClose();
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	return (
		<motion.div
			className={styles.modalOverlay}
			role="presentation"
			onMouseDown={handleOverlayClick}
			variants={motionVariants.overlayAppear}
			initial="hidden"
			animate="visible"
		>
			<motion.section
				className={`${styles.modal}${className ? ` ${className}` : ""}`}
				role={role}
				aria-modal="true"
				aria-labelledby={ariaLabelledby}
				aria-describedby={ariaDescribedby}
				variants={motionVariants.modalAppear}
				initial="hidden"
				animate="visible"
			>
				{children}
			</motion.section>
		</motion.div>
	);
}
