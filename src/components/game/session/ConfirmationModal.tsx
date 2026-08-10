import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import styles from "./ConfirmationModal.module.css";

interface ConfirmationModalProps {
	isOpen: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function ConfirmationModal({ isOpen, onCancel, onConfirm }: ConfirmationModalProps) {
	const cancelButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		cancelButtonRef.current?.focus();

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onCancel();
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onCancel]);

	if (!isOpen) {
		return null;
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onCancel}
			ariaLabelledby="exit-modal-title"
			ariaDescribedby="exit-modal-description"
		>
			<div className={styles.modalIcon} aria-hidden="true">
				!
			</div>

			<h2 id="exit-modal-title">¿Abandonar la práctica?</h2>

			<p id="exit-modal-description">
				El progreso de esta partida se perderá y no se guardará ninguna calificación.
			</p>

			<div className={styles.modalActions}>
				<Button ref={cancelButtonRef} variant="secondary" type="button" onClick={onCancel}>
					Continuar practicando
				</Button>

				<Button variant="danger" type="button" onClick={onConfirm}>
					Sí, abandonar
				</Button>
			</div>
		</Modal>
	);
}
