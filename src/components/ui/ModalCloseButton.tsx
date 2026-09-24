import { Xmark } from "iconoir-react";
import { Button } from "./Button";

interface ModalCloseButtonProps {
	onClose: () => void;
}

/**
 * "Cerrar" de la cabecera de los modales (D097). En móvil (por debajo de
 * `sm`, el mismo corte que usa `UserSummary`) es un botón de solo icono con
 * la X; en escritorio conserva el texto de siempre.
 *
 * Se pintan los dos y CSS oculta el que no toca, como el selector de juego
 * (D066): `display: none` también lo saca del orden de tabulación y del árbol
 * de accesibilidad, y decidirlo en JS con `matchMedia` desajustaría la
 * hidratación. Los dos se llaman "Cerrar": en escritorio el nombre accesible
 * es el texto visible (WCAG 2.5.3) y en móvil lo pone `aria-label`.
 */
export function ModalCloseButton({ onClose }: ModalCloseButtonProps) {
	return (
		<>
			<Button
				variant="text"
				color="danger"
				type="button"
				isIconOnly
				aria-label="Cerrar"
				className="shrink-0 sm:hidden"
				onClick={onClose}
			>
				<Xmark aria-hidden="true" className="size-6" />
			</Button>
			<Button
				variant="text"
				color="danger"
				type="button"
				fullWidth={false}
				className="hidden sm:inline-flex"
				onClick={onClose}
			>
				Cerrar
			</Button>
		</>
	);
}
