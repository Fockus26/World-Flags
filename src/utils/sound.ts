import { getSoundEnabled } from "@/utils/learning-storage";

/**
 * Efectos de sonido del juego (D080), sintetizados con Web Audio: sin archivos
 * que descargar ni precachear (la app funciona sin red), sin licencias y sin
 * peso en el bundle más allá de este módulo.
 *
 * El sonido es un **refuerzo**, nunca la única señal (D082): todo lo que suena
 * ya se ve en pantalla con icono y texto, y se anuncia a los lectores de
 * pantalla por su región viva. Por eso aquí todo falla en silencio: sin Web
 * Audio, con el contexto bloqueado o con cualquier error, no pasa nada y el
 * juego sigue igual.
 *
 * Este módulo solo **lee** la preferencia (`getSoundEnabled`); la partida
 * guiada lo usa y no puede escribir nada (D072).
 */
export type SoundName =
	/** Respuesta correcta: dos notas ascendentes. */
	| "correct"
	/** Respuesta incorrecta: dos notas descendentes, más graves que el acierto. */
	| "incorrect"
	/** País encontrado en el rush de Países: un toque corto, pensado para oírse muchas veces seguidas. */
	| "found"
	/** Logro desbloqueado: arpegio corto. */
	| "achievement"
	/** Elegir una opción de configuración (juego, continente, modo…): un "tic" agudo, muy bajo y corto (D143). */
	| "select"
	/** Empezar una partida: una nota que sube (D144). */
	| "start"
	/** Saltar una bandera (o agotar el temporizador de práctica): una sola nota neutra (D144). */
	| "skip"
	/** Castigo del competitivo ("+10 s"/"+20 s"): golpe grave y corto, junto al badge (D145). */
	| "penalty"
	/** Nueva mejor marca de un rush: fanfarria, más larga que el logro (D146). */
	| "record";

/** Volumen general. Bajo a propósito: se oye cientos de veces por partida. */
const MASTER_GAIN = 0.35;

/** Ataque de cada nota: lo justo para que el inicio no haga "clic". */
const ATTACK_S = 0.008;

/** Silencio "real" para las rampas exponenciales (no admiten 0). */
const SILENCE = 0.0001;

/**
 * Un "found" no se repite antes de este intervalo: en el rush de Países los
 * aciertos pueden llegar casi a la vez (un prefijo ambiguo que vence justo
 * cuando se acepta otro). Se descarta el segundo, no se encola.
 */
const MIN_FOUND_INTERVAL_S = 0.07;

/**
 * Lo mismo para "select": con las flechas dentro de un grupo de radios, una
 * tecla mantenida cambia de opción muchas veces por segundo (D143).
 */
const MIN_SELECT_INTERVAL_S = 0.05;

/**
 * Hueco entre el final de un sonido y el arpegio de logro (o la fanfarria de
 * récord) que llega encima.
 */
const ACHIEVEMENT_GAP_S = 0.06;

/**
 * Si el contexto estaba suspendido y tarda más que esto en reanudarse, el
 * sonido se descarta: fuera de un gesto del usuario `resume()` puede quedarse
 * esperando al siguiente toque, y entonces sonaría todo lo acumulado de golpe.
 */
const MAX_RESUME_WAIT_MS = 150;

interface Note {
	/** Hz. */
	frequency: number;
	/** Segundos desde el inicio del sonido. */
	start: number;
	/** Segundos hasta que la caída llega al silencio. */
	duration: number;
	/** Pico de la envolvente, antes del volumen general. */
	peak: number;
	type: OscillatorType;
	/** Si se da, la nota se desliza hasta esta frecuencia durante su duración. */
	glideTo?: number;
}

/** Octava superior, muy baja, que da brillo a las notas de acierto y logro. */
function withSparkle(note: Note): Note[] {
	return [
		note,
		{
			...note,
			frequency: note.frequency * 2,
			// Si la nota se desliza, su octava se desliza con ella (`start`).
			glideTo: note.glideTo === undefined ? undefined : note.glideTo * 2,
			peak: note.peak * 0.18,
			type: "sine",
		},
	];
}

/**
 * Octava superior en seno que da "cuerpo" audible a las notas graves del
 * fallo (D125). Los altavoces de móvil apenas reproducen nada por debajo de
 * ~500 Hz: sin este parcial, el fallo se quedaba casi mudo en el teléfono. Con
 * él, el oído reconstruye la nota grave a partir de su octava (fundamental
 * ausente) y el sonido se sigue oyendo "abajo".
 */
function withBody(note: Note): Note[] {
	return [
		note,
		{
			...note,
			frequency: note.frequency * 2,
			glideTo: note.glideTo === undefined ? undefined : note.glideTo * 2,
			peak: note.peak * 0.5,
			type: "sine",
		},
	];
}

// Notas en Hz (afinación de 440 Hz).
const E2 = 82.41;
const E4 = 329.63;
const G4 = 392;
const A4 = 440;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.51;

/**
 * Las partituras. Duraciones totales: acierto ~0,3 s, fallo ~0,3 s, país
 * encontrado ~0,1 s, logro ~0,4 s, selección ~0,04 s, empezar ~0,22 s,
 * saltar ~0,15 s, castigo ~0,15 s, récord ~1 s.
 */
const SOUNDS: Record<SoundName, readonly Note[]> = {
	// Cuarta justa ascendente (Mi–La): clara y amable, no de tragaperras.
	correct: [
		...withSparkle({
			frequency: E5,
			start: 0,
			duration: 0.12,
			peak: 0.5,
			type: "triangle",
		}),
		...withSparkle({
			frequency: A5,
			start: 0.08,
			duration: 0.22,
			peak: 0.5,
			type: "triangle",
		}),
	],
	// La–Mi descendente (cuarta justa: el espejo del acierto, una octava más
	// abajo) en triángulo con su octava y un leve deslizamiento hacia abajo:
	// se entiende como "no" sin zumbido ni estridencia (D125). Antes era Re4–La3
	// en seno puro, que a igual volumen se oía ~5,6 dB más bajo que el acierto
	// (ponderación A) y ~27 dB más bajo en un altavoz de móvil. Con estos picos
	// y la octava a la mitad queda a +0,6 dB (A) y −1,8 dB (móvil simulado:
	// paso alto de 4.º orden a 500 Hz) del acierto: igual de audible, con la
	// nota más alta en 880 Hz y sin armónicos ásperos (triángulo, no cuadrada).
	incorrect: [
		...withBody({
			frequency: A4,
			start: 0,
			duration: 0.13,
			peak: 0.65,
			type: "triangle",
		}),
		...withBody({
			frequency: E4,
			start: 0.1,
			duration: 0.2,
			peak: 0.7,
			type: "triangle",
			glideTo: E4 * 0.94,
		}),
	],
	// Un solo toque del La agudo del acierto, más corto y más suave.
	found: withSparkle({
		frequency: A5,
		start: 0,
		duration: 0.1,
		peak: 0.3,
		type: "triangle",
	}),
	// Do mayor arpegiado (Do–Mi–Sol–Do), la última nota se deja sonar.
	achievement: [
		...withSparkle({
			frequency: C5,
			start: 0,
			duration: 0.14,
			peak: 0.4,
			type: "triangle",
		}),
		...withSparkle({
			frequency: E5,
			start: 0.065,
			duration: 0.14,
			peak: 0.4,
			type: "triangle",
		}),
		...withSparkle({
			frequency: G5,
			start: 0.13,
			duration: 0.14,
			peak: 0.4,
			type: "triangle",
		}),
		...withSparkle({
			frequency: C6,
			start: 0.195,
			duration: 0.21,
			peak: 0.45,
			type: "triangle",
		}),
	],
	// Un "tic" en seno, dos octavas por encima del Mi del acierto y a menos de
	// la mitad del volumen del país encontrado: se oye muchas veces al
	// configurar y tiene que quedarse en un roce, no en una nota (D143).
	select: [
		{
			frequency: E6,
			start: 0,
			duration: 0.04,
			peak: 0.12,
			type: "sine",
		},
	],
	// Una sola nota que sube una quinta (Do–Sol): "allá vamos", sin sonar a
	// acierto (dos notas separadas) ni a logro (arpegio) (D144).
	start: withSparkle({
		frequency: C5,
		start: 0,
		duration: 0.22,
		peak: 0.4,
		type: "triangle",
		glideTo: G5,
	}),
	// Re5 suelto, ni sube ni baja: saltar es "no lo sé", no un error. Queda
	// entre el acierto y el fallo en altura y más suave que los dos (D144).
	skip: [
		{
			frequency: D5,
			start: 0,
			duration: 0.15,
			peak: 0.35,
			type: "triangle",
		},
	],
	// Un golpe tipo bombo: triángulo que cae de Mi4 a Mi2 mientras se apaga.
	// Suena junto al fallo o al salto del competitivo (D145), así que vive
	// donde ellos no: arranca en seco en el instante 0 y a los 0,15 s ya se
	// fue; con la segunda nota del fallo (0,1 s en adelante) solo se solapa su
	// cola más grave. La octava de `withBody` empieza en 659 Hz: es lo que
	// deja oír el golpe en el altavoz de un móvil (D125).
	penalty: withBody({
		frequency: E4,
		start: 0,
		duration: 0.15,
		peak: 0.7,
		type: "triangle",
		glideTo: E2,
	}),
	// Fanfarria en Do mayor: Sol–Do–Mi–Sol en staccato y un acorde final de
	// Do que se deja sonar medio segundo. ~1 s en total, más del doble que el
	// arpegio del logro (D146). Las notas del acorde van más bajas para que,
	// sumadas, no saturen.
	record: [
		...[G4, C5, E5, G5].flatMap((frequency, index) =>
			withSparkle({
				frequency,
				start: index * 0.1,
				duration: 0.12,
				peak: 0.4,
				type: "triangle",
			}),
		),
		...[E5, G5, C6].flatMap((frequency) =>
			withSparkle({
				frequency,
				start: 0.42,
				duration: 0.55,
				peak: 0.28,
				type: "triangle",
			}),
		),
	],
};

function soundLength(notes: readonly Note[]): number {
	return Math.max(...notes.map((note) => note.start + note.duration));
}

/** Segundos que dura `name`, de la primera nota al final de la última. */
export function getSoundDuration(name: SoundName): number {
	return soundLength(SOUNDS[name]);
}

/**
 * Cuántos golpes tiene `name`: notas que arrancan en momentos distintos (las
 * octavas de brillo o de cuerpo y las notas de un acorde cuentan como uno).
 */
export function getSoundAttackCount(name: SoundName): number {
	return new Set(SOUNDS[name].map((note) => note.start)).size;
}

/**
 * Sonidos que esperan a que termine lo que está sonando en vez de pisarlo:
 * llegan justo detrás del acierto que los provoca (el acierto que desbloquea
 * un logro, el último del rush que bate la marca).
 */
const QUEUED_SOUNDS: ReadonlySet<SoundName> = new Set([
	"achievement",
	"record",
]);

let context: AudioContext | null = null;
let master: GainNode | null = null;
/** En tiempo del contexto: cuándo termina lo último que se programó. */
let busyUntil = 0;
let lastFoundAt = Number.NEGATIVE_INFINITY;
let lastSelectAt = Number.NEGATIVE_INFINITY;
/** En tiempo del contexto: cuándo termina el último arpegio de logro. */
let achievementUntil = 0;

function getAudioContextClass(): typeof AudioContext | undefined {
	if (typeof window === "undefined") return undefined;

	return (
		window.AudioContext ??
		(window as Window & { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext
	);
}

/** Un único contexto para toda la app, creado la primera vez que hace falta. */
function getContext(): AudioContext | null {
	if (context) return context;

	const AudioContextClass = getAudioContextClass();
	if (!AudioContextClass) return null;

	context = new AudioContextClass();
	master = context.createGain();
	master.gain.value = MASTER_GAIN;
	master.connect(context.destination);

	return context;
}

function scheduleNote(
	ctx: AudioContext,
	output: AudioNode,
	note: Note,
	at: number,
) {
	const start = at + note.start;
	const end = start + note.duration;

	const oscillator = ctx.createOscillator();
	oscillator.type = note.type;
	oscillator.frequency.setValueAtTime(note.frequency, start);
	if (note.glideTo !== undefined) {
		oscillator.frequency.exponentialRampToValueAtTime(note.glideTo, end);
	}

	const envelope = ctx.createGain();
	envelope.gain.setValueAtTime(SILENCE, start);
	envelope.gain.exponentialRampToValueAtTime(note.peak, start + ATTACK_S);
	envelope.gain.exponentialRampToValueAtTime(SILENCE, end);

	oscillator.connect(envelope);
	envelope.connect(output);
	oscillator.start(start);
	// Un respiro tras la caída antes de parar: parar en seco en `end` puede
	// cortar la cola de la rampa y oírse como clic.
	oscillator.stop(end + 0.02);
	oscillator.onended = () => {
		oscillator.disconnect();
		envelope.disconnect();
	};
}

function schedule(ctx: AudioContext, name: SoundName) {
	if (!master) return;

	const now = ctx.currentTime;

	if (name === "found") {
		if (now - lastFoundAt < MIN_FOUND_INTERVAL_S) return;
		lastFoundAt = now;
	}

	if (name === "select") {
		if (now - lastSelectAt < MIN_SELECT_INTERVAL_S) return;
		lastSelectAt = now;
	}

	// Dos tandas de logros casi seguidas (un logro que desbloquea otro en la
	// pasada siguiente de `AchievementsEffects`) suenan como una sola.
	if (name === "achievement" && now < achievementUntil) return;

	// El logro y el récord esperan a que termine lo anterior (el acierto que
	// los provocó) en vez de pisarlo. Los demás suenan al momento: son la
	// respuesta a lo que se acaba de hacer, y el castigo suena a la vez que el
	// fallo o el salto (D145).
	const at = QUEUED_SOUNDS.has(name)
		? Math.max(now, busyUntil + ACHIEVEMENT_GAP_S)
		: now;

	const notes = SOUNDS[name];

	for (const note of notes) {
		scheduleNote(ctx, master, note, at);
	}

	busyUntil = Math.max(busyUntil, at + soundLength(notes));

	if (name === "achievement") achievementUntil = busyUntil;
}

/**
 * Suena `name` si la preferencia lo permite, la pestaña está visible y el
 * navegador tiene Web Audio. Pensado para llamarse dentro del manejador del
 * gesto que lo provoca (enviar, calificar, escribir): la política de
 * reproducción automática solo deja arrancar el audio ahí.
 */
export function playSound(name: SoundName): void {
	try {
		if (typeof document === "undefined" || document.hidden) return;
		if (!getSoundEnabled()) return;

		const ctx = getContext();
		if (!ctx) return;

		if (ctx.state === "running") {
			schedule(ctx, name);
			return;
		}

		const requestedAt = performance.now();

		ctx
			.resume()
			.then(() => {
				if (performance.now() - requestedAt > MAX_RESUME_WAIT_MS) return;
				schedule(ctx, name);
			})
			.catch(() => {
				// Bloqueado por la política de reproducción: sin sonido, sin más.
			});
	} catch {
		// Nunca rompe el juego.
	}
}
