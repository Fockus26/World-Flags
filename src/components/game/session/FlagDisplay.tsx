import { motion } from "framer-motion";
import { motionVariants } from "@/styles/animations";
import styles from "./FlagDisplay.module.css";

export function FlagDisplay({ countryCode }: { countryCode: string }) {
	return (
		<div className={styles.flagContainer}>
			<motion.img
				key={countryCode}
				className={styles.flag}
				src={`https://flagcdn.com/${countryCode}.svg`}
				alt="Bandera que debes identificar"
				variants={motionVariants.flagEnter}
				initial="hidden"
				animate="visible"
			/>
		</div>
	);
}
