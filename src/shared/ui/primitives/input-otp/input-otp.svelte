<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type OtpSlotState = {
		char: string | undefined;
		isActive: boolean;
		hasFakeCaret: boolean;
	};

	/** The application's `InputOtp` sizes (U-07.1): the row's resting height, inset and digits. */
	export type InputOtpSize = 'sm' | 'md' | 'lg';

	export const inputOtpSizes: Record<InputOtpSize, { container: string; digit: string }> = {
		sm: { container: 'min-h-control-md px-3', digit: 'text-title-sm' },
		md: { container: 'min-h-control-lg px-4', digit: 'text-title-sm' },
		lg: { container: 'min-h-control-xl px-5', digit: 'text-title-md' }
	};

	export type InputOtpContext = {
		readonly maxlength: number;
		readonly size: InputOtpSize;
		getSlot: (index: number) => OtpSlotState;
	};

	export const [getInputOtpContext, setInputOtpContext] =
		createContext<InputOtpContext>('InputOTP');

	/** Per-character allowed patterns, mirroring shadcn's exported constants. */
	export const REGEXP_ONLY_DIGITS = /[0-9]/;
	export const REGEXP_ONLY_CHARS = /[a-zA-Z]/;
	export const REGEXP_ONLY_DIGITS_AND_CHARS = /[a-zA-Z0-9]/;
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		value = $bindable(''),
		maxlength = 6,
		pattern = REGEXP_ONLY_DIGITS,
		inputmode = 'numeric',
		disabled = false,
		size = 'md',
		invalid = false,
		class: className,
		containerClass,
		onComplete,
		label,
		children,
		...restProps
	}: WithElementRef<
		Omit<HTMLInputAttributes, 'maxlength' | 'pattern' | 'value' | 'size'>,
		HTMLInputElement
	> & {
		value?: string;
		maxlength?: number;
		pattern?: RegExp;
		/** Extra classes for the wrapper that lays out the slots. */
		containerClass?: string;
		onComplete?: (value: string) => void;
		/** The code field's accessible name, already localized by the caller. */
		label: string;
		size?: InputOtpSize;
		/** The error look (the application's): the danger border and `aria-invalid`. */
		invalid?: boolean;
		children?: Snippet;
	} = $props();

	let isFocused = $state(false);
	let selStart = $state(0);
	let selEnd = $state(0);

	function syncSelection() {
		if (!ref) return;
		selStart = ref.selectionStart ?? value.length;
		selEnd = ref.selectionEnd ?? selStart;
	}

	function oninput(event: Event & { currentTarget: HTMLInputElement }) {
		const el = event.currentTarget;
		const sanitized = Array.from(el.value)
			.filter((ch) => pattern.test(ch))
			.join('')
			.slice(0, maxlength);

		value = sanitized;
		// Keep the real input in sync without an extra reactive round-trip.
		if (el.value !== sanitized) {
			el.value = sanitized;
			el.setSelectionRange(sanitized.length, sanitized.length);
		}
		syncSelection();
		if (sanitized.length === maxlength) onComplete?.(sanitized);
	}

	function onfocus() {
		isFocused = true;
		syncSelection();
	}
	function onblur() {
		isFocused = false;
	}

	// The collapsed caret highlights the slot it sits in; once full it parks on
	// the last slot rather than an out-of-range index.
	const caretSlot = $derived(Math.min(selStart, maxlength - 1));

	setInputOtpContext({
		get maxlength() {
			return maxlength;
		},
		get size() {
			return size;
		},
		getSlot(index) {
			const char = value[index];
			const collapsed = selStart === selEnd;
			const isActive =
				isFocused && (collapsed ? index === caretSlot : index >= selStart && index < selEnd);
			return {
				char,
				isActive,
				hasFakeCaret: isActive && collapsed && char === undefined
			};
		}
	});
</script>

<div
	data-slot="input-otp"
	data-disabled={disabled ? '' : undefined}
	data-size={size}
	class={cn(
		'relative flex w-full items-stretch rounded-md border border-input bg-card transition-[color,box-shadow]',
		inputOtpSizes[size].container,
		invalid ? 'border-danger' : isFocused && 'border-ring',
		disabled && 'opacity-50',
		containerClass
	)}
>
	{@render children?.()}
	<input
		bind:this={ref}
		{value}
		{maxlength}
		{inputmode}
		{disabled}
		{oninput}
		{onfocus}
		{onblur}
		onkeyup={syncSelection}
		onpointerup={syncSelection}
		onselect={syncSelection}
		autocomplete="one-time-code"
		autocapitalize="none"
		spellcheck="false"
		aria-label={label}
		aria-invalid={invalid ? 'true' : undefined}
		data-slot="input-otp-input"
		class={cn(
			'absolute inset-0 size-full min-h-touch cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed',
			className
		)}
		{...restProps}
	/>
</div>
