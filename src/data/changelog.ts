import { parseChangelog } from "@/utils/changelog";
import changelogMarkdown from "../../CHANGELOG.md?raw";
import { version } from "../../package.json";

/**
 * Versión del bundle que está corriendo, fijada al compilar desde
 * `package.json` (única fuente, D057). No se pide a la red a propósito: el
 * service worker puede servir un bundle anterior al último despliegue, y lo
 * que se muestra tiene que ser lo que de verdad corre.
 */
export const APP_VERSION: string = version;

/**
 * Entradas de `CHANGELOG.md`, empaquetado en el mismo bundle que
 * `APP_VERSION`: el texto que se lee siempre es el de la versión que corre.
 * La primera entrada es `APP_VERSION` (lo comprueba `tests/unit/changelog.test.ts`).
 */
export const CHANGELOG = parseChangelog(changelogMarkdown).entries;
