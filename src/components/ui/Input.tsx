import { type ComponentPropsWithoutRef, forwardRef, useState } from "react";

interface InputProps extends ComponentPropsWithoutRef<"input"> {
	label?: string;
}

const inputClass =
	"min-h-12 w-full rounded-md border border-surface-border bg-surface px-3.5 py-3 font-[inherit] text-surface-soft transition-[border-color,background-color] duration-180 ease-in-out hover:not-focus:not-disabled:border-surface-border active:not-focus:not-disabled:border-surface-border focus:border-surface-border focus:outline-none disabled:bg-surface-border disabled:text-text-placeholder";

const fieldWrapperClass = "relative block w-full";

const floatingLabelClass =
	"pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm leading-none text-text-placeholder transition-[top,transform,font-size,color] duration-160 ease-in-out";

const floatingLabelFloatedClass = "top-[0.66rem] translate-y-0 text-xs font-bold";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ className, label, value, defaultValue, onFocus, onBlur, ...props },
	ref,
) {
	const [isFocused, setIsFocused] = useState(false);

	if (!label) {
		return (
			<input
				{...props}
				value={value}
				defaultValue={defaultValue}
				ref={ref}
				onFocus={onFocus}
				onBlur={onBlur}
				className={`${inputClass}${className ? ` ${className}` : ""}`}
			/>
		);
	}

	const isFloated = isFocused || Boolean(value ?? defaultValue);

	return (
		<label className={fieldWrapperClass}>
			<span
				className={`${floatingLabelClass}${
					isFloated ? ` ${floatingLabelFloatedClass}` : ""
				}`}
			>
				{label}
			</span>

			<input
				{...props}
				value={value}
				defaultValue={defaultValue}
				ref={ref}
				onFocus={(event) => {
					setIsFocused(true);
					onFocus?.(event);
				}}
				onBlur={(event) => {
					setIsFocused(false);
					onBlur?.(event);
				}}
				className={`${inputClass} min-h-15 px-3.5 pb-2 pt-6${
					className ? ` ${className}` : ""
				}`}
			/>
		</label>
	);
});

Input.displayName = "Input";
