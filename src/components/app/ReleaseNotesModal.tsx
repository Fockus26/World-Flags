import { Accordion } from "@heroui/react";
import { Modal } from "@/components/ui/Modal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { APP_VERSION, CHANGELOG } from "@/data/changelog";

interface ReleaseNotesModalProps {
	isOpen: boolean;
	onClose: () => void;
}

// ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #20): pendiente de aprobación
// del dueño. El contenido de cada versión NO es copy de UI: es
// `CHANGELOG.md` tal cual (D057).
const CURRENT_VERSION_LABEL = "Estás usando la versión";

function formatReleaseDate(date: string): string {
	// Medianoche UTC formateada en UTC: sin `timeZone`, en América el
	// 2026-09-21 saldría como 20 de septiembre.
	return new Date(`${date}T00:00:00Z`).toLocaleDateString("es", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

function headingId(version: string): string {
	return `release-notes-${version.replaceAll(".", "-")}`;
}

/**
 * "Novedades": las entradas de `CHANGELOG.md` que viajan en este bundle, de la
 * más nueva a la más vieja (D057). Mismo esqueleto que `AchievementsModal`
 * (título + "Cerrar" arriba, scroll propio del `Modal`, D012).
 *
 * Cada versión es un elemento del `Accordion` de HeroUI (D086): expansión
 * única (su valor por defecto, `allowsMultipleExpanded={false}`), la versión
 * que corre abierta al montar y las anteriores cerradas. Teclado, foco,
 * `aria-expanded`/`aria-controls` y la animación de alto (transición CSS
 * sobre `--disclosure-panel-height`, con `motion-reduce:transition-none`)
 * vienen de HeroUI / React Aria.
 */
export function ReleaseNotesModal({ isOpen, onClose }: ReleaseNotesModalProps) {
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className="w-[min(32rem,92vw)] text-left"
			ariaLabelledby="release-notes-title"
		>
			<header className="mb-3 flex items-center justify-between gap-3">
				<h2 id="release-notes-title" className="m-0">
					Novedades
				</h2>
				<ModalCloseButton onClose={onClose} />
			</header>

			<p className="mt-0 mb-4 text-sm">
				{CURRENT_VERSION_LABEL} <strong>{APP_VERSION}</strong>.
			</p>

			{/* El modal se desmonta al cerrarse, así que `defaultExpandedKeys`
			    vuelve a aplicarse en cada apertura: siempre se abre con la
			    versión que corre desplegada, también desde "Ver novedades". */}
			<Accordion
				defaultExpandedKeys={[APP_VERSION]}
				className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
			>
				{CHANGELOG.map((entry) => (
					<Accordion.Item key={entry.version} id={entry.version}>
						{/* h2 del modal → h3 por versión → h4 por sección. */}
						<Accordion.Heading level={3}>
							{/* El `id` del disparador es el que nombra al panel
							    (`aria-labelledby`, lo pone React Aria). Hover y foco
							    de teclado comparten fondo (`DESIGN_RULES.md`), y el foco
							    suma el anillo `--focus` que ya trae HeroUI. */}
							<Accordion.Trigger
								id={headingId(entry.version)}
								className="gap-3 rounded-md px-2 py-3 hover:bg-surface-hover data-[focus-visible=true]:bg-surface-hover"
							>
								<span className="flex flex-col gap-0.5">
									<span className="text-base font-extrabold text-surface-soft">
										Versión {entry.version}
									</span>
									<span className="text-xs font-normal text-text-placeholder">
										<time dateTime={entry.date}>
											{formatReleaseDate(entry.date)}
										</time>
									</span>
								</span>
								<Accordion.Indicator className="text-text-placeholder" />
							</Accordion.Trigger>
						</Accordion.Heading>

						<Accordion.Panel>
							<Accordion.Body className="flex flex-col gap-3 px-2 pt-1 pb-4 text-surface-soft">
								{entry.sections.map((section) => (
									<div key={section.name} className="flex flex-col gap-1.5">
										<h4 className="m-0 text-xs font-extrabold tracking-wide text-text-placeholder uppercase">
											{section.name}
										</h4>

										<ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-surface-soft">
											{section.items.map((item) => (
												<li key={item}>{item}</li>
											))}
										</ul>
									</div>
								))}
							</Accordion.Body>
						</Accordion.Panel>
					</Accordion.Item>
				))}
			</Accordion>
		</Modal>
	);
}
