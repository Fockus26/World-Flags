import { useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

interface UserAvatarProps {
	/** URL de dicebear, o `null` si no hay avatar (p. ej. una fila vieja del ranking): se pinta la inicial. */
	src: string | null;
	/** De él sale la inicial del respaldo. */
	name: string;
	/** Tamaño y forma de la caja (`size-…`, `rounded-full`, `shrink-0`): la comparten imagen, skeleton e inicial. */
	className: string;
	/** Tipografía de la inicial, a la medida de la caja. */
	initialClassName: string;
	/** `lazy` en listas largas (el ranking): solo se piden los avatares que se llegan a ver. */
	loading?: "eager" | "lazy";
}

/**
 * El avatar viene de dicebear (CDN externo): aunque los datos ya estén, la
 * imagen tarda en llegar, o no llega sin red. Mientras tanto se ve el
 * skeleton (que, como todos, espera `SKELETON_DELAY_MS` antes de verse: un
 * avatar en caché no parpadea); si falla, la inicial del nombre en vez de un
 * hueco. Quien lo usa le pone `key` con `src` para que un avatar nuevo vuelva
 * a empezar en "cargando".
 *
 * El skeleton se quita, no queda debajo: los avatares de dicebear tienen
 * fondo transparente y el brillo se vería a través de la imagen.
 *
 * Sin conexión (D052): un avatar ya visto sale de la caché HTTP del navegador
 * (dicebear lo sirve con `max-age` de ~1 año); si no está, en vez del disco
 * vacío se ve la inicial del nombre. Siempre decorativo: el nombre ya está al
 * lado (o en el `aria-label` del botón que lo contiene).
 *
 * Salió de `UserSummary` para compartirlo con el ranking (D078), con el mismo
 * aspecto: la caja y la tipografía de la inicial las pone quien lo usa.
 */
export function UserAvatar({
	src,
	name,
	className,
	initialClassName,
	loading = "eager",
}: UserAvatarProps) {
	const [status, setStatus] = useState<"loading" | "loaded" | "error">(
		src === null ? "error" : "loading",
	);

	const initial = [...name.trim()][0]?.toUpperCase() ?? "";

	return (
		<span className={`relative ${className}`}>
			{status === "loading" && (
				<Skeleton className="absolute inset-0 rounded-full" />
			)}

			{status === "error" && (
				<span
					className={`absolute inset-0 grid place-items-center rounded-full bg-primary-soft font-black text-surface-soft ${initialClassName}`}
					aria-hidden="true"
				>
					{initial}
				</span>
			)}

			{src !== null && (
				<img
					className={`size-full rounded-full object-cover ${status === "loaded" ? "" : "opacity-0"}`}
					src={src}
					alt=""
					aria-hidden="true"
					loading={loading}
					decoding="async"
					onLoad={() => setStatus("loaded")}
					onError={() => setStatus("error")}
				/>
			)}
		</span>
	);
}
