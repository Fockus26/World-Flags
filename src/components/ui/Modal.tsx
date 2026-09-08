import { AnimatePresence, motion } from "framer-motion";
import {
	type MouseEvent,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { motionTransition, motionVariants } from "@/styles/animations";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	className?: string;
	role?: string;
	ariaLabelledby?: string;
	ariaDescribedby?: string;
	animateHeight?: boolean;
}

const overlayClass =
	"fixed inset-0 z-100 grid place-items-center bg-overlay p-4 backdrop-blur-[5px]";

const modalClass =
	"max-h-[min(90vh,45rem)] w-[min(100%,35rem)] overflow-y-auto rounded-xl border border-surface-border bg-surface/90 shadow-[0_24px_55px_-14px_color-mix(in_srgb,var(--color-surface-soft)_35%,transparent)] backdrop-blur-xl p-[clamp(1.25rem,4vw,2rem)] text-center scrollbar-thin scrollbar-thumb-(--color-neutral) scrollbar-track-transparent hover:scrollbar-thumb-(--color-neutral-hover) active:scrollbar-thumb-(--color-neutral-hover)";

const heightAnimatorClass = "overflow-visible";

export function Modal({
	isOpen,
	onClose,
	children,
	className,
	role = "dialog",
	ariaLabelledby,
	ariaDescribedby,
	animateHeight = false,
}: ModalProps) {
	const contentRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number | undefined>(undefined);

	useEffect(() => {
		if (!isOpen) return;

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onClose();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose, isOpen]);

	// Mide el contenido real (getBoundingClientRect) en vez de confiar en
	// entries[0].contentRect del ResizeObserver: ambos deberían coincidir,
	// pero en la práctica quedaban desincronizados (el modal no encogía al
	// desactivar el temporizador, o no crecía lo suficiente al activarlo),
	// dejando mal el padding inferior. Medir siempre de la misma forma evita
	// esa desincronización. `newHeight` puede ser 0 legítimamente (ej. el
	// contenido tarda un frame en montar), así que no se descarta con un
	// chequeo de truthiness.
	useIsomorphicLayoutEffect(() => {
		if (!animateHeight || !isOpen || !contentRef.current) {
			return;
		}

		const element = contentRef.current;

		function measure() {
			setHeight(element.getBoundingClientRect().height);
		}

		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [animateHeight, isOpen]);

	function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className={overlayClass}
					role="presentation"
					onMouseDown={handleOverlayClick}
					variants={motionVariants.overlayAppear}
					initial="hidden"
					animate="visible"
					exit="exit"
				>
					<motion.section
						className={`${modalClass}${className ? ` ${className}` : ""}`}
						role={role}
						aria-modal="true"
						aria-labelledby={ariaLabelledby}
						aria-describedby={ariaDescribedby}
						variants={motionVariants.modalAppear}
						initial="hidden"
						animate="visible"
						exit="exit"
					>
						{animateHeight ? (
							<motion.div
								className={heightAnimatorClass}
								animate={{ height: height ?? "auto" }}
								transition={motionTransition(0.25)}
							>
								<div ref={contentRef}>{children}</div>
							</motion.div>
						) : (
							children
						)}
					</motion.section>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
