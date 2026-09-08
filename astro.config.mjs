// @ts-check

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// TODO: reemplazar por el dominio real una vez desplegado — sin esto, las
// URLs canónicas, el sitemap y las meta og:url quedan mal armadas.
const SITE_URL = "https://world-flags.example.com";

// https://astro.build/config
export default defineConfig({
	site: SITE_URL,
	integrations: [
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler"]],
			},
		}),
		sitemap(),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
