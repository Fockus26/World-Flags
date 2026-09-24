/**
 * Animación de apertura y cierre de los desplegables de HeroUI (`ui/Select`
 * y el menú ⋮ de móvil), D099.
 *
 * HeroUI ya anima sus popovers con `tw-animate-css` mientras React Aria pone
 * `data-entering` / `data-exiting`, pero muy poco: 150 ms de entrada y 100 ms
 * de salida, escala al 95 % y 4 px de desplazamiento. En el móvil del dueño
 * se leía como "abre y cierra sin transición". Aquí se alarga y se amplía
 * (200 / 150 ms, escala al 90 %, 8 px hacia el disparador). Son utilidades de
 * Tailwind, así que van en la capa `utilities` y ganan a las de HeroUI (capa
 * `components`) sin `!important`. El `animate-in` / `animate-out` lo sigue
 * poniendo HeroUI: esto solo cambia sus variables.
 *
 * `prefers-reduced-motion` lo cubre el bloque de `global.css`, que deja la
 * duración en 0,01 ms (fuera de capa, gana a todo esto).
 */
export const POPOVER_MOTION_CLASS = [
	"data-[entering=true]:duration-200",
	"data-[entering=true]:ease-out",
	"data-[entering=true]:zoom-in-90",
	"data-[entering=true]:data-[placement=bottom]:slide-in-from-top-2",
	"data-[entering=true]:data-[placement=top]:slide-in-from-bottom-2",
	"data-[exiting=true]:duration-150",
	"data-[exiting=true]:ease-in",
	"data-[exiting=true]:zoom-out-90",
	"data-[exiting=true]:data-[placement=bottom]:slide-out-to-top-2",
	"data-[exiting=true]:data-[placement=top]:slide-out-to-bottom-2",
].join(" ");
