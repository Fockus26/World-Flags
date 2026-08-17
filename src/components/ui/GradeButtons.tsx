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
	again: "border-danger-border-hover text-danger-text  hover:bg-danger-bg",
	hard: "border-border-text text-border-text hover:bg-white hover:text-border-secondary",
	good: "border-primary text-primary hover:bg-primary hover:text-text-primary",
	easy: "border-success-bg text-success-bg hover:bg-success-bg hover:text-success",
};

export function GradeButtons({ onGrade }: GradeButtonsProps) {
	return (
		<div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
			{GRADES.map(({ grade, label, key }) => (
				<Button
					key={grade}
					type="button"
					variant="ghost"
					className={`flex gap-3 items-center ${gradeClasses[grade]}`}
					onClick={() => onGrade(grade)}
				>
					<kbd className="hidden sm:inline font-[inherit] font-extrabold">{key}</kbd>
					{label}
				</Button>
			))}
		</div>
	);
}
