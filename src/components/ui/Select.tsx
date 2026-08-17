import { AnimatePresence, motion } from "framer-motion";
import { NavArrowDown } from "iconoir-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { motionTransition, motionVariants } from "@/styles/animations";

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

const rootClass = "relative w-full";
const triggerBaseClass =
	"flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border-secondary bg-surface px-4 py-3 font-[inherit] text-text-secondary transition-[border-color,background-color,color,box-shadow] duration-180 ease-in-out hover:not-focus:not-disabled:border-border-input-hover focus-visible:border-text aria-expanded:border-primary";

const triggerArrowClass = "size-4 shrink-0 self-center text-text-secondary";

const listboxClass =
	"absolute top-[calc(100%+0.4rem)] left-0 z-20 m-0 max-h-56 w-full list-none overflow-y-auto rounded-md border border-border bg-surface p-0 shadow-(--shadow-secondary) ";

const optionClass =
	"cursor-pointer p-3 text-sm text-text-secondary transition-colors duration-180 ease-in-out aria-selected:font-bold aria-selected:text-text-primary hover:text-text-primary aria-selected:bg-primary/80 hover:bg-primary hover:aria-selected:bg-primary focus:text-text-primary focus:bg-primary aria-selected:focus:bg-primary outline-0";

const triggerWithLabelClass = "min-h-15 items-stretch px-4 pt-6 pb-2";

const triggerContentClass = "relative flex min-w-0 flex-1 flex-col justify-end text-left";

const floatingLabelClass =
	"pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-sm leading-none text-text-subtle transition-[top,transform,font-size,color] duration-160 ease-in-out";

const floatingLabelFloatedClass = "top-[-0.95rem] translate-y-0 text-xs font-bold";

const triggerValueClass = "min-h-[1.2em] overflow-hidden text-ellipsis whitespace-nowrap";

export function Select({
	options,
	value,
	onChange,
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
		<div className={`${rootClass}${className ? ` ${className}` : ""}`} ref={rootRef}>
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
				className={`${triggerBaseClass}${label ? ` ${triggerWithLabelClass}` : ""}`}
				onClick={() => (isOpen ? setIsOpen(false) : openAtCurrentValue())}
				onKeyDown={handleTriggerKeyDown}
			>
				<span className={triggerContentClass}>
					{label && (
						<span
							id={labelId}
							className={`${floatingLabelClass}${
								isFloated ? ` ${floatingLabelFloatedClass}` : ""
							}`}
						>
							{label}
						</span>
					)}

					<span className={triggerValueClass}>{selectedOption?.label ?? ""}</span>
				</span>

				<MotionNavArrowDown
					className={triggerArrowClass}
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
						className={listboxClass}
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
								tabIndex={0}
								// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: patrón combobox con aria-activedescendant (WAI-ARIA Authoring Practices) — el <li> es el elemento recomendado para role="option" cuando no se puede usar <select>/<option> nativo
								role="option"
								aria-selected={option.value === value}
								className={optionClass}
								onMouseEnter={() => setActiveIndex(index)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										selectOption(index);
									}
								}}
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
