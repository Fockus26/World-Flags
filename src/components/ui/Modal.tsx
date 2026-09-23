import { ModalBackdrop, ModalContainer, ModalDialog } from "@heroui/react";
import type { ReactNode } from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	className?: string;
	role?: "dialog" | "alertdialog";
	ariaLabel?: string;
	ariaLabelledby?: string;
	ariaDescribedby?: string;
	size?: "xs" | "sm" | "md" | "lg";
	/**
	 * ¿Se cierra al hacer clic fuera? Por defecto sí, como hasta ahora — los
	 * consumidores que ya existían no cambian. En `false` solo desaparece ese
	 * cierre accidental: **Escape sigue cerrando** (HeroUI lo controla con
	 * `isKeyboardDismissDisabled`, que no se toca). Lo usa la partida guiada,
	 * donde un clic fuera perdería el recorrido a medias.
	 */
	isDismissable?: boolean;
	/** @deprecated HeroUI dimensiona el diálogo solo; se ignora. */
	animateHeight?: boolean;
}

/**
 * Diálogo modal sobre HeroUI v3 (React Aria): focus-trap, cierre con Escape,
 * scroll-lock y `aria-modal` vienen incluidos. `onClose` se dispara tanto con
 * Escape como al hacer clic fuera (`isDismissable`).
 *
 * HeroUI recorta el diálogo con `overflow: clip` esperando que el scroll
 * ocurra en un `Modal.Body`; como no usamos ese slot, se envuelve el contenido
 * en una región con alto máximo en unidades de viewport (no depende de la
 * altura del contenedor de HeroUI, que en este entorno a veces queda mal) y
 * scroll propio, para que el contenido alto (p. ej. el picker de países) sea
 * alcanzable.
 */
export function Modal({
	isOpen,
	onClose,
	children,
	className,
	role = "dialog",
	ariaLabel,
	ariaLabelledby,
	ariaDescribedby,
	size = "md",
	isDismissable = true,
}: ModalProps) {
	return (
		<ModalBackdrop
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			isDismissable={isDismissable}
			variant="blur"
		>
			<ModalContainer size={size} placement="center">
				<ModalDialog
					role={role}
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledby}
					aria-describedby={ariaDescribedby}
					className={[
						// HeroUI limita la altura a `--visual-viewport-height` (a
						// veces 0 en este entorno) y recorta con `overflow: clip`.
						// Se fija el máximo al viewport dinámico y se habilita el
						// scroll interno con barra.
						"![max-height:90dvh] [overflow-y:auto] overscroll-contain",
						className ?? "",
					]
						.filter(Boolean)
						.join(" ")}
				>
					{children}
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
}
