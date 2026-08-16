import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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
			<div
				className="mx-auto grid size-14 place-items-center rounded-full bg-danger-bg text-[1.75rem] font-black text-danger"
				aria-hidden="true"
			>
				!
			</div>

			<h2 id="exit-modal-title">¿Abandonar la práctica?</h2>

			<p id="exit-modal-description">
				El progreso de esta partida se perderá y no se guardará ninguna calificación.
			</p>

			<div className="mt-6 grid grid-cols-2 gap-2 max-[44rem]:grid-cols-1">
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
