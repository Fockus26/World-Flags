import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";

// ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #34): pendiente de aprobación
// del dueño.
const TITLE = "Hay que actualizar";
const DESCRIPTION =
	"Esta versión de World Flags ya no es compatible. Actualiza para seguir jugando; tu progreso guardado se conserva.";
const ACTION = "Actualizar";
const ACTION_PENDING = "Actualizando…";

/**
 * Actualización obligatoria (D109, D111): si la versión que corre está por
 * debajo de la mínima publicada, un diálogo tapa el juego con un único botón
 * "Actualizar". No se cierra ni con clic fuera ni con Escape: seguir jugando
 * con reglas viejas es justo lo que se quiere evitar.
 *
 * `alertdialog` (interrumpe y exige respuesta) nombrado por su título y
 * descrito por su texto; el foco entra directo en el botón, la única acción.
 *
 * Se monta solo cuando hace falta: quien decide es `useRequiredUpdate` en
 * `FlagGame` (sin red o sin la tabla `app_config`, nunca; D110).
 */
export function RequiredUpdateDialog() {
	const { forceUpdate } = useServiceWorkerUpdate();
	const [isUpdating, setIsUpdating] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);

	// El efecto del hijo corre antes que el del diálogo de React Aria, que
	// solo mueve el foco al diálogo si no hay ya algo enfocado dentro.
	useEffect(() => {
		buttonRef.current?.focus();
	}, []);

	function handleUpdate() {
		// Sin `disabled`: el botón perdería el foco. Un segundo clic no hace nada.
		if (isUpdating) return;

		setIsUpdating(true);
		void forceUpdate();
	}

	return (
		<Modal
			isOpen
			onClose={() => {}}
			role="alertdialog"
			isDismissable={false}
			isKeyboardDismissDisabled
			ariaLabelledby="required-update-title"
			ariaDescribedby="required-update-description"
			size="sm"
			className="w-[min(24rem,92vw)] text-left"
		>
			<div className="flex flex-col gap-4">
				<div className="flex items-start gap-3">
					<span
						className="shrink-0 text-[1.5rem] leading-none"
						aria-hidden="true"
					>
						🔄
					</span>
					<div className="flex min-w-0 flex-col gap-1">
						<h2 id="required-update-title" className="m-0">
							{TITLE}
						</h2>
						<p
							id="required-update-description"
							className="m-0 text-sm leading-relaxed text-surface-soft"
						>
							{DESCRIPTION}
						</p>
					</div>
				</div>

				<Button
					ref={buttonRef}
					color="primary"
					fullWidth
					onClick={handleUpdate}
				>
					{isUpdating ? ACTION_PENDING : ACTION}
				</Button>
			</div>
		</Modal>
	);
}
