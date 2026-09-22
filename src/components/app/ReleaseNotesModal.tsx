import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
				<Button
					variant="text"
					color="danger"
					type="button"
					fullWidth={false}
					onClick={onClose}
				>
					Cerrar
				</Button>
			</header>

			<p className="mt-0 mb-4 text-sm">
				{CURRENT_VERSION_LABEL} <strong>{APP_VERSION}</strong>.
			</p>

			<div className="flex flex-col gap-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
				{CHANGELOG.map((entry) => (
					<section
						key={entry.version}
						aria-labelledby={headingId(entry.version)}
						className="flex flex-col gap-3"
					>
						<div className="flex flex-col gap-0.5">
							<h3 id={headingId(entry.version)}>Versión {entry.version}</h3>
							<p className="text-xs">
								<time dateTime={entry.date}>
									{formatReleaseDate(entry.date)}
								</time>
							</p>
						</div>

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
					</section>
				))}
			</div>
		</Modal>
	);
}
