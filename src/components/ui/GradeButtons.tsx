import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ReviewGrade } from "@/types/progress";

interface GradeButtonsProps {
	onGrade: (grade: ReviewGrade) => void;
}

const GRADES: {
	grade: ReviewGrade;
	label: string;
	key: string;
	color: "primary" | "secondary" | "danger" | "warning" | "success";
}[] = [
	{ grade: "again", label: "Otra vez", key: "1", color: "danger" },
	{ grade: "hard", label: "Difícil", key: "2", color: "warning" },
	{ grade: "good", label: "Bien", key: "3", color: "primary" },
	{ grade: "easy", label: "Fácil", key: "4", color: "success" },
];

const SELECTION_FEEDBACK_MS = 500;

export function GradeButtons({ onGrade }: GradeButtonsProps) {
	const [selectedGrade, setSelectedGrade] = useState<ReviewGrade | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	const handleClick = (grade: ReviewGrade) => {
		if (selectedGrade) return;
		setSelectedGrade(grade);
		timeoutRef.current = setTimeout(() => {
			onGrade(grade);
		}, SELECTION_FEEDBACK_MS);
	};

	return (
		<div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
			{GRADES.map(({ grade, label, key, color }) => (
				<Button
					key={grade}
					color={color}
					variant="soft"
					type="button"
					pressed={selectedGrade === grade}
					disabled={selectedGrade !== null && selectedGrade !== grade}
					className="flex gap-3 items-center"
					onClick={() => handleClick(grade)}
				>
					<kbd className="hidden sm:inline font-[inherit] font-extrabold">{key}</kbd>
					{label}
				</Button>
			))}
		</div>
	);
}
