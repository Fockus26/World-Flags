import {
	useEffect,
	useRef,
	type MouseEvent,
} from "react";
import styles from "./FlagGame.module.css";

interface ConfirmationModalProps {
	isOpen: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function ConfirmationModal({
	isOpen,
	onCancel,
	onConfirm,
}: ConfirmationModalProps) {
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

	function handleOverlayClick(
		event: MouseEvent<HTMLDivElement>,
	) {
		if (event.target === event.currentTarget) {
			onCancel();
		}
	}

	return (
		<div
			className={styles.modalOverlay}
			role="presentation"
			onMouseDown={handleOverlayClick}
		>
			<section
				className={styles.modal}
				role="dialog"
				aria-modal="true"
				aria-labelledby="exit-modal-title"
				aria-describedby="exit-modal-description"
			>
				<div className={styles.modalIcon} aria-hidden="true">
					!
				</div>

				<h2 id="exit-modal-title">
					¿Abandonar la práctica?
				</h2>

				<p id="exit-modal-description">
					El progreso de esta partida se perderá y no se
					guardará ninguna calificación.
				</p>

				<div className={styles.modalActions}>
					<button
						ref={cancelButtonRef}
						className={styles.secondaryButton}
						type="button"
						onClick={onCancel}
					>
						Continuar practicando
					</button>

					<button
						className={styles.dangerButton}
						type="button"
						onClick={onConfirm}
					>
						Sí, abandonar
					</button>
				</div>
			</section>
		</div>
	);
}