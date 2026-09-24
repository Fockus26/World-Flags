import { CheckCircle, Lock } from "iconoir-react";
import { useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { type AchievementView, useAchievements } from "@/hooks/useAchievements";
import type { GameType } from "@/types/country";
import {
	ACHIEVEMENT_CATEGORIES,
	ACHIEVEMENT_CATEGORY_LABELS,
} from "@/utils/achievements";

interface AchievementsModalProps {
	isOpen: boolean;
	onClose: () => void;
	gameType: GameType;
}

function formatUnlockedAt(isoDate: string): string {
	return new Date(isoDate).toLocaleDateString("es", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

/** Desbloqueado pero todavía no visto en este modal: se resalta y es a lo que se hace scroll al abrir. */
function isNewlyUnlocked(achievement: AchievementView): boolean {
	return achievement.unlockedAt !== null && achievement.seenAt === null;
}

function AchievementCard({
	achievement,
	rowRef,
}: {
	achievement: AchievementView;
	rowRef: (node: HTMLLIElement | null) => void;
}) {
	const { progress, unlocked, unlockedAt } = achievement;
	const isNew = isNewlyUnlocked(achievement);

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
			ref={rowRef}
			// Tarjeta vertical dentro de la rejilla del `ul` (D085): `h-full` +
			// columna flex para que las de una misma fila midan lo mismo (el
			// `li` ya se estira en el grid) y el estado quede siempre abajo,
			// alineado entre vecinas aunque una descripción ocupe más líneas.
			className={`flex h-full flex-col gap-2 rounded-md border px-3 py-2.5 ${
				unlocked
					? // El borde reutiliza el mismo `color-mix` que ya usa
						// `FeedbackMessage` para sus variantes de color — no un verde
						// nuevo inventado.
						`border-[color-mix(in_oklab,var(--success)_45%,transparent)] bg-success-soft${
							isNew
								? " ring-2 ring-[color-mix(in_oklab,var(--success)_55%,transparent)] ring-offset-2 ring-offset-surface"
								: ""
						}`
					: "border-surface-border bg-surface"
			}`}
		>
			<span className="flex items-start gap-2.5">
				<span
					className="shrink-0 text-[1.35rem] leading-none"
					aria-hidden="true"
				>
					{achievement.emoji}
				</span>

				{/* El nombre NUNCA va coloreado (ni verde ni morado): sobre fondo
				    claro `text-success` da 2.71:1 y `text-primary` 3.97:1, ambos
				    fallan AA (`context/DESIGN_RULES.md`). Lo desbloqueado se
				    distingue por el tinte de la tarjeta, el borde, el icono
				    (`text-success-hover`, que sí cumple 3:1) y el texto de
				    estado — nunca solo por el color del texto. Lo recién
				    desbloqueado suma el anillo de arriba MÁS esta etiqueta de
				    texto: nunca solo el anillo, que sería una señal solo de forma/color. */}
				<span className="flex min-w-0 flex-wrap items-center gap-1.5">
					<strong className="text-[0.95rem] text-surface-soft">
						{achievement.name}
					</strong>

					{isNew && (
						// Fondo transparente a propósito: dentro de la tarjeta
						// desbloqueada (bg-success-soft) reutiliza exactamente el
						// mismo par texto/fondo que ya está verificado para
						// `text-success-hover` (el icono del estado), en vez de un
						// fondo nuevo sin contraste comprobado.
						<span className="rounded-full border border-[color-mix(in_oklab,var(--success)_55%,transparent)] bg-transparent px-1.5 py-0.5 text-[0.65rem] font-black text-success-hover">
							Nuevo
						</span>
					)}
				</span>
			</span>

			<span className="flex min-w-0 flex-1 flex-col gap-1">
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

				<span className="mt-auto flex items-center gap-1.5 pt-0.5 text-[0.75rem] font-semibold text-text-placeholder">
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

export function AchievementsModal({
	isOpen,
	onClose,
	gameType,
}: AchievementsModalProps) {
	// Marcar como visto NO se hace aquí sino en el `onClose` que arma
	// `Configuration.tsx`: mientras el modal está abierto, `catalog` todavía
	// distingue los logros nuevos (desbloqueados sin ver) de los vistos, que
	// es lo que hace falta para resaltarlos y hacerles scroll más abajo.
	const { catalog, unlockedCount, totalCount } = useAchievements(gameType);

	const rowNodesRef = useRef(new Map<string, HTMLLIElement>());
	const catalogRef = useRef(catalog);
	catalogRef.current = catalog;
	const hasScrolledRef = useRef(false);

	useEffect(() => {
		if (!isOpen) {
			hasScrolledRef.current = false;
			return;
		}
		if (hasScrolledRef.current) return;

		const firstNew = catalogRef.current.find(isNewlyUnlocked);
		if (!firstNew) return;

		const node = rowNodesRef.current.get(firstNew.id);
		if (!node) return;

		hasScrolledRef.current = true;

		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		node.scrollIntoView({
			behavior: prefersReducedMotion ? "auto" : "smooth",
			block: "center",
		});
	}, [isOpen]);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			// Del ancho de la partida guiada (`Tutorial.tsx`), para que quepan
			// varias tarjetas por fila (D085). `max-w-none` quita el tope de
			// `size="md"` de HeroUI (`.modal__dialog--md` = `max-w-md`), que si
			// no deja el diálogo en ~28rem aunque pida más ancho.
			className="w-[min(58rem,94vw)] max-w-none text-left"
			ariaLabelledby="achievements-title"
		>
			<header className="mb-3 flex items-center justify-between gap-3">
				<h2 id="achievements-title" className="m-0">
					Logros
				</h2>
				<ModalCloseButton onClose={onClose} />
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

							{/* La rejilla va en el propio `ul` (cada tarjeta sigue siendo
							    un `li`): 1 columna a 320 px, 2 desde `min-[30rem]` y 3
							    desde `min-[44rem]`, breakpoints que ya usa la app (D085). */}
							<ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 min-[30rem]:grid-cols-2 min-[44rem]:grid-cols-3">
								{items.map((achievement) => (
									<AchievementCard
										key={achievement.id}
										achievement={achievement}
										rowRef={(node) => {
											if (node) {
												rowNodesRef.current.set(achievement.id, node);
											} else {
												rowNodesRef.current.delete(achievement.id);
											}
										}}
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
