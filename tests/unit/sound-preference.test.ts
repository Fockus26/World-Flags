/**
 * La preferencia "Sonidos" (D081): por dispositivo, en su propia clave de
 * `localStorage` y activada por defecto. Lo que se comprueba es justo lo que
 * decidiría mal un cambio descuidado: que un valor ausente, raro o ilegible
 * NO apague el sonido, y que apagarlo sobreviva a una recarga (se relee de
 * `localStorage`, no de memoria).
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { getSoundEnabled, saveSoundEnabled } from "@/utils/learning-storage";

const KEY = "world-flags-sound-enabled";

class MemoryStorage {
	items = new Map<string, string>();

	getItem(key: string) {
		return this.items.get(key) ?? null;
	}

	setItem(key: string, value: string) {
		this.items.set(key, value);
	}

	removeItem(key: string) {
		this.items.delete(key);
	}
}

let storage = new MemoryStorage();

// Otros archivos de test montan su propio `window` falso: se deja como estaba.
const originalWindow = (globalThis as { window?: unknown }).window;

beforeEach(() => {
	storage = new MemoryStorage();
	Object.assign(globalThis, { window: { localStorage: storage } });
});

afterEach(() => {
	Object.assign(globalThis, { window: originalWindow });
});

describe("preferencia de sonido", () => {
	test("sin nada guardado: activada", () => {
		assert.equal(getSoundEnabled(), true);
	});

	test("apagarla se guarda y se relee", () => {
		saveSoundEnabled(false);

		assert.equal(storage.getItem(KEY), "false");
		assert.equal(getSoundEnabled(), false);
	});

	test("volver a encenderla", () => {
		saveSoundEnabled(false);
		saveSoundEnabled(true);

		assert.equal(storage.getItem(KEY), "true");
		assert.equal(getSoundEnabled(), true);
	});

	test("un valor desconocido no la apaga", () => {
		storage.setItem(KEY, "0");

		assert.equal(getSoundEnabled(), true);
	});

	test("no escribe en la clave del progreso", () => {
		saveSoundEnabled(false);

		assert.deepEqual([...storage.items.keys()], [KEY]);
	});

	test("localStorage ilegible: activada, y guardar no lanza", () => {
		Object.assign(globalThis, {
			window: {
				localStorage: {
					getItem() {
						throw new Error("bloqueado");
					},
					setItem() {
						throw new Error("bloqueado");
					},
				},
			},
		});

		assert.equal(getSoundEnabled(), true);
		assert.doesNotThrow(() => saveSoundEnabled(false));
	});
});
