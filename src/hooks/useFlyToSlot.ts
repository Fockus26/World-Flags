import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

/**
 * Duración y curva del vuelo (D037). No hay un token de `DESIGN_TOKENS.md`
 * para una animación JS de esta duración (los tokens existentes son
 * transiciones CSS de 150-200ms) — constantes con nombre en vez de un valor
 * suelto, tal como pide el plan cuando no hay token que reutilizar.
 */
const FLIGHT_DURATION_MS = 450;
const FLIGHT_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
/** Cota máxima de espera al scroll suave, por si `scrollend` no llega a disparar (navegador viejo, o no hizo falta moverse). */
const SCROLL_SETTLE_TIMEOUT_MS = 500;

/** El ancestro con scroll propio más cercano — el tablero tiene el suyo (`overflow-y-auto` en `CountryBoard.tsx`), no la página. */
function getScrollParent(node: HTMLElement): HTMLElement {
	let el = node.parentElement;
	while (el) {
		const style = window.getComputedStyle(el);
		if (
			/(auto|scroll)/.test(style.overflowY) &&
			el.scrollHeight > el.clientHeight
		) {
			return el;
		}
		el = el.parentElement;
	}
	return (
		(document.scrollingElement as HTMLElement | null) ??
		document.documentElement
	);
}

/** Espera a que un scroll en curso termine (evento `scrollend`, con un plazo tope de seguridad). */
function waitForScrollSettle(scrollContainer: Element): Promise<void> {
	return new Promise((resolve) => {
		let settled = false;

		function finish() {
			if (settled) return;
			settled = true;
			scrollContainer.removeEventListener("scrollend", finish);
			window.clearTimeout(timeoutId);
			resolve();
		}

		scrollContainer.addEventListener("scrollend", finish);
		const timeoutId = window.setTimeout(finish, SCROLL_SETTLE_TIMEOUT_MS);
	});
}

interface FlyOptions {
	/** Texto a mostrar en el clon — normalmente el nombre del país, tal cual se ve en su hueco. */
	text: string;
	/** Elemento del que "sale" el vuelo (el input de texto). */
	fromEl: HTMLElement;
	/** Código del país cuyo hueco en el tablero es el destino. */
	toCode: string;
	/**
	 * Se llama cuando el vuelo termina (o de inmediato si no hay slot que
	 * animar, o si `prefers-reduced-motion` pide evitar la animación). Quien
	 * llama debe usar esto para pasar el hueco de "volando" (texto invisible)
	 * a visible.
	 */
	onLanded: () => void;
}

/**
 * Anima el texto de un país "volando" desde `fromEl` hasta su hueco en el
 * tablero, con la Web Animations API — no framer-motion, que no ejecuta en
 * este stack (D037, ver `context/decisions/03-animaciones.md`).
 *
 * Técnica FLIP: el clon se posiciona YA en su lugar final (el del hueco) y
 * se anima un `transform` que lo trae desde la posición de `fromEl` hasta
 * `none` — así el navegador nunca tiene que recalcular layout a mitad de la
 * animación, solo composita un `transform`/`opacity`.
 */
export function useFlyToSlot(slotRefs: RefObject<Map<string, HTMLLIElement>>) {
	// Uno o más vuelos pueden estar en el aire a la vez (varios aciertos
	// seguidos rápido): cada uno es un clon independiente.
	const activeClonesRef = useRef<Set<HTMLElement>>(new Set());

	useEffect(() => {
		const clones = activeClonesRef.current;
		return () => {
			for (const clone of clones) {
				clone.remove();
			}
			clones.clear();
		};
	}, []);

	const fly = useCallback(
		async ({ text, fromEl, toCode, onLanded }: FlyOptions) => {
			const slot = slotRefs.current.get(toCode);

			if (!slot) {
				onLanded();
				return;
			}

			const prefersReducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;

			// Si el hueco ya está a la vista, no hace falta desplazar nada —
			// el vuelo arranca de inmediato, sin espera de más.
			const scrollContainer = getScrollParent(slot);
			const containerRect = scrollContainer.getBoundingClientRect();
			const slotRectBeforeScroll = slot.getBoundingClientRect();
			const needsScroll =
				slotRectBeforeScroll.top < containerRect.top ||
				slotRectBeforeScroll.bottom > containerRect.bottom;

			if (needsScroll) {
				slot.scrollIntoView({
					block: "nearest",
					// Con reduced motion, instantáneo (no hay animación de
					// vuelo tampoco, así que no tiene sentido esperar).
					behavior: prefersReducedMotion ? "auto" : "smooth",
				});

				// Se espera a que el scroll TERMINE antes de medir cualquier
				// posición: si se midiera a mitad de un desplazamiento suave,
				// la posición leída no sería la final y el clon aterrizaría
				// en el sitio equivocado (ver el hallazgo de "un poco arriba
				// y a la izquierda" — mismo tipo de causa que el fix del
				// `<span>` interno más abajo, medir en el momento incorrecto).
				if (!prefersReducedMotion) {
					await waitForScrollSettle(scrollContainer);
				}
			}

			if (prefersReducedMotion) {
				onLanded();
				return;
			}

			const fromRect = fromEl.getBoundingClientRect();
			// El destino NO es el `<li>` completo: tiene padding y centra su
			// contenido verticalmente (`items-center`), así que su propio
			// `getBoundingClientRect()` no coincide con dónde cae el texto —
			// el clon aterrizaba visiblemente arriba y a la izquierda del
			// lugar real, y al quitarlo se veía un salto/parpadeo hacia la
			// posición correcta. Se mide el `<span>` de contenido (el primer
			// hijo, invisible mientras vuela — ver `BoardSlot.tsx`), que ya
			// tiene el ancho/alto exactos del texto en su sitio final.
			const toRect = (slot.firstElementChild ?? slot).getBoundingClientRect();
			const slotStyle = window.getComputedStyle(slot);
			const fromStyle = window.getComputedStyle(fromEl);

			const fromFontSize = Number.parseFloat(fromStyle.fontSize) || 16;
			const toFontSize = Number.parseFloat(slotStyle.fontSize) || 16;
			const scale = fromFontSize / toFontSize;

			const clone = document.createElement("span");
			clone.textContent = text;
			clone.setAttribute("aria-hidden", "true");
			// Tipografía del slot, no la del input: el clon debe verse como
			// el país que va a aterrizar, no como lo que se escribió.
			clone.style.position = "fixed";
			clone.style.left = `${toRect.left}px`;
			clone.style.top = `${toRect.top}px`;
			clone.style.margin = "0";
			clone.style.pointerEvents = "none";
			clone.style.zIndex = "9999";
			clone.style.fontSize = slotStyle.fontSize;
			clone.style.fontWeight = slotStyle.fontWeight;
			clone.style.fontFamily = slotStyle.fontFamily;
			clone.style.color = slotStyle.color;
			clone.style.whiteSpace = "nowrap";
			clone.style.transformOrigin = "top left";

			document.body.appendChild(clone);
			activeClonesRef.current.add(clone);

			const dx = fromRect.left - toRect.left;
			const dy = fromRect.top - toRect.top;

			const animation = clone.animate(
				[
					{
						transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
						opacity: 0.9,
					},
					{ transform: "none", opacity: 1 },
				],
				{
					duration: FLIGHT_DURATION_MS,
					easing: FLIGHT_EASING,
					fill: "forwards",
				},
			);

			function land() {
				clone.remove();
				activeClonesRef.current.delete(clone);
				onLanded();
			}

			// "cancel" cubre el desmontaje a mitad de vuelo (p. ej. se
			// abandona la partida mientras un país está en el aire): sin
			// esto, `onLanded` nunca llegaría a llamarse en ese caso.
			animation.addEventListener("finish", land);
			animation.addEventListener("cancel", land);
		},
		[slotRefs],
	);

	return { fly };
}
