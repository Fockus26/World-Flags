import { useEffect, useState } from "react";
import { APP_VERSION, CHANGELOG } from "@/data/changelog";
import { type ChangelogEntry, checkRelease } from "@/utils/changelog";
import {
	getSeenReleaseVersion,
	saveSeenReleaseVersion,
} from "@/utils/learning-storage";

/**
 * ¿Hay que avisar en este dispositivo de las novedades de la versión que
 * corre? (D058). Se decide una vez, al montar: la versión del bundle no cambia
 * sin recargar. Se lee en un efecto y no durante el render porque Astro
 * prerenderiza la isla sin `localStorage`.
 *
 * El aviso no se da por visto al mostrarse, sino al responderle
 * (`markSeen`): si se recarga sin tocarlo, vuelve a salir. `markSeen` solo
 * guarda; `announcedRelease` no cambia, así quien lo usa decide cuándo
 * desmontar (p. ej. después de la animación de cierre del modal).
 */
export function useReleaseNotes() {
	const [announcedRelease, setAnnouncedRelease] =
		useState<ChangelogEntry | null>(null);

	useEffect(() => {
		const check = checkRelease(getSeenReleaseVersion(), APP_VERSION, CHANGELOG);

		if (check.action === "announce") {
			setAnnouncedRelease(check.entry);
		} else if (check.action === "seal") {
			saveSeenReleaseVersion(APP_VERSION);
		}
	}, []);

	const markSeen = () => saveSeenReleaseVersion(APP_VERSION);

	return { announcedRelease, markSeen };
}
