import { Button } from "@/components/ui/Button";
import type { ReviewGrade } from "@/types/progress";
import styles from "./GradeButtons.module.css";

interface GradeButtonsProps {
	onGrade: (grade: ReviewGrade) => void;
}

const GRADES: { grade: ReviewGrade; label: string; key: string }[] = [
	{ grade: "again", label: "Otra vez", key: "1" },
	{ grade: "hard", label: "Difícil", key: "2" },
	{ grade: "good", label: "Bien", key: "3" },
	{ grade: "easy", label: "Fácil", key: "4" },
];

export function GradeButtons({ onGrade }: GradeButtonsProps) {
	return (
		<div className={styles.gradeButtons}>
			{GRADES.map(({ grade, label, key }) => (
				<Button
					key={grade}
					type="button"
					variant="secondary"
					className={styles[grade]}
					onClick={() => onGrade(grade)}
				>
					<kbd className={styles.key}>{key}</kbd>
					{label}
				</Button>
			))}
		</div>
	);
}
