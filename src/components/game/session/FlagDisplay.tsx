import { motion } from "framer-motion";
import { motionVariants } from "@/styles/animations";

export function FlagDisplay({ countryCode }: { countryCode: string }) {
	return (
		<div
			className="
				mt-[0.6rem] grid min-h-0 place-items-center
				overflow-hidden rounded-lg border border-border-soft
				p-2
				bg-[linear-gradient(45deg,var(--color-checker)_25%,transparent_25%),linear-gradient(-45deg,var(--color-checker)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--color-checker)_75%),linear-gradient(-45deg,transparent_75%,var(--color-checker)_75%)]
				bg-position-[0_0,0_0.75rem,0.75rem_-0.75rem,-0.75rem_0]
				bg-size-[1.5rem_1.5rem]
				min-[30rem]:mt-[0.65rem] min-[30rem]:p-[0.65rem]
				min-[43rem]:mt-[clamp(0.75rem,2vh,1.5rem)] min-[43rem]:p-[clamp(0.75rem,2vh,1.5rem)]
			"
		>
			<motion.img
				key={countryCode}
				className="
					block h-full w-[min(100%,30rem)] max-h-72 object-contain
					transition-[filter,transform, scale] duration-180 ease-in-out
					hover:scale-[1.015]
				"
				src={`https://flagcdn.com/${countryCode}.svg`}
				alt="Bandera que debes identificar"
				variants={motionVariants.flagEnter}
				initial="hidden"
				animate="visible"
			/>
		</div>
	);
}
