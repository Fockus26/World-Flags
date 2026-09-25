import { useEffect, useState } from "react";
import { APP_VERSION } from "@/data/changelog";
import { fetchMinVersion } from "@/utils/app-config";
import { isUpdateRequired } from "@/utils/min-version";

/**
 * ¿Hay que actualizar antes de seguir jugando? (D109) Consulta la versión
 * mínima al montar y cada vez que la pestaña vuelve a primer plano (una PWA
 * puede pasar días abierta en segundo plano sin recargar).
 *
 * Solo una respuesta válida cambia el estado: sin red, con error o sin tabla
 * (`fetchMinVersion` → `null`) se queda como estaba (D110). Al arrancar eso es
 * "no bloquear"; si ya estaba bloqueado, perder la red no lo desbloquea. Si la
 * mínima baja, la siguiente consulta sí lo quita.
 */
export function useRequiredUpdate(): boolean {
	const [updateRequired, setUpdateRequired] = useState(false);

	useEffect(() => {
		let active = true;
		// Volver y salir de la pestaña varias veces seguidas no apila consultas.
		let checking = false;

		async function check() {
			if (checking) return;
			checking = true;

			const minVersion = await fetchMinVersion();

			checking = false;
			if (!active || minVersion === null) return;

			setUpdateRequired(isUpdateRequired(APP_VERSION, minVersion));
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "visible") void check();
		}

		void check();
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			active = false;
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	return updateRequired;
}
