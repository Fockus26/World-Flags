import { playSound } from "@/utils/sound";

/**
 * El "tic" de elegir una opción de configuración (D143): juego, continente,
 * modo, orden, dificultad, temporizador, sonido y tema.
 *
 * Devuelve `withSelectSound(handler)`: el mismo manejador, que además suena
 * **después** de aplicar el cambio. El orden importa en el interruptor
 * "Sonidos": al activarlo, el tic confirma que ya suena; al desactivarlo, la
 * preferencia ya está apagada y no suena nada.
 *
 * Es un hook para que los selectores lo usen por dentro sin cambiar su API
 * (`OptionTile` y el resto de `components/ui/` conservan la suya). Suena por
 * cada cambio real de opción, también con las flechas dentro de un grupo de
 * radios: cada flecha es una elección distinta, y `playSound` descarta los
 * tics a menos de 50 ms para que una tecla mantenida no se amontone.
 */
export function useSelectSound() {
	return function withSelectSound<Args extends unknown[]>(
		handler: (...args: Args) => void,
	) {
		return (...args: Args) => {
			handler(...args);
			playSound("select");
		};
	};
}
