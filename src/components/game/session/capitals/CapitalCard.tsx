/**
 * Estímulo de Capitales (D067, opción B): solo el nombre del país, grande, en
 * el mismo hueco que ocupa la bandera en Banderas. La pregunta del input ya
 * nombra el país, así que el lector de pantalla no depende de esta tarjeta.
 */
export function CapitalCard({ countryName }: { countryName: string }) {
	return (
		<div className="mt-[0.6rem] grid min-h-0 place-items-center overflow-hidden rounded-lg bg-surface-hover p-4 min-[30rem]:mt-[0.65rem] min-[43rem]:mt-[clamp(0.75rem,2vh,1.5rem)] min-[43rem]:p-6">
			{/* `key` por país: la entrada se repite en cada tarjeta, no solo en la primera. */}
			<p
				key={countryName}
				lang="es"
				className="m-0 max-w-full text-center text-3xl leading-tight font-extrabold text-balance wrap-break-word hyphens-auto text-surface-soft animate-in fade-in-0 zoom-in-95 duration-200 min-[30rem]:text-4xl min-[43rem]:text-5xl"
			>
				{countryName}
			</p>
		</div>
	);
}
