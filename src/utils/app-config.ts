import { supabase } from "@/lib/supabase";

import { parseVersion } from "./min-version";

/**
 * Configuración de la app que vive fuera del bundle (tabla `app_config` de
 * Supabase, lectura pública; SQL en `supabase/app-config.sql`, D108): se
 * cambia desde el dashboard sin desplegar. Hoy solo guarda la versión mínima
 * con la que se puede jugar (D109).
 *
 * Archivo aparte de `cloud-storage.ts` a propósito: aquí no hay cuenta ni
 * progreso, y un fallo no se clasifica ni se muestra — cualquier cosa que no
 * sea una respuesta válida vale "no hay mínima".
 */

/** Fila de `app_config` con la versión mínima. */
const MIN_VERSION_KEY = "min_version";

/**
 * Tope de la consulta. Es una fila diminuta: lo normal es menos de un
 * segundo. Con red lenta, mejor dejar jugar que esperar (D110): pasado el
 * tope se da por "sin mínima" y se vuelve a mirar al volver a la pestaña.
 */
const MIN_VERSION_TIMEOUT_MS = 5_000;

/**
 * La versión mínima publicada, o `null` si no se pudo saber: sin red, tope
 * agotado, error del servidor, la tabla aún no existe (SQL sin aplicar), la
 * fila no está o su valor no es `MAJOR.MINOR.PATCH`. Nunca lanza: quien la
 * llama trata `null` como "no bloquear".
 */
export async function fetchMinVersion(): Promise<string | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), MIN_VERSION_TIMEOUT_MS);

	try {
		const { data, error } = await supabase
			.from("app_config")
			.select("value")
			.eq("key", MIN_VERSION_KEY)
			.abortSignal(controller.signal)
			.maybeSingle();

		if (error || !data) return null;

		return parseVersion(data.value);
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}
