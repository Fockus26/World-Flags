import { CheckCircle, Lock } from "iconoir-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { type AchievementView, useAchievements } from "@/hooks/useAchievements";
import {
	ACHIEVEMENT_CATEGORIES,
	ACHIEVEMENT_CATEGORY_LABELS,
} from "@/utils/achievements";

interface AchievementsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

function formatUnlockedAt(isoDate: string): string {
	return new Date(isoDate).toLocaleDateString("es", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function AchievementRow({ achievement }: { achievement: AchievementView }) {
	const { progress, unlocked, unlockedAt } = achievement;

	const hasBar = progress.target > 1;

	const percentage = Math.min(
		100,
		Math.round((progress.current / progress.target) * 100),
	);

	/**
	 * El estado NUNCA va solo por color ni por opacidad: bloqueado lleva icono
	 * de candado y la palabra "Bloqueado", y el progreso se dice en texto además
	 * de dibujarse en la barra (`context/DESIGN_RULES.md`).
	 */
	const statusLabel = unlocked
		? unlockedAt
			? `Desbloqueado el ${formatUnlockedAt(unlockedAt)}`
			: "Desbloqueado"
		: hasBar
			? `Bloqueado — ${progress.current}/${progress.target}`
			: "Bloqueado";

	return (
		<li
			className={`flex items-start gap-3 rounded-md border px-3 py-2.5 ${
				unlocked
					? // El borde reutiliza el mismo `color-mix` que ya usa
						// `FeedbackMessage` para sus variantes de color — no un verde
						// nuevo inventado.
						"border-[color-mix(in_oklab,var(--success)_45%,transparent)] bg-success-soft"
					: "border-surface-border bg-surface"
			}`}
		>
			<span className="shrink-0 text-[1.35rem] leading-none" aria-hidden="true">
				{achievement.emoji}
			</span>

			<span className="flex min-w-0 flex-1 flex-col gap-1">
				{/* El nombre NUNCA va coloreado (ni verde ni morado): sobre fondo
				    claro `text-success` da 2.71:1 y `text-primary` 3.97:1, ambos
				    fallan AA (`context/DESIGN_RULES.md`). Lo desbloqueado se
				    distingue por el tinte de la tarjeta, el borde, el icono
				    (`text-success-hover`, que sí cumple 3:1) y el texto de
				    estado — nunca solo por el color del texto. */}
				<strong className="text-[0.95rem] text-surface-soft">
					{achievement.name}
				</strong>

				<span className="text-[0.8rem] text-text-placeholder">
					{achievement.description}
				</span>

				{hasBar && !unlocked && (
					<span
						className="mt-0.5 h-1.5 w-full overflow-hidden rounded-sm bg-surface-hover"
						aria-hidden="true"
					>
						<span
							className="block h-full rounded-sm bg-surface-soft"
							style={{ width: `${percentage}%` }}
						/>
					</span>
				)}

				<span className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] font-semibold text-text-placeholder">
					{unlocked ? (
						<CheckCircle
							className="size-3.5 shrink-0 text-success-hover"
							aria-hidden="true"
						/>
					) : (
						<Lock className="size-3.5 shrink-0" aria-hidden="true" />
					)}
					{statusLabel}
				</span>
			</span>
		</li>
	);
}

export function AchievementsModal({ isOpen, onClose }: AchievementsModalProps) {
	// Marcar como visto NO se hace aquí con un efecto sobre `isOpen`: quien
	// abre el modal es quien lo sabe, así que lo hace el `onClick` del botón
	// (ver `Configuration.tsx`). Así este componente se queda solo con pintar.
	const { catalog, unlockedCount, totalCount } = useAchievements();

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className="w-[min(32rem,92vw)] text-left"
			ariaLabelledby="achievements-title"
		>
			<header className="mb-3 flex items-center justify-between gap-3">
				<h2 id="achievements-title" className="m-0">
					Logros
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

			<p className="mt-0 mb-4 text-[0.85rem] text-text-placeholder">
				Llevas <strong>{unlockedCount}</strong> de {totalCount} desbloqueados.
			</p>

			<div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
				{ACHIEVEMENT_CATEGORIES.map((category) => {
					const items = catalog.filter((item) => item.category === category);

					if (items.length === 0) return null;

					return (
						<section key={category}>
							<h3 className="m-0 mb-2 text-[0.8rem] font-black tracking-wide text-text-placeholder uppercase">
								{ACHIEVEMENT_CATEGORY_LABELS[category]}
							</h3>

							<ul className="m-0 flex list-none flex-col gap-2 p-0">
								{items.map((achievement) => (
									<AchievementRow
										key={achievement.id}
										achievement={achievement}
									/>
								))}
							</ul>
						</section>
					);
				})}
			</div>
		</Modal>
	);
}
