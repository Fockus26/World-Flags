import { useState } from "react";
import { DailyReminderSnackbar } from "./DailyReminderSnackbar";
import { UpdateAvailableSnackbar } from "./UpdateAvailableSnackbar";

/**
 * Contenedor único, arriba a la derecha, para los avisos "de sistema" (no de
 * juego, por eso separados de `AchievementToasts`): versión nueva disponible
 * y la pregunta de recordatorio diario. Un solo contenedor apilable evita que
 * los dos se superpongan si llegaran a coincidir (poco probable: uno es
 * un evento raro de deploy, el otro ocurre una sola vez en la vida de la
 * cuenta, pero ambos comparten la esquina con `AchievementToasts` de abajo).
 */
export function SystemSnackbars() {
	const [updateDismissed, setUpdateDismissed] = useState(false);

	return (
		<div
			role="status"
			aria-live="polite"
			className="pointer-events-none fixed inset-x-3 top-3 z-[300] flex flex-col gap-2 sm:inset-x-auto sm:right-3 sm:w-[min(22rem,calc(100vw-1.5rem))]"
		>
			{!updateDismissed && (
				<UpdateAvailableSnackbar onDismiss={() => setUpdateDismissed(true)} />
			)}
			<DailyReminderSnackbar />
		</div>
	);
}
