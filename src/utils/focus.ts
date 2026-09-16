/**
 * Reintenta el foco cuadro a cuadro hasta que realmente se aplique.
 *
 * Hace falta porque toda sesión de juego monta dentro de una ranura de
 * `PageFlip` mientras esta todavía está de espaldas (giro 3D con
 * `backface-visibility: hidden`): un `.focus()` normal en ese instante no
 * hace nada, el navegador lo ignora porque el elemento no se está pintando
 * todavía. Reintentar en `requestAnimationFrame` hasta que el giro termine
 * (o se agoten los intentos) hace que el foco caiga apenas el elemento pasa
 * a ser visible, sin acoplarse a la duración exacta de la animación.
 */
export function focusWhenVisible(
	element: HTMLElement | null,
	attemptsLeft = 40,
) {
	if (!element) return;
	element.focus();
	if (document.activeElement === element || attemptsLeft <= 0) return;
	requestAnimationFrame(() => focusWhenVisible(element, attemptsLeft - 1));
}
