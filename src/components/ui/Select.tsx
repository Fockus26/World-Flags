import { AnimatePresence, motion } from "framer-motion";
import { NavArrowDown } from "iconoir-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { motionTransition, motionVariants } from "@/styles/animations";
import styles from "./Select.module.css";

export interface SelectOption {
	value: string;
	label: string;
}

type SelectVariant = "primary" | "secondary";

interface SelectProps {
	options: SelectOption[];
	value: string;
	onChange: (value: string) => void;
	variant?: SelectVariant;
	label?: string;
	"aria-label"?: string;
	id?: string;
	className?: string;
}

const MotionNavArrowDown = motion(NavArrowDown);

export function Select({
	options,
	value,
	onChange,
	variant = "secondary",
	label,
	"aria-label": ariaLabel,
	id,
	className,
}: SelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(() =>
		Math.max(
			0,
			options.findIndex((option) => option.value === value),
		),
	);

	const triggerRef = useRef<HTMLButtonElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const generatedId = useId();
	const listboxId = `${id ?? generatedId}-listbox`;
	const labelId = `${id ?? generatedId}-label`;

	const selectedOption = options.find((option) => option.value === value);
	const isFloated = isOpen || Boolean(selectedOption);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		function handleClickOutside(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	function openAtCurrentValue() {
		setActiveIndex(
			Math.max(
				0,
				options.findIndex((option) => option.value === value),
			),
		);
		setIsOpen(true);
	}

	function selectOption(index: number) {
		const option = options[index];
		if (!option) {
			return;
		}
		onChange(option.value);
		setIsOpen(false);
		triggerRef.current?.focus();
	}

	function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				if (!isOpen) {
					openAtCurrentValue();
					return;
				}
				setActiveIndex((current) => Math.min(current + 1, options.length - 1));
				return;
			case "ArrowUp":
				event.preventDefault();
				if (!isOpen) {
					openAtCurrentValue();
					return;
				}
				setActiveIndex((current) => Math.max(current - 1, 0));
				return;
			case "Home":
				if (!isOpen) return;
				event.preventDefault();
				setActiveIndex(0);
				return;
			case "End":
				if (!isOpen) return;
				event.preventDefault();
				setActiveIndex(options.length - 1);
				return;
			case "Enter":
			case " ":
				event.preventDefault();
				if (isOpen) {
					selectOption(activeIndex);
				} else {
					openAtCurrentValue();
				}
				return;
			case "Escape":
				if (isOpen) {
					event.preventDefault();
					setIsOpen(false);
				}
				return;
			default:
				return;
		}
	}

	return (
		<div className={`${styles.selectRoot}${className ? ` ${className}` : ""}`} ref={rootRef}>
			<button
				ref={triggerRef}
				type="button"
				id={id}
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-controls={listboxId}
				aria-activedescendant={isOpen ? `${listboxId}-option-${activeIndex}` : undefined}
				aria-label={label ? undefined : ariaLabel}
				aria-labelledby={label ? labelId : undefined}
				className={`${styles.trigger}${label ? ` ${styles.triggerWithLabel}` : ""} ${
					variant === "primary" ? styles.primaryTrigger : styles.secondaryTrigger
				}`}
				onClick={() => (isOpen ? setIsOpen(false) : openAtCurrentValue())}
				onKeyDown={handleTriggerKeyDown}
			>
				<span className={styles.triggerContent}>
					{label && (
						<span
							id={labelId}
							className={`${styles.floatingLabel}${isFloated ? ` ${styles.floatingLabelFloated}` : ""}`}
						>
							{label}
						</span>
					)}
					<span className={styles.triggerValue}>{selectedOption?.label ?? ""}</span>
				</span>
				<MotionNavArrowDown
					className={styles.triggerArrow}
					variants={motionVariants.rotateArrow}
					animate={isOpen ? "open" : "closed"}
					transition={motionTransition(0.07)}
				/>
			</button>
			<AnimatePresence>
				{isOpen && (
					<motion.ul
						id={listboxId}
						role="listbox"
						className={styles.listbox}
						aria-label={ariaLabel}
						variants={motionVariants.dropdownAppear}
						initial="hidden"
						animate="visible"
						exit="hidden"
					>
						{options.map((option, index) => (
							<li
								key={option.value}
								id={`${listboxId}-option-${index}`}
								role="option"
								aria-selected={option.value === value}
								className={
									index === activeIndex
										? `${styles.option} ${styles.optionActive}`
										: styles.option
								}
								onMouseEnter={() => setActiveIndex(index)}
								onClick={() => selectOption(index)}
							>
								{option.label}
							</li>
						))}
					</motion.ul>
				)}
			</AnimatePresence>
		</div>
	);
}
