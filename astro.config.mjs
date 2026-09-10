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
				plugins: [
					[
						"babel-plugin-react-compiler",
						// Solo el código propio: sin esto el compiler también
						// reescribe los bundles de node_modules (react-dom,
						// framer-motion, react-aria...) y rompe el runtime.
						{
							sources: (/** @type {string} */ filename) =>
								filename.includes("/src/"),
						},
					],
				],
			},
		}),
		sitemap(),
	],
	vite: {
		plugins: [tailwindcss()],
		// HeroUI trae react-aria-components como par: sin dedupe, Vite puede
		// pre-empaquetar una segunda copia de React y el runtime del React
		// Compiler (`useMemoCache`) queda desconectado -> "Invalid hook call".
		resolve: {
			dedupe: ["react", "react-dom", "react/compiler-runtime"],
		},
		optimizeDeps: {
			include: ["react", "react-dom", "react/compiler-runtime"],
		},
		ssr: {
			noExternal: ["@heroui/react", "react-aria-components"],
		},
	},
});
