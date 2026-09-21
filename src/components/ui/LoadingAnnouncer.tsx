import { useEffect, useRef, useState } from "react";
import { SKELETON_DELAY_MS } from "./Skeleton";

interface LoadingAnnouncerProps {
	isLoading: boolean;
	loadingMessage: string;
	readyMessage: string;
}

/**
 * Anuncia una carga a los lectores de pantalla, una sola vez: "cargando"
 * cuando el skeleton llega a verse (`SKELETON_DELAY_MS`) y "listo" cuando
 * termina — y solo si antes se anunció "cargando". Una carga más rápida que
 * el umbral no anuncia nada, igual que visualmente no muestra skeleton.
 *
 * Es una región `role="status"` (educada, no interrumpe) visualmente oculta.
 * Tiene que estar montada antes de que cambie su texto para que se anuncie,
 * y fuera de la zona `inert` / `aria-busy` que tapa el skeleton.
 */
export function LoadingAnnouncer({
	isLoading,
	loadingMessage,
	readyMessage,
}: LoadingAnnouncerProps) {
	const [message, setMessage] = useState("");
	const hasAnnouncedLoadingRef = useRef(false);

	useEffect(() => {
		if (isLoading) {
			const timeoutId = setTimeout(() => {
				hasAnnouncedLoadingRef.current = true;
				setMessage(loadingMessage);
			}, SKELETON_DELAY_MS);

			return () => clearTimeout(timeoutId);
		}

		if (hasAnnouncedLoadingRef.current) {
			hasAnnouncedLoadingRef.current = false;
			setMessage(readyMessage);
		}
	}, [isLoading, loadingMessage, readyMessage]);

	return (
		<p role="status" className="sr-only">
			{message}
		</p>
	);
}
