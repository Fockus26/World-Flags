import { Dropdown, Label } from "@heroui/react";
import { MoreVert } from "iconoir-react";
import { IconButton } from "@/components/ui/IconButton";
import { POPOVER_MOTION_CLASS } from "@/components/ui/popover-motion";

export type ConfigurationMenuAction = "achievements" | "leaderboard" | "places";

interface ConfigurationMenuProps {
	/** Logros desbloqueados que aún no se han visto. */
	unseenCount: number;
	/** Países elegidos a mano que existen en el catálogo. */
	customCatalogCount: number;
	/** Carga inicial (D042): sin contadores hasta que llegan los datos. */
	isLoading: boolean;
	onAction: (action: ConfigurationMenuAction) => void;
	className?: string;
}

// Contador sobre un icono o en una opción del menú. Lo comparten los iconos
// de escritorio de `Configuration` y este menú.
export const COUNT_BADGE_CLASS =
	"flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-black text-primary-soft";

// Ancho fijo: los tres emojis no miden lo mismo y los textos de las opciones
// quedaban desalineados.
const EMOJI_CLASS = "w-6 shrink-0 text-center text-lg leading-none";

/**
 * Menú ⋮ de la cabecera en móvil (D096): sustituye a los tres iconos de
 * Logros, Ranking y Elegir países por debajo de `sm`, donde `UserSummary`
 * se quedaba con menos de la mitad de la fila. Es el `Dropdown` de HeroUI
 * (patrón de menú WAI-ARIA de React Aria: flechas, Escape, tecleo de la
 * inicial y cierre al pulsar fuera ya resueltos).
 *
 * Los contadores no se pierden (D098): el de logros sin ver y el de países
 * elegidos aparecen en su opción, y el de logros también sobre el ⋮. El dato
 * va además en el nombre accesible (del botón y de la opción), así que no es
 * un estado comunicado solo por color y forma.
 *
 * Al cerrar un modal abierto desde el menú, React Aria devuelve el foco al ⋮
 * (el menú se lo devuelve al cerrarse y el modal lo recuerda como origen);
 * comprobado con teclado y con puntero, sin código propio.
 */
export function ConfigurationMenu({
	unseenCount,
	customCatalogCount,
	isLoading,
	onAction,
	className,
}: ConfigurationMenuProps) {
	const showUnseen = !isLoading && unseenCount > 0;
	const showPlaces = !isLoading && customCatalogCount > 0;

	// ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #33): nombre del ⋮ y de las
	// opciones, pendiente de aprobación del dueño.
	const triggerLabel = showUnseen
		? `Más opciones, ${unseenCount} logro${unseenCount === 1 ? "" : "s"} sin ver`
		: "Más opciones";

	return (
		<div className={["relative inline-flex", className ?? ""].join(" ")}>
			<Dropdown>
				<IconButton
					type="button"
					color="neutral"
					variant="text"
					aria-label={triggerLabel}
				>
					<MoreVert aria-hidden="true" className="size-6" />
				</IconButton>
				<Dropdown.Popover
					placement="bottom end"
					// HeroUI limita el menú a `48svw` (≈150 px a 320 px): no cabría
					// "Elegir países" con su contador.
					className={`max-w-none min-w-56 ${POPOVER_MOTION_CLASS}`}
				>
					<Dropdown.Menu
						aria-label="Más opciones"
						onAction={(key) => onAction(key as ConfigurationMenuAction)}
					>
						<Dropdown.Item
							id="achievements"
							textValue="Logros"
							className="min-h-11"
						>
							<span aria-hidden="true" className={EMOJI_CLASS}>
								🏅
							</span>
							<Label>
								Logros
								{showUnseen && (
									<span className="sr-only">, {unseenCount} sin ver</span>
								)}
							</Label>
							{showUnseen && (
								<span
									aria-hidden="true"
									className={`ms-auto ${COUNT_BADGE_CLASS}`}
								>
									{unseenCount}
								</span>
							)}
						</Dropdown.Item>
						<Dropdown.Item
							id="leaderboard"
							textValue="Ranking"
							className="min-h-11"
						>
							<span aria-hidden="true" className={EMOJI_CLASS}>
								🏆
							</span>
							<Label>Ranking</Label>
						</Dropdown.Item>
						<Dropdown.Item
							id="places"
							textValue="Elegir países"
							className="min-h-11"
						>
							<span aria-hidden="true" className={EMOJI_CLASS}>
								📍
							</span>
							<Label>
								Elegir países
								{showPlaces && (
									<span className="sr-only">
										, {customCatalogCount} elegido
										{customCatalogCount === 1 ? "" : "s"}
									</span>
								)}
							</Label>
							{showPlaces && (
								<span
									aria-hidden="true"
									className={`ms-auto ${COUNT_BADGE_CLASS}`}
								>
									{customCatalogCount}
								</span>
							)}
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown>

			{showUnseen && (
				<span
					aria-hidden="true"
					className={`pointer-events-none absolute -right-1 -top-1 ${COUNT_BADGE_CLASS}`}
				>
					{unseenCount}
				</span>
			)}
		</div>
	);
}
