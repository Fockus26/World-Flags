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
	/** Respuesta incorrecta (o saltada): dos notas graves descendentes. */
	| "incorrect"
	/** País encontrado en el rush de Países: un toque corto, pensado para oírse muchas veces seguidas. */
	| "found"
	/** Logro desbloqueado: arpegio corto. */
	| "achievement";

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

/** Hueco entre el final de un sonido y el arpegio de logro que llega encima. */
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
			peak: note.peak * 0.18,
			type: "sine",
		},
	];
}

// Notas en Hz (afinación de 440 Hz).
const A3 = 220;
const D4 = 293.66;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;

/**
 * Las partituras. Duraciones totales: acierto ~0,3 s, fallo ~0,3 s, país
 * encontrado ~0,1 s, logro ~0,4 s.
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
	// Re–La graves en seno, con un leve deslizamiento hacia abajo: se entiende
	// como "no" sin zumbido ni estridencia.
	incorrect: [
		{ frequency: D4, start: 0, duration: 0.13, peak: 0.55, type: "sine" },
		{
			frequency: A3,
			start: 0.1,
			duration: 0.2,
			peak: 0.6,
			type: "sine",
			glideTo: A3 * 0.94,
		},
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
};

function soundLength(notes: readonly Note[]): number {
	return Math.max(...notes.map((note) => note.start + note.duration));
}

let context: AudioContext | null = null;
let master: GainNode | null = null;
/** En tiempo del contexto: cuándo termina lo último que se programó. */
let busyUntil = 0;
let lastFoundAt = Number.NEGATIVE_INFINITY;
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

	// Dos tandas de logros casi seguidas (un logro que desbloquea otro en la
	// pasada siguiente de `AchievementsEffects`) suenan como una sola.
	if (name === "achievement" && now < achievementUntil) return;

	// El logro suele llegar justo detrás del acierto que lo desbloqueó: se
	// espera a que termine en vez de pisarlo. Los demás suenan al momento
	// (son la respuesta a lo que se acaba de hacer).
	const at =
		name === "achievement" ? Math.max(now, busyUntil + ACHIEVEMENT_GAP_S) : now;

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
