import { getLocalDateString } from "@/utils/date";
import { getCurrentStreak, getLongestStreak } from "@/utils/learning-storage";

interface StreakPanelProps {
	activeDays: readonly string[];
}

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const MONTH_LABELS = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
];

/**
 * Celda del calendario (D119). Cada columna es 1/7 del ancho del panel, así
 * que a todo el ancho una celda cuadrada llegaría a ~120 px en escritorio.
 * `aspect-square` la deja cuadrada mientras es pequeña (móvil en vertical) y
 * `max-h-7` corta su alto a 28 px: a partir de ahí la celda se ensancha pero
 * no crece hacia abajo, así que la rejilla ocupa todo el ancho sin alargar el
 * panel (móvil en horizontal, 740×360).
 *
 * `w-full` es imprescindible: con el ancho automático del grid, el navegador
 * traslada el `max-height` al ancho a través del `aspect-ratio` y la celda se
 * queda en un cuadrado de 28 px pegado a la izquierda de su columna.
 */
const CELL_CLASS = "aspect-square w-full max-h-7 rounded-[3px]";

interface MonthCell {
	key: string;
	practiced: boolean;
	isToday: boolean;
}

/** Días del mes actual hasta hoy (los que vienen después no se pintan: no
 *  hay forma honesta de mostrar "vencido" para un día que aún no llegó). */
function buildMonthCells(
	activeDays: ReadonlySet<string>,
	today: Date,
): { leadingBlanks: number; cells: MonthCell[]; practicedCount: number } {
	const year = today.getFullYear();
	const month = today.getMonth();
	const todayKey = getLocalDateString(today);
	const daysUpToToday = today.getDate();

	// `getDay()` da 0=domingo..6=sábado; la semana del calendario empieza en
	// lunes, así que se rota para que lunes quede en el índice 0.
	const firstWeekday = new Date(year, month, 1).getDay();
	const leadingBlanks = (firstWeekday + 6) % 7;

	let practicedCount = 0;

	const cells: MonthCell[] = [];

	for (let day = 1; day <= daysUpToToday; day += 1) {
		const key = getLocalDateString(new Date(year, month, day));
		const practiced = activeDays.has(key);

		if (practiced) practicedCount += 1;

		cells.push({ key, practiced, isToday: key === todayKey });
	}

	return { leadingBlanks, cells, practicedCount };
}

/**
 * Contenido del panel de racha: número grande, mejor racha y calendario del
 * mes en curso. Se abre y se cierra desde el badge de `UserSummary`
 * (`isStreakOpen`/`onToggleStreak`, estado que vive en `Configuration`) y se
 * anima con `AutoHeight`, igual que el resto de paneles condicionales del
 * juego (D009).
 *
 * El dato es 100% derivado de `stats.activeDays` (`getCurrentStreak` /
 * `getLongestStreak`, D018): no hay persistencia nueva. El calendario es
 * puramente ilustrativo — va `aria-hidden`, igual que la barra de progreso
 * de `UserSummary`, con el conteo real como texto al lado.
 */
export function StreakPanel({ activeDays }: StreakPanelProps) {
	const currentStreak = getCurrentStreak(activeDays);
	const longestStreak = getLongestStreak(activeDays);

	const today = new Date();
	const activeDaySet = new Set(activeDays);
	const { leadingBlanks, cells, practicedCount } = buildMonthCells(
		activeDaySet,
		today,
	);
	const monthLabel = MONTH_LABELS[today.getMonth()];

	return (
		<div
			id="streak-panel"
			// Una sola columna en todos los anchos (D118, sustituye a D100): racha y
			// mejor racha en una fila arriba y el calendario a todo el ancho de la
			// tarjeta debajo. El tope ya no va en el ancho del calendario sino en el
			// alto de cada celda (`CELL_CLASS`, D119).
			className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-surface-border bg-surface-hover/40 p-3 mt-2"
		>
			<div className="flex items-end justify-between gap-3">
				<div className="flex flex-col gap-0.5">
					<span className="text-3xl font-black leading-none text-primary tabular-nums">
						{currentStreak}
					</span>
					<span className="text-xs font-bold text-text-placeholder">
						{currentStreak === 1 ? "día seguido" : "días seguidos"}
					</span>
				</div>
				<div className="flex flex-col items-end gap-0.5">
					<span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-text-placeholder">
						Mejor racha
					</span>
					<span className="text-lg font-extrabold text-surface-soft tabular-nums">
						{longestStreak}
					</span>
				</div>
			</div>

			<div className="flex w-full flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-surface-soft">
						{monthLabel}
					</span>
					<span className="text-xs font-bold text-text-placeholder">
						{practicedCount} de {cells.length} días
					</span>
				</div>

				{/* Calendario puramente ilustrativo: el conteo accesible ya está
				    en el texto de arriba, igual que la barra de progreso de
				    UserSummary. */}
				<div aria-hidden="true" className="flex flex-col gap-1">
					<div className="grid grid-cols-7 gap-1">
						{WEEKDAY_LABELS.map((label) => (
							<span
								key={label}
								className="text-center text-[0.6rem] font-bold text-text-placeholder"
							>
								{label}
							</span>
						))}
					</div>
					<div className="grid grid-cols-7 gap-1">
						{Array.from({ length: leadingBlanks }).map((_, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: relleno fijo, no reordena
							<span key={`blank-${index}`} />
						))}
						{cells.map((cell) => (
							<span
								key={cell.key}
								className={`${CELL_CLASS} ${
									cell.isToday
										? "border-2 border-dashed border-warning"
										: cell.practiced
											? "bg-primary"
											: "bg-surface-hover"
								}`}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
