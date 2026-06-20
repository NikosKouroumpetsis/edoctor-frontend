<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type OtpSlotState = {
		char: string | undefined;
		isActive: boolean;
		hasFakeCaret: boolean;
	};

	export type InputOtpContext = {
		readonly maxlength: number;
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
		class: className,
		containerClass,
		onComplete,
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
	class={cn('relative flex items-center gap-2', disabled && 'opacity-50', containerClass)}
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
		aria-label="One-time passcode"
		data-slot="input-otp-input"
		class={cn(
			'absolute inset-0 size-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed',
			className
		)}
		{...restProps}
	/>
</div>
