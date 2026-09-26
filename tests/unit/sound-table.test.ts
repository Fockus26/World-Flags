/**
 * La tabla de sonidos (D080, D143–D146). No se puede oír en un test, así que
 * se comprueba lo que un cambio descuidado rompería sin que nadie lo notara:
 * las duraciones relativas que pidió el dueño (la fanfarria de récord más larga
 * que el logro, el "tic" de selección el más corto), que saltar sea una sola
 * nota, y cómo se programa cada sonido sobre un `AudioContext` falso: el
 * castigo a la vez que el fallo, el récord detrás del acierto, los tics
 * seguidos descartados y nada con el sonido apagado.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
	getSoundAttackCount,
	getSoundDuration,
	playSound,
	type SoundName,
} from "@/utils/sound";

const SOUND_KEY = "world-flags-sound-enabled";

/** Cada oscilador que se programa: cuándo arranca, en tiempo del contexto. */
let started: number[] = [];

class FakeParam {
	value = 0;
	setValueAtTime() {}
	exponentialRampToValueAtTime() {}
}

class FakeNode {
	connect() {}
	disconnect() {}
}

class FakeGain extends FakeNode {
	gain = new FakeParam();
}

class FakeOscillator extends FakeNode {
	type = "sine";
	frequency = new FakeParam();
	onended: (() => void) | null = null;
	start(at: number) {
		started.push(at);
	}
	stop() {}
}

/** El reloj del contexto: avanza siempre, cada test empieza lejos del anterior. */
let now = 0;

class FakeAudioContext {
	state = "running";
	destination = new FakeNode();
	get currentTime() {
		return now;
	}
	createGain() {
		return new FakeGain();
	}
	createOscillator() {
		return new FakeOscillator();
	}
	resume() {
		return Promise.resolve();
	}
}

const storage = new Map<string, string>();

// Otros archivos de test montan su propio `window` falso: se deja como estaba.
const original = globalThis as { window?: unknown; document?: unknown };
const originalWindow = original.window;
const originalDocument = original.document;

/** Inicio de cada test. */
let clock = 0;

beforeEach(() => {
	Object.assign(globalThis, {
		window: {
			AudioContext: FakeAudioContext,
			localStorage: {
				getItem: (key: string) => storage.get(key) ?? null,
				setItem: (key: string, value: string) => storage.set(key, value),
				removeItem: (key: string) => storage.delete(key),
			},
		},
		document: { hidden: false },
	});
	started = [];
	storage.clear();
	clock += 100;
	now = clock;
});

afterEach(() => {
	Object.assign(globalThis, {
		window: originalWindow,
		document: originalDocument,
	});
});

/** Arranques distintos (las octavas y los acordes arrancan juntos). */
function attacks(): number[] {
	return [...new Set(started)].sort((a, b) => a - b);
}

describe("duraciones y forma", () => {
	test("el récord dura más que el logro (D146)", () => {
		assert.ok(getSoundDuration("record") > getSoundDuration("achievement"));
	});

	test("el tic de selección es el más corto de todos (D143)", () => {
		const others: SoundName[] = [
			"correct",
			"incorrect",
			"found",
			"achievement",
			"start",
			"skip",
			"penalty",
			"record",
		];
		for (const name of others) {
			assert.ok(getSoundDuration("select") < getSoundDuration(name), name);
		}
	});

	test("saltar es una sola nota (D144)", () => {
		assert.equal(getSoundAttackCount("skip"), 1);
	});

	test("ningún sonido pasa de 3 s (WCAG 1.4.2, D082)", () => {
		for (const name of ["record", "achievement", "start"] as const) {
			assert.ok(getSoundDuration(name) < 3, name);
		}
	});
});

describe("programación", () => {
	test("el castigo suena a la vez que el fallo (D145)", () => {
		playSound("incorrect");
		playSound("penalty");
		assert.equal(attacks()[0], clock);
		// Los dos arrancan en `now`: el golpe no espera al fallo.
		assert.ok(started.filter((at) => at === clock).length >= 4);
	});

	test("el récord espera a que termine el acierto (D146)", () => {
		playSound("correct");
		const correctEnd = clock + getSoundDuration("correct");
		started = [];
		playSound("record");
		assert.ok(attacks()[0] > correctEnd);
	});

	test("dos tics a menos de 50 ms suenan como uno (D143)", () => {
		playSound("select");
		const afterFirst = started.length;
		assert.ok(afterFirst > 0);

		now = clock + 0.02;
		playSound("select");
		assert.equal(started.length, afterFirst);

		now = clock + 0.2;
		playSound("select");
		assert.ok(started.length > afterFirst);
	});

	test("con el sonido apagado no suena ninguno (D081)", () => {
		storage.set(SOUND_KEY, "false");
		for (const name of [
			"select",
			"start",
			"skip",
			"penalty",
			"record",
		] as const) {
			playSound(name);
		}
		assert.equal(started.length, 0);
	});
});
