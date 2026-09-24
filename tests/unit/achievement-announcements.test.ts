/**
 * Qué logros se anuncian (snackbar, y sonido cuando exista) y cuáles se
 * sellan en silencio.
 *
 * El fallo que esto atrapa: el silencio de la primera pasada tras hidratar
 * solo se gastaba si esa pasada encontraba algún logro. Un perfil nuevo no
 * trae ninguno, así que el silencio quedaba pendiente y se tragaba el aviso
 * del primer logro de verdad ("Primeros pasos").
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createAchievementAnnouncementGate } from "@/utils/achievement-announcements";
import { getNewlyUnlocked } from "@/utils/achievements";
import { createDefaultLearningData } from "@/utils/learning-storage";

Object.assign(globalThis, {
	window: {
		localStorage: {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
		},
	},
});

describe("anuncio de logros", () => {
	test("un perfil nuevo no trae logros que sembrar (la premisa del fallo)", () => {
		assert.deepEqual(getNewlyUnlocked(createDefaultLearningData()), []);
	});

	test("el primer logro de un perfil nuevo se anuncia", () => {
		const gate = createAchievementAnnouncementGate();

		// Primera pasada tras hidratar: no encuentra nada.
		assert.deepEqual(gate.pass([]), []);

		assert.deepEqual(gate.pass(["primeros_pasos"]), ["primeros_pasos"]);
	});

	test("la siembra retroactiva de la primera pasada no se anuncia", () => {
		const gate = createAchievementAnnouncementGate();

		assert.deepEqual(gate.pass(["primeros_pasos", "veinte_banderas"]), []);

		// La pasada que dispara el propio sellado ya no trae nada nuevo.
		assert.deepEqual(gate.pass([]), []);

		assert.deepEqual(gate.pass(["medio_centenar"]), ["medio_centenar"]);
	});

	test("tras salir de ready (login/logout) la siguiente pasada vuelve a ser silenciosa", () => {
		const gate = createAchievementAnnouncementGate();

		gate.pass([]);
		assert.deepEqual(gate.pass(["primeros_pasos"]), ["primeros_pasos"]);

		// Un login trae logros fusionados desde otro dispositivo.
		gate.reset();
		assert.deepEqual(gate.pass(["veinte_banderas"]), []);

		assert.deepEqual(gate.pass(["medio_centenar"]), ["medio_centenar"]);
	});

	test("salir de ready varias veces seguidas no acumula silencios", () => {
		const gate = createAchievementAnnouncementGate();

		gate.reset();
		gate.reset();
		gate.pass([]);

		assert.deepEqual(gate.pass(["primeros_pasos"]), ["primeros_pasos"]);
	});
});
