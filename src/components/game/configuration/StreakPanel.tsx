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
			// `max-w-sm`: las celdas del calendario son cuadradas y ocupan un
			// séptimo del ancho, así que sin tope el panel crece con la tarjeta
			// (celdas de ~90 px y un panel más alto que la pantalla en móvil
			// horizontal). El diseño elegido se dibujó a ~358 px de ancho.
			className="flex max-w-sm flex-col gap-3 rounded-[var(--radius-md)] border border-surface-border bg-surface-hover/40 p-3 mt-2"
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

			<div className="flex flex-col gap-1.5">
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
								className={
									cell.isToday
										? "aspect-square rounded-[3px] border-2 border-dashed border-warning"
										: cell.practiced
											? "aspect-square rounded-[3px] bg-primary"
											: "aspect-square rounded-[3px] bg-surface-hover"
								}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
