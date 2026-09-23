/**
 * Las capitales del modo Capitales (`data/capitals.ts`) y cómo se comparan
 * las respuestas (`isAcceptedAnswer`, D063-D065). Cubren:
 *
 * - Una entrada por país del catálogo, ni una más, sin espacios sobrantes ni
 *   alias repetidos.
 * - Las decisiones del dueño (capitales múltiples, Israel y Palestina,
 *   Malabo, sedes que no valen).
 * - La regla de signos: en difícil cuentan como las tildes (con el ’ de la
 *   fuente igual al ' del teclado); en fácil se ignoran.
 * - Que Banderas y Países comparan exactamente igual que antes.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { CAPITALS } from "@/data/capitals";
import { countries } from "@/data/countries";
import {
	getAcceptedCapitals,
	getCapital,
	isCorrectCapital,
} from "@/utils/capitals";
import {
	isAcceptedAnswer,
	isCorrectAnswer,
	normalize,
} from "@/utils/normalize-answer";

const hard = (answer: string, code: string) =>
	isCorrectCapital(answer, code, "hard");
const easy = (answer: string, code: string) =>
	isCorrectCapital(answer, code, "easy");

describe("los datos", () => {
	test("una capital por país del catálogo, ni una más", () => {
		const catalog = countries.map((country) => country.code).sort();

		assert.deepEqual(Object.keys(CAPITALS).sort(), catalog);
	});

	test("sin textos vacíos ni espacios sobrantes", () => {
		for (const [code, capital] of Object.entries(CAPITALS)) {
			for (const value of getAcceptedCapitals(capital)) {
				assert.ok(value.length > 0, code);
				assert.equal(value, value.trim(), code);
				assert.doesNotMatch(value, /\s{2}/, code);
			}

			if (capital.note !== undefined) {
				assert.ok(capital.note.trim().length > 0, code);
			}
		}
	});

	test("ningún alias repite otra respuesta del mismo país", () => {
		for (const [code, capital] of Object.entries(CAPITALS)) {
			const values = getAcceptedCapitals(capital).map((value) =>
				normalize(value, "hard"),
			);

			assert.equal(new Set(values).size, values.length, code);
		}
	});

	test("un código sin entrada no tiene capital (ni hereda nada del prototipo)", () => {
		assert.equal(getCapital("zz"), undefined);
		assert.equal(getCapital("constructor"), undefined);
		assert.equal(hard("Madrid", "zz"), false);
	});
});

describe("decisiones del dueño (D064)", () => {
	test("capitales múltiples: valen todas", () => {
		assert.ok(hard("Sucre", "bo"));
		assert.ok(hard("La Paz", "bo"));

		for (const city of [
			"Pretoria",
			"Ciudad del Cabo",
			"Bloemfontein",
			"Tshwane",
		]) {
			assert.ok(hard(city, "za"), city);
		}

		assert.ok(hard("Kuala Lumpur", "my") && hard("Putrajaya", "my"));
		assert.ok(hard("Porto Novo", "bj") && hard("Cotonú", "bj"));
		assert.ok(hard("Sri Jayawardenapura Kotte", "lk") && hard("Colombo", "lk"));
		assert.ok(
			hard("Babane", "sz") && hard("Mbabane", "sz") && hard("Lobamba", "sz"),
		);
		assert.ok(hard("Saná", "ye") && hard("Adén", "ye"));
	});

	test("Israel y Palestina", () => {
		assert.equal(CAPITALS.il?.name, "Jerusalén");
		assert.ok(hard("Jerusalén", "il"));
		assert.equal(hard("Tel Aviv", "il"), false);

		assert.equal(CAPITALS.ps?.name, "Jerusalén Este");
		assert.ok(hard("Jerusalén Este", "ps"));
		assert.ok(hard("Ramala", "ps"));
	});

	test("Guinea Ecuatorial: Ciudad de la Paz; Malabo ya no vale", () => {
		assert.ok(hard("Ciudad de la Paz", "gq"));
		assert.equal(hard("Malabo", "gq"), false);
		// "La Paz" es Bolivia, no una forma corta de Ciudad de la Paz.
		assert.equal(hard("La Paz", "gq"), false);
	});

	test("sedes que ninguna fuente llama capital no valen", () => {
		assert.equal(hard("La Haya", "nl"), false);
		assert.equal(hard("Valparaíso", "cl"), false);
		assert.equal(hard("Abiyán", "ci"), false);
		assert.equal(hard("Dar es-Salaam", "tz"), false);
		assert.equal(hard("Nusantara", "id"), false);
		assert.equal(hard("Nur-Sultán", "kz"), false);
		assert.equal(hard("Rangún", "mm"), false);
	});

	test("variantes documentadas y formas corta o larga", () => {
		assert.ok(hard("Santiago", "cl") && hard("Santiago de Chile", "cl"));
		assert.ok(hard("Washington D. C.", "us") && hard("Washington", "us"));
		assert.ok(hard("Hanoi", "vn") && hard("Hanói", "vn"));
		assert.ok(hard("Camberra", "au") && hard("Canberra", "au"));
		assert.ok(hard("Taipéi", "tw") && hard("Taipei", "tw"));
	});
});

describe("tildes y signos (D065)", () => {
	test("difícil exige las tildes; fácil no", () => {
		assert.equal(hard("Bogota", "co"), false);
		assert.ok(hard("Bogotá", "co"));
		assert.ok(easy("bogota", "co"));
	});

	test("difícil exige el apóstrofo; vale el del teclado aunque la fuente use ’", () => {
		assert.equal(CAPITALS.ag?.name, "Saint John’s");
		assert.ok(hard("Saint John's", "ag"));
		assert.ok(hard("saint john’s", "ag"));
		assert.equal(hard("Saint Johns", "ag"), false);
		assert.ok(easy("Saint Johns", "ag"));
	});

	test("difícil exige guiones y espacios como son; fácil los ignora", () => {
		assert.equal(hard("Porto-Novo", "bj"), false);
		assert.ok(easy("Porto-Novo", "bj"));
		assert.ok(easy("portonovo", "bj"));

		assert.equal(hard("Port au Prince", "ht"), false);
		assert.ok(hard("Port-au-Prince", "ht"));
		assert.ok(easy("port au prince", "ht"));

		assert.equal(hard("Washington DC", "us"), false);
		assert.ok(easy("Washington DC", "us"));
	});

	test("cualquier apóstrofo, guion o raya vale como el del teclado (QA)", () => {
		// ´ (teclado español), ʼ, y los guiones que ponen los móviles.
		assert.ok(hard("Saint John´s", "ag"));
		assert.ok(hard("Saint Johnʼs", "ag"));
		assert.ok(hard("Port–au–Prince", "ht"));
		assert.ok(hard("Port‑au‑Prince", "ht"));
		// Pero siguen haciendo falta: sin signo, en difícil, no vale.
		assert.equal(hard("Port au Prince", "ht"), false);
	});

	test("una tilde pegada como carácter aparte (NFD) vale como la normal", () => {
		assert.ok(hard("Bogotá", "co"));
	});

	test("mayúsculas, espacios alrededor y espacios repetidos no cuentan", () => {
		assert.ok(hard("  buenos   AIRES ", "ar"));
	});

	test("una respuesta vacía nunca vale", () => {
		assert.equal(isAcceptedAnswer("", [""], "easy"), false);
		assert.equal(hard("   ", "ar"), false);
		assert.equal(easy(" - ", "ar"), false);
	});

	test("Banderas y Países comparan igual que antes", () => {
		assert.equal(
			isCorrectAnswer("Guinea Bisáu", "Guinea-Bisáu", "easy"),
			false,
		);
		assert.equal(
			isCorrectAnswer("Guinea-Bisau", "Guinea-Bisáu", "hard"),
			false,
		);
		assert.ok(isCorrectAnswer("guinea-bisau", "Guinea-Bisáu", "easy"));
	});
});
