import { motion } from "framer-motion";
import { motionVariants } from "@/styles/animations";
import { StimulusFrame } from "./StimulusFrame";

export function FlagDisplay({ countryCode }: { countryCode: string }) {
	return (
		<StimulusFrame
			className="
				p-2
				bg-[linear-gradient(45deg,var(--color-surface-hover)_25%,transparent_25%),linear-gradient(-45deg,var(--color-surface-hover)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--color-surface-hover)_75%),linear-gradient(-45deg,transparent_75%,var(--color-surface-hover)_75%)]
				bg-position-[0_0,0_0.75rem,0.75rem_-0.75rem,-0.75rem_0]
				bg-size-[1.5rem_1.5rem]
				min-[30rem]:p-[0.65rem]
				min-[43rem]:p-[clamp(0.75rem,2vh,1.5rem)]
			"
		>
			<motion.img
				key={countryCode}
				className="block h-full w-[min(100%,30rem)] max-h-72 object-contain transition-[filter,transform,scale] duration-180 ease-in-out hover:scale-[1.015] active:scale-[1.015]"
				src={`/flags/${countryCode}.svg`}
				alt="Bandera que debes identificar"
				variants={motionVariants.flagEnter}
				initial={false}
				animate="visible"
			/>
		</StimulusFrame>
	);
}
