import { Button } from "@/components/ui/Button";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";

/**
 * Aviso in-app (sin pedir permiso) de que hay una versión nueva instalada y
 * esperando (ver `public/sw.js`, ya sin `skipWaiting()` automático). Copy
 * provisional, ver `context/CONTENT_CHECKLIST.md`.
 *
 * Monta su propio contenido, sin posicionamiento: vive dentro del contenedor
 * apilable de `SystemSnackbars` junto con `DailyReminderPrompt`, para que dos
 * avisos a la vez no se superpongan visualmente.
 */
export function UpdateAvailableSnackbar({
	onDismiss,
}: {
	onDismiss: () => void;
}) {
	const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

	if (!updateAvailable) {
		return null;
	}

	return (
		<div className="pointer-events-auto flex w-full flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3 shadow-xl duration-200 animate-in fade-in-0 slide-in-from-top-4">
			<div className="flex items-start gap-3">
				<span
					className="shrink-0 text-[1.5rem] leading-none"
					aria-hidden="true"
				>
					🔄
				</span>

				<span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
					<strong className="text-[0.9rem] text-surface-soft">
						Hay una versión nueva
					</strong>
					<span className="text-[0.78rem] text-text-placeholder">
						Actualiza para ver las últimas mejoras.
					</span>
				</span>
			</div>

			<div className="flex gap-2">
				<Button color="neutral" variant="soft" onClick={onDismiss}>
					Ahora no
				</Button>
				<Button color="primary" onClick={applyUpdate}>
					Actualizar
				</Button>
			</div>
		</div>
	);
}
