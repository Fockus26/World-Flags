import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 90_000,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: [["list"]],
	use: {
		headless: true,
		baseURL: process.env.BASE_URL ?? "http://localhost:4321",
		trace: "off",
	},
});
