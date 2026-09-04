/**
 * Fecha local (no UTC) en formato YYYY-MM-DD.
 *
 * A diferencia de `date.toISOString().slice(0, 10)` (usado por el sistema de
 * repetición espaciada para `dueDate`), esto respeta la medianoche del
 * dispositivo del usuario en vez de la medianoche UTC.
 */
export function getLocalDateString(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}
