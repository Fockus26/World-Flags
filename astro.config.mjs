// @ts-check

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler"]],
			},
		}),
		AstroPWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg", "favicon.ico"],
			manifest: {
				name: "Banderas del Mundo",
				short_name: "Banderas",
				description: "Aprende las banderas del mundo",
				start_url: "/",
				scope: "/",
				display: "fullscreen",
				orientation: "portrait",
				background_color: "#f1f4f8",
				theme_color: "#2563eb",
				lang: "es",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "maskable-icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{css,js,html,svg,png,ico,woff2}"],
				navigateFallback: "/",
			},
			devOptions: {
				enabled: false,
			},
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
