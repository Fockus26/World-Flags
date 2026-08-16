import { Button } from "@/components/ui/Button";
import type { ReviewGrade } from "@/types/progress";

interface GradeButtonsProps {
	onGrade: (grade: ReviewGrade) => void;
}

const GRADES: { grade: ReviewGrade; label: string; key: string }[] = [
	{ grade: "again", label: "Otra vez", key: "1" },
	{ grade: "hard", label: "Difícil", key: "2" },
	{ grade: "good", label: "Bien", key: "3" },
	{ grade: "easy", label: "Fácil", key: "4" },
];

const gradeClasses: Record<ReviewGrade, string> = {
	again: "border-danger-border text-danger-text hover:border-danger-hover hover:bg-danger-bg",
	hard: "border-border-secondary text-neutral hover:bg-surface-secondary",
	good: "border-border-primary text-primary hover:bg-primary-soft",
	easy: "border-success-border text-success hover:bg-success-bg",
};

export function GradeButtons({ onGrade }: GradeButtonsProps) {
	return (
		<div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
			{GRADES.map(({ grade, label, key }) => (
				<Button
					key={grade}
					type="button"
					variant="secondary"
					className={gradeClasses[grade]}
					onClick={() => onGrade(grade)}
				>
					<kbd className="mr-2 hidden rounded-sm bg-surface-muted px-2 py-1 text-3 sm:inline">
						{key}
					</kbd>
					{label}
				</Button>
			))}
		</div>
	);
}
