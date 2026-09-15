import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface PageFlipProps<TKey extends string> {
	viewKey: TKey;
	renderView: (key: TKey) => ReactNode;
}

const SLOT_TRANSFORMS = ["rotateY(0deg)", "rotateY(180deg)"] as const;

/**
 * Transición de "página" en giro 3D entre las vistas de nivel superior del
 * juego (configuración, sesión, práctica diaria, resultados). No hay
 * `AnimatePresence` disponible en este stack (ver
 * `context/decisions/03-animaciones.md`, D008).
 *
 * Dos ranuras fijas (0°/180°) que se turnan el rol de "visible": el giro
 * **solo avanza, nunca se resetea** — resetear a 0° tras cada giro dispara
 * una segunda transición visible (el navegador anima cualquier cambio de
 * `transform`), así que en vez de eso `rotateY(360deg)` hace de "0" la
 * siguiente vez.
 *
 * El contador de giro y las ranuras viven en refs, actualizadas desde un
 * efecto (no durante el render): así el `setState` que fuerza el re-render
 * es el único disparador, sin depender de que "adaptar estado durante el
 * render" sea seguro con el compilador de React activo en este proyecto.
 *
 * La ranura oculta arranca en `null` (no duplicando `viewKey`): su valor
 * inicial nunca se usa como contenido a animar — el primer giro la
 * sobreescribe con el `viewKey` real antes de mostrarla — así que montar
 * ahí una copia de la vista inicial solo duplicaba el árbol DOM/efectos sin
 * ganar nada.
 *
 * **Bug real que costó dos vueltas encontrar:** la guarda de "¿hace falta
 * girar?" comparaba `viewKey` contra CUALQUIERA de las dos ranuras
 * (`slotKeysRef.current[0] || slotKeysRef.current[1]`), no solo contra la
 * que está de verdad mostrándose. La ranura oculta guarda lo último que
 * mostró — por ejemplo, en el primer giro de la app (de "configuración" a
 * "sesión") la ranura 0 se queda con "configuration" para siempre, aunque
 * ya no sea la visible. Al abandonar la partida (sesión → configuración de
 * nuevo), `viewKey` volvía a ser "configuration", que coincidía con esa
 * ranura oculta vieja — la guarda entendía "ya está, no hay nada que
 * hacer" y **nunca disparaba el giro**: la pantalla se quedaba mostrando
 * la sesión (ya en null, porque `activeGame` se limpió) sin girar a
 * ningún lado. Se corrigió para comparar solo contra la ranura *activa*:
 * si el destino no es lo que se está mostrando AHORA, gira — sin importar
 * qué haya quedado guardado (y sin usar) del otro lado.
 */
export function PageFlip<TKey extends string>({
	viewKey,
	renderView,
}: PageFlipProps<TKey>) {
	const rotationStepRef = useRef(0);
	const slotKeysRef = useRef<[TKey | null, TKey | null]>([viewKey, null]);
	const [, forceRender] = useState(0);

	useEffect(() => {
		const activeSlot = rotationStepRef.current % 2;
		if (viewKey === slotKeysRef.current[activeSlot]) return;

		const hiddenSlot = activeSlot === 0 ? 1 : 0;
		slotKeysRef.current[hiddenSlot] = viewKey;
		rotationStepRef.current += 1;
		forceRender((tick) => tick + 1);
	}, [viewKey]);

	const activeSlot = rotationStepRef.current % 2;

	return (
		<div className="grid h-full w-full place-items-center [perspective:1600px]">
			<div
				className="relative h-full w-full transition-transform duration-[550ms] ease-[cubic-bezier(0.65,0,0.35,1)] [transform-style:preserve-3d]"
				style={{ transform: `rotateY(${rotationStepRef.current * 180}deg)` }}
			>
				{([0, 1] as const).map((slot) => (
					<div
						key={slot}
						className="absolute inset-0 grid place-items-center [backface-visibility:hidden]"
						style={{ transform: SLOT_TRANSFORMS[slot] }}
						// Solo la ranura activa es alcanzable: `backface-visibility`
						// esconde la otra visualmente, pero no la saca del árbol de
						// accesibilidad ni bloquea el foco por sí sola.
						inert={slot !== activeSlot}
						aria-hidden={slot !== activeSlot || undefined}
					>
						{slotKeysRef.current[slot] !== null &&
							renderView(slotKeysRef.current[slot])}
					</div>
				))}
			</div>
		</div>
	);
}
