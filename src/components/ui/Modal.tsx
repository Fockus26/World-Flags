import { motion } from "framer-motion";
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
	"max-h-[min(90vh,42rem)] w-[min(100%,30rem)] overflow-y-auto rounded-xl border border-modal-border bg-surface-secondary p-[clamp(1.25rem,4vw,2rem)] text-center shadow-(--shadow-modal) scrollbar-thin scrollbar-thumb-(--color-neutral) scrollbar-track-transparent hover:scrollbar-thumb-(--color-neutral-hover)";

const heightAnimatorClass = "overflow-hidden";

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
		if (!isOpen) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onClose();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	useIsomorphicLayoutEffect(() => {
		if (!animateHeight || !isOpen || !contentRef.current) {
			return;
		}

		const element = contentRef.current;
		setHeight(element.getBoundingClientRect().height);

		const observer = new ResizeObserver((entries) => {
			const newHeight = entries[0]?.contentRect.height;
			if (newHeight) {
				setHeight(newHeight);
			}
		});

		observer.observe(element);
		return () => observer.disconnect();
	}, [animateHeight, isOpen]);

	if (!isOpen) {
		return null;
	}

	function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	return (
		<motion.div
			className={overlayClass}
			role="presentation"
			onMouseDown={handleOverlayClick}
			variants={motionVariants.overlayAppear}
			initial="hidden"
			animate="visible"
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
	);
}
