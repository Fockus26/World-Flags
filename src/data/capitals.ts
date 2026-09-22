import type { Capital } from "@/types/country";

/**
 * Las capitales de los 197 países del catálogo (`countries.ts`), para el
 * modo Capitales (D063-D065). Contenido aprobado por el dueño el 2026-09-22;
 * las notas son provisionales (`CONTENT_CHECKLIST.md` #22).
 *
 * Fuentes, consultadas el 2026-09-22 (detalle y consultas para reproducirlo en
 * `context/plans/modo-capitales-capitales.md`, local):
 *
 * - Grafía y ciudad principal: Oficina de Publicaciones de la UE, *Libro de
 *   estilo interinstitucional*, Anexo A5 «Lista de Estados, territorios y
 *   monedas», versión en español, actualizada el 16-09-2026 y elaborada «en
 *   consulta con la Real Academia Española». Se muestra su forma salvo donde
 *   no da capital (lo dice un comentario en la entrada).
 * - Qué ciudad es hoy la capital, capitales múltiples y variantes en español:
 *   Wikidata, propiedad P36 (con sus fechas y roles) y sus etiquetas y alias
 *   en español.
 * - Tercera referencia en los casos dudosos: Wikipedia (en), «List of national
 *   capitals».
 *
 * `accepted` = otras respuestas que valen: otras capitales del mismo país
 * (constitucional, sede del Gobierno…), variantes en español documentadas y
 * formas corta o larga. No valen apodos, nombres o capitales anteriores ni
 * sedes que ninguna fuente llama capital (lo dice un comentario en la
 * entrada). Cómo se comparan: `isAcceptedAnswer` en `normalize-answer.ts`.
 *
 * Un país que cambie de capital (Indonesia tiene designada Nusantara, aún sin
 * traslado) se actualiza aquí, en su propio PR, con la fecha y la fuente.
 * `tests/unit/capitals.test.ts` exige una entrada por país del catálogo.
 */
export const CAPITALS: Readonly<Record<string, Capital>> = {
	// Norteamérica — 3
	ca: { name: "Ottawa" },
	us: { name: "Washington D. C.", accepted: ["Washington"] },
	mx: { name: "Ciudad de México", accepted: ["México"] },

	// Centroamérica — 7
	bz: { name: "Belmopán" },
	cr: { name: "San José" },
	sv: { name: "San Salvador" },
	gt: { name: "Ciudad de Guatemala", accepted: ["Guatemala"] },
	hn: { name: "Tegucigalpa" },
	ni: { name: "Managua" },
	pa: { name: "Panamá", accepted: ["Ciudad de Panamá"] },

	// Caribe — 13
	ag: { name: "Saint John’s", accepted: ["St. John's"] },
	bs: { name: "Nassau", accepted: ["Nasáu"] },
	bb: { name: "Bridgetown" },
	cu: { name: "La Habana", accepted: ["Habana"] },
	dm: { name: "Roseau" },
	gd: { name: "Saint George’s", accepted: ["St. George's"] },
	ht: { name: "Puerto Príncipe", accepted: ["Port-au-Prince"] },
	jm: { name: "Kingston" },
	do: { name: "Santo Domingo" },
	kn: { name: "Basseterre" },
	vc: { name: "Kingstown" },
	lc: { name: "Castries" },
	tt: { name: "Puerto España", accepted: ["Port of Spain"] },

	// Sudamérica — 12
	ar: { name: "Buenos Aires" },
	// Capital múltiple: valen todas.
	bo: {
		name: "Sucre",
		accepted: ["La Paz"],
		note: "Sucre es la capital constitucional; La Paz, la sede del Gobierno.",
	},
	br: { name: "Brasilia" },
	// No vale Valparaíso (sede del Congreso, ninguna fuente la llama capital).
	cl: {
		name: "Santiago",
		accepted: ["Santiago de Chile"],
		note: "El Congreso está en Valparaíso.",
	},
	co: { name: "Bogotá" },
	ec: { name: "Quito" },
	gy: { name: "Georgetown" },
	py: { name: "Asunción" },
	pe: { name: "Lima" },
	sr: { name: "Paramaribo" },
	uy: { name: "Montevideo" },
	ve: { name: "Caracas" },

	// Europa — 45
	al: { name: "Tirana" },
	de: { name: "Berlín" },
	ad: { name: "Andorra la Vieja", accepted: ["Andorra la Vella"] },
	at: { name: "Viena" },
	be: { name: "Bruselas" },
	by: { name: "Minsk" },
	ba: { name: "Sarajevo" },
	bg: { name: "Sofía" },
	// Se muestra la de Wikidata: la UE no da capital.
	va: {
		name: "Ciudad del Vaticano",
		accepted: ["Vaticano"],
		note: "La Santa Sede no tiene capital; la Ciudad del Vaticano es la del Estado.",
	},
	hr: { name: "Zagreb" },
	dk: { name: "Copenhague" },
	sk: { name: "Bratislava" },
	si: { name: "Liubliana" },
	es: { name: "Madrid" },
	ee: { name: "Tallin" },
	fi: { name: "Helsinki" },
	fr: { name: "París" },
	gr: { name: "Atenas" },
	hu: { name: "Budapest" },
	ie: { name: "Dublín" },
	is: { name: "Reikiavik" },
	it: { name: "Roma" },
	// Kosovo no figura en la lista de la UE; principal de Wikidata y Wikipedia.
	xk: { name: "Pristina", accepted: ["Prishtina"] },
	lv: { name: "Riga" },
	li: { name: "Vaduz" },
	lt: { name: "Vilna" },
	lu: { name: "Luxemburgo", accepted: ["Ciudad de Luxemburgo"] },
	mk: { name: "Skopie", accepted: ["Escopia"] },
	mt: { name: "La Valeta", accepted: ["Valeta"] },
	md: { name: "Chisináu" },
	mc: { name: "Mónaco" },
	// No vale Cetiña (antigua capital real, sede de la Presidencia).
	me: { name: "Podgorica", note: "Cetiña es la antigua capital real." },
	no: { name: "Oslo" },
	// No vale La Haya (sede del Gobierno; ni la UE ni Wikidata la llaman capital).
	nl: {
		name: "Ámsterdam",
		note: "La Haya es la sede del Gobierno, pero la capital es Ámsterdam.",
	},
	pl: { name: "Varsovia" },
	pt: { name: "Lisboa" },
	gb: { name: "Londres" },
	cz: { name: "Praga" },
	ro: { name: "Bucarest" },
	ru: { name: "Moscú" },
	sm: { name: "San Marino", accepted: ["Ciudad de San Marino"] },
	rs: { name: "Belgrado" },
	se: { name: "Estocolmo" },
	ch: {
		name: "Berna",
		note: "Suiza no nombra capital oficial: Berna es la «ciudad federal».",
	},
	ua: { name: "Kiev" },

	// Oceanía — 14
	au: { name: "Camberra", accepted: ["Canberra"] },
	fj: { name: "Suva" },
	mh: { name: "Majuro" },
	sb: { name: "Honiara" },
	ki: { name: "Tarawa", accepted: ["Tarawa Sur"] },
	fm: { name: "Palikir" },
	nr: {
		name: "Yaren",
		note: "Nauru no tiene capital oficial: el Gobierno está en el distrito de Yaren.",
	},
	nz: { name: "Wellington" },
	pw: {
		name: "Melekeok",
		accepted: ["Ngerulmud"],
		note: "El Gobierno está en Ngerulmud, en el estado de Melekeok.",
	},
	pg: { name: "Port Moresby", accepted: ["Puerto Moresby"] },
	ws: { name: "Apia" },
	to: { name: "Nukualofa" },
	tv: { name: "Funafuti" },
	vu: { name: "Port Vila" },

	// Asia — 49
	af: { name: "Kabul" },
	sa: { name: "Riad" },
	am: { name: "Ereván", accepted: ["Yereván"] },
	az: { name: "Bakú" },
	bh: { name: "Manama" },
	bd: { name: "Daca", accepted: ["Dacca", "Dhaka"] },
	bn: { name: "Bandar Seri Begawan" },
	bt: { name: "Timbu" },
	kh: { name: "Nom Pen", accepted: ["Phnom Penh"] },
	qa: { name: "Doha" },
	cn: { name: "Pekín", accepted: ["Beijing"] },
	cy: { name: "Nicosia" },
	kp: { name: "Pionyang" },
	kr: { name: "Seúl" },
	ae: { name: "Abu Dabi", accepted: ["Abu Dhabi"] },
	ph: { name: "Manila" },
	ge: { name: "Tiflis", accepted: ["Tbilisi"] },
	in: { name: "Nueva Deli", accepted: ["Nueva Delhi"] },
	// No vale Nusantara (designada por ley; Wikipedia: aún no es la capital).
	id: {
		name: "Yakarta",
		accepted: ["Jakarta"],
		note: "Hay una nueva capital designada, Nusantara, todavía sin traslado oficial.",
	},
	iq: { name: "Bagdad" },
	ir: { name: "Teherán" },
	// Se muestra la de Wikidata: la UE no da capital.
	// Decisión del dueño (2026-09-22, opción B): Jerusalén con nota neutra.
	il: {
		name: "Jerusalén",
		note: "Sede del Gobierno y del Parlamento; su estatus como capital es objeto de disputa internacional.",
	},
	jp: { name: "Tokio" },
	jo: { name: "Amán", accepted: ["Ammán"] },
	// No vale Nur-Sultán (nombre anterior).
	kz: { name: "Astaná", note: "Se llamó Nur-Sultán entre 2019 y 2022." },
	kg: { name: "Biskek" },
	kw: { name: "Kuwait", accepted: ["Ciudad de Kuwait"] },
	la: { name: "Vientián" },
	lb: { name: "Beirut" },
	// Capital múltiple: valen todas.
	my: {
		name: "Kuala Lumpur",
		accepted: ["Putrajaya"],
		note: "Kuala Lumpur es la capital constitucional; Putrajaya, la sede del Gobierno.",
	},
	mv: { name: "Malé" },
	mn: { name: "Ulán Bator" },
	// No vale Rangún (antigua capital).
	mm: {
		name: "Naipyidó",
		accepted: ["Naypyidaw", "Nay Pyi Taw", "Nepidó"],
		note: "Es la capital desde 2005; antes lo era Rangún.",
	},
	np: { name: "Katmandú" },
	om: { name: "Mascate" },
	// No vale Rawalpindi (Wikidata la arrastra de 1958-1967; Wikipedia: capital provisional).
	pk: { name: "Islamabad" },
	// Se muestra la de Wikidata: la UE no da capital.
	// Decisión del dueño (2026-09-22): se muestra Jerusalén Este; vale también Ramala.
	ps: {
		name: "Jerusalén Este",
		accepted: ["Ramala", "Jerusalén Oriental"],
		note: "Capital proclamada. Ramala es la sede administrativa.",
	},
	sg: { name: "Singapur", accepted: ["Ciudad de Singapur"] },
	sy: { name: "Damasco" },
	// Capital múltiple: valen todas.
	lk: {
		name: "Sri Jayawardenapura Kotte",
		accepted: ["Colombo", "Sri Jayawardenepura Kotte"],
		note: "Sri Jayawardenapura Kotte es la capital administrativa; Colombo, la comercial.",
	},
	th: { name: "Bangkok", accepted: ["Bancoc"] },
	tw: { name: "Taipéi", accepted: ["Taipei"] },
	tj: { name: "Dusambé" },
	tl: { name: "Dili" },
	tm: { name: "Asjabad", accepted: ["Asgabad", "Ashjabad"] },
	tr: { name: "Ankara" },
	uz: { name: "Taskent" },
	vn: { name: "Hanoi", accepted: ["Hanói"] },
	// Capital múltiple: valen todas.
	ye: {
		name: "Saná",
		accepted: ["Adén"],
		note: "Adén es la capital provisional del Gobierno reconocido desde 2015.",
	},

	// África — 54
	ao: { name: "Luanda" },
	dz: { name: "Argel" },
	// Capital múltiple: valen todas.
	bj: {
		name: "Porto Novo",
		accepted: ["Cotonú"],
		note: "Porto Novo es la capital oficial; Cotonú, la sede del Gobierno.",
	},
	bw: { name: "Gaborone" },
	bf: { name: "Uagadugu", accepted: ["Uagadugú"] },
	// No vale Buyumbura (capital económica).
	bi: {
		name: "Guitega",
		accepted: ["Gitega"],
		note: "Es la capital política desde 2019; Buyumbura, la económica.",
	},
	cv: { name: "Praia" },
	cm: { name: "Yaundé", accepted: ["Yaoundé"] },
	td: { name: "Yamena" },
	km: { name: "Moroni" },
	// No vale Abiyán (la UE: «centro administrativo»; WD no la registra como capital).
	ci: {
		name: "Yamusukro",
		note: "Abiyán es la capital económica y el centro administrativo.",
	},
	eg: { name: "El Cairo" },
	er: { name: "Asmara" },
	// Capital múltiple: valen todas.
	sz: {
		name: "Babane",
		accepted: ["Mbabane", "Lobamba"],
		note: "Babane (Mbabane) es la capital administrativa; Lobamba, la real y legislativa.",
	},
	et: { name: "Adís Abeba" },
	ga: { name: "Libreville" },
	gm: { name: "Banjul" },
	gh: { name: "Acra", accepted: ["Accra"] },
	gn: { name: "Conakri", accepted: ["Conakry"] },
	gw: { name: "Bisáu", accepted: ["Bissau"] },
	// Decisión del dueño (2026-09-22): Malabo no vale.
	gq: {
		name: "Ciudad de la Paz",
		note: "Malabo fue la capital hasta enero de 2026.",
	},
	ke: { name: "Nairobi" },
	ls: { name: "Maseru" },
	lr: { name: "Monrovia" },
	ly: { name: "Trípoli" },
	mg: { name: "Antananarivo" },
	mw: { name: "Lilongüe" },
	ml: { name: "Bamako" },
	ma: { name: "Rabat" },
	mu: { name: "Port Louis" },
	mr: { name: "Nuakchot" },
	mz: { name: "Maputo" },
	na: { name: "Windhoek" },
	ne: { name: "Niamey" },
	ng: { name: "Abuya" },
	cf: { name: "Bangui" },
	cg: { name: "Brazzaville" },
	cd: { name: "Kinsasa" },
	rw: { name: "Kigali" },
	st: { name: "Santo Tomé" },
	sn: { name: "Dakar" },
	sc: { name: "Victoria" },
	sl: { name: "Freetown" },
	so: { name: "Mogadiscio" },
	// Capital múltiple: valen todas.
	za: {
		name: "Pretoria",
		accepted: ["Ciudad del Cabo", "Bloemfontein", "Tshwane"],
		note: "Pretoria es la capital administrativa; Ciudad del Cabo, la legislativa, y Bloemfontein, la judicial.",
	},
	sd: { name: "Jartum", accepted: ["Kartum"] },
	ss: { name: "Yuba", accepted: ["Juba"] },
	// No vale Dar es-Salaam (antigua capital).
	tz: {
		name: "Dodoma",
		note: "Muchas instituciones siguen en Dar es-Salaam, la antigua capital.",
	},
	tg: { name: "Lomé" },
	tn: { name: "Túnez" },
	ug: { name: "Kampala" },
	dj: { name: "Yibuti", accepted: ["Ciudad de Yibuti", "Djibouti"] },
	zm: { name: "Lusaka" },
	zw: { name: "Harare" },
};
