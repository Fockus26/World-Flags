import { type FocusEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useReleaseNotes } from "@/hooks/useReleaseNotes";
import { ReleaseNotesModal } from "./ReleaseNotesModal";

/**
 * Aviso de que la app se actualizó en este dispositivo, con acceso a sus
 * novedades (D058). Es un aviso y no el modal abierto solo: quien abre la app
 * viene a practicar, y un diálogo al arrancar le quitaría el foco y taparía
 * la pantalla por algo que puede esperar. Sale una vez por versión y
 * dispositivo; "Ahora no" o cerrar las novedades lo dan por visto.
 *
 * Copy provisional, ver `context/CONTENT_CHECKLIST.md` #20.
 *
 * Monta su propio contenido, sin posicionamiento: vive dentro del contenedor
 * apilable de `SystemSnackbars`, como `UpdateAvailableSnackbar`.
 */
export function ReleaseNotesSnackbar() {
	const { announcedRelease, markSeen } = useReleaseNotes();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isDismissed, setIsDismissed] = useState(false);
	// Dónde estaba el foco antes de entrar en el aviso. El aviso desaparece al
	// responderle, así que no puede recibir el foco de vuelta (tampoco al
	// cerrar el modal que abrió): vuelve aquí, como en los toasts de React
	// Aria. `null` = venía de la nada (clic sin foco previo): se queda en body.
	const returnFocusRef = useRef<HTMLElement | null>(null);
	const cardRef = useRef<HTMLDivElement>(null);

	if (!announcedRelease) {
		return null;
	}

	/** En el `onFocus` de cada botón: pasar de uno a otro no cuenta. */
	function rememberReturnFocus(event: FocusEvent<Element>) {
		const from = event.relatedTarget;

		if (from instanceof Node && cardRef.current?.contains(from)) return;

		returnFocusRef.current = from instanceof HTMLElement ? from : null;
	}

	/**
	 * Mueve el foco a donde estaba antes del aviso. Se llama antes de que el
	 * aviso desaparezca; al abrir el modal, antes de abrirlo, para que el modal
	 * lo tome como el elemento al que devolver el foco cuando se cierre.
	 */
	function returnFocus() {
		const target = returnFocusRef.current;

		if (target?.isConnected) {
			target.focus({ preventScroll: true });
		} else if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	}

	const dismiss = () => {
		markSeen();
		setIsDismissed(true);
	};

	return (
		<>
			{/* Mientras las novedades están abiertas el aviso se oculta: si no,
			    quedaría flotando por encima del fondo del modal. */}
			{!isDismissed && !isModalOpen && (
				<div
					ref={cardRef}
					className="pointer-events-auto flex w-full flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3 shadow-xl duration-200 animate-in fade-in-0 slide-in-from-top-4"
				>
					<div className="flex items-start gap-3">
						<span className="shrink-0 text-2xl leading-none" aria-hidden="true">
							✨
						</span>

						<span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
							<strong className="text-sm text-surface-soft">
								Novedades de la versión {announcedRelease.version}
							</strong>
							<span className="text-xs text-text-placeholder">
								La app se actualizó. Mira qué ha cambiado.
							</span>
						</span>
					</div>

					<div className="flex gap-2">
						<Button
							color="neutral"
							variant="soft"
							onFocus={rememberReturnFocus}
							onClick={() => {
								returnFocus();
								dismiss();
							}}
						>
							Ahora no
						</Button>
						<Button
							color="primary"
							onFocus={rememberReturnFocus}
							onClick={() => {
								returnFocus();
								setIsModalOpen(true);
							}}
						>
							Ver novedades
						</Button>
					</div>
				</div>
			)}

			{/* Sigue montado tras cerrarse (`isDismissed`) para que el modal
			    haga su animación de salida en vez de desaparecer de golpe. */}
			<ReleaseNotesModal
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false);
					dismiss();
				}}
			/>
		</>
	);
}
