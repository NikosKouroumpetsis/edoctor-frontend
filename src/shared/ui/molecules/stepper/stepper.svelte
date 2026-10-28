<script lang="ts" module>
	// «−» and «+»: 48 × 48 targets, dimmed at their bound like the application's.
	const stepperButton =
		'inline-flex size-touch shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

	/** `next` held inside the optional `min`/`max` bounds. */
	function clamp(next: number, min?: number, max?: number): number {
		const floor = min == null ? next : Math.max(min, next);
		return max == null ? floor : Math.min(max, floor);
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import type { FieldApi } from '$shared/lib/form';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { FieldMessage } from '$shared/ui/primitives/field-message';

	let {
		label,
		value = $bindable(''),
		field,
		error,
		helperText,
		id,
		name,
		min,
		max,
		step = 1,
		disabled = false,
		decreaseLabel,
		increaseLabel,
		emptyValueLabel,
		class: className
	}: {
		/** The whole title, above the box (never truncated). */
		label: string;
		/** The number as typed: a string, passed through as is so the form validates it. */
		value?: string;
		/** Connect to a `createForm` field; takes precedence over bind:value. */
		field?: FieldApi<string>;
		/** Standalone error message (ignored when `field` is provided). */
		error?: string;
		/** The explanation under the box, replaced by the error while there is one. */
		helperText?: string;
		id?: string;
		name?: string;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		/** Names of «−» / «+» and the spoken blank value, already localized by the caller (U-03.5). */
		decreaseLabel: string;
		increaseLabel: string;
		emptyValueLabel: string;
		class?: string;
	} = $props();

	// Generated once; `id` is treated as a static prop on mount.
	const inputId = useId(untrack(() => id) ?? undefined, 'stepper');
	const messageId = `${inputId}-message`;

	const current = $derived(field ? (field.value ?? '') : value);
	const currentError = $derived(field ? field.error : error);
	const isBlank = $derived(current.trim() === '');
	const parsed = $derived(Number(current));
	const amount = $derived(Number.isFinite(parsed) ? parsed : 0);
	const canDecrease = $derived(!disabled && (min == null || amount > min));
	const canIncrease = $derived(!disabled && (max == null || amount < max));
	const hasMessage = $derived(Boolean(currentError || helperText));

	function setCurrent(next: string) {
		if (field) field.setValue(next);
		else value = next;
	}

	/**
	 * 🔴 S-26.4: «−» / «+» and ArrowDown / ArrowUp move the number by `step` inside `min`/`max`; at a bound the
	 * matching control is off. A blank or non-numeric value counts as 0 for the step, as in the application.
	 */
	function nudge(direction: 1 | -1) {
		if (direction === 1 ? !canIncrease : !canDecrease) return;
		setCurrent(String(clamp(amount + direction * step, min, max)));
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
		event.preventDefault();
		nudge(event.key === 'ArrowUp' ? 1 : -1);
	}

	function handleInput(event: Event) {
		setCurrent((event.currentTarget as HTMLInputElement).value);
	}
</script>

<!-- 🔴 S-26.4: the whole title above a 56 box: «−» left, the number centred (typed too), «+» right, both 48 × 48.
     The input is the one spinbutton a screen reader meets; it says the number as shown, «Κενό» when blank, never «0». -->
<div class={cn('flex w-full flex-col gap-1.5', className)} data-slot="stepper">
	<label
		for={inputId}
		data-slot="stepper-label"
		class={cn('text-label-lg font-medium text-foreground', disabled && 'opacity-50')}
	>
		{label}
	</label>

	<div
		data-slot="stepper-box"
		class={cn(
			'flex min-h-control-lg items-center rounded-md border bg-card px-1',
			currentError ? 'border-danger' : 'border-input focus-within:border-ring',
			disabled && 'opacity-50'
		)}
	>
		<button
			type="button"
			aria-label={decreaseLabel}
			tabindex={-1}
			disabled={!canDecrease}
			onclick={() => nudge(-1)}
			data-slot="stepper-decrease"
			class={stepperButton}
		>
			<Ionicon name="remove" class="icon-md text-foreground" />
		</button>

		<input
			id={inputId}
			{name}
			{disabled}
			type="text"
			inputmode="numeric"
			role="spinbutton"
			value={current}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={isBlank || !Number.isFinite(parsed) ? undefined : parsed}
			aria-valuetext={isBlank ? emptyValueLabel : current}
			aria-invalid={currentError ? 'true' : undefined}
			aria-describedby={hasMessage ? messageId : undefined}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={() => field?.handleBlur()}
			data-slot="stepper-input"
			class="min-h-touch min-w-touch flex-1 self-stretch bg-transparent text-center text-body-lg text-foreground outline-none disabled:cursor-not-allowed"
		/>

		<button
			type="button"
			aria-label={increaseLabel}
			tabindex={-1}
			disabled={!canIncrease}
			onclick={() => nudge(1)}
			data-slot="stepper-increase"
			class={stepperButton}
		>
			<Ionicon name="add" class="icon-md text-foreground" />
		</button>
	</div>

	<FieldMessage id={messageId} error={currentError} {helperText} />
</div>
