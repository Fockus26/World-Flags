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
		if (isOpen) {
			cancelButtonRef.current?.focus();
		}
	}, [isOpen]);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onCancel}
			ariaLabelledby="exit-modal-title"
			ariaDescribedby="exit-modal-description"
			className="flex flex-col gap-3.5"
		>
			<div
				className="mx-auto grid size-14 place-items-center rounded-full bg-danger-bg text-[1.75rem] font-black text-danger"
				aria-hidden="true"
			>
				!
			</div>

			<h2>¿Abandonar la práctica?</h2>

			<p>El progreso de esta partida se perderá y no se guardará ninguna calificación.</p>

			<div className="mt-3 grid grid-cols-1 gap-3.5 min-[44rem]:grid-cols-2">
				<Button ref={cancelButtonRef} variant="secondary" type="button" onClick={onCancel}>
					Continuar practicando
				</Button>

				<Button variant="exit" type="button" onClick={onConfirm}>
					Sí, abandonar
				</Button>
			</div>
		</Modal>
	);
}
