<script lang="ts" module>
	// «−» and «+»: 48 × 48 targets, dimmed at their bound like the application's.
	// U-28.4: «−» / «+» take the light fill on hover with a pointer, never at their bound (disabled); `hover={false}`
	// (U-100: a caller with no hover) never.
	const stepperButton =
		'inline-flex size-touch shrink-0 items-center justify-center rounded-md transition-colors duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';
	const stepperButtonHover = 'can-hover:enabled:hover:bg-foreground/5';
	// `counter`: the same 48 target, its face a 36 circle on a muted line (6 inside each edge), a third at its bound.
	const counterButton = 'relative rounded-full disabled:opacity-30';

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
		valueLabel,
		hover = true,
		variant = 'default',
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
		/**
		 * The value in words instead of the number (a floor: «Ισόγειο», «3ος»), the caller's, already localized: the box
		 * shows them, a screen reader hears them, and the number is moved only by «−» / «+» and the arrows — no typing
		 * (the application's `valueLabel`, P-A3 Σ14). A blank value counts as 0, as for the step.
		 */
		valueLabel?: (value: number) => string;
		/** U-28.4 (`true`, the default): «−» / «+» take the light fill under the pointer; `false` (U-100) never. */
		hover?: boolean;
		/**
		 * `default` (S-26.4): the title above a 56 box, «−» and «+» bare at its ends, the number in between. `counter`
		 * (Airbnb's counters): ONE 64 box, the title inside on the left, «−» value «+» on the right in 36 circles.
		 */
		variant?: 'default' | 'counter';
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
	const words = $derived(valueLabel ? valueLabel(amount) : null);
	const counter = $derived(variant === 'counter');

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
		if (valueLabel) return;
		setCurrent((event.currentTarget as HTMLInputElement).value);
	}
</script>

<!-- 🔴 S-26.4: the whole title above a 56 box: «−» left, the number centred (typed too), «+» right, both 48 × 48.
     The input is the one spinbutton a screen reader meets; it says the number as shown, «Κενό» when blank, never «0».
     With `valueLabel` it shows and says the words instead, read-only («Ισόγειο», «3ος»). `counter` (W8-Δ4): the same
     controls in one 64 box, its border inside the 64 (W8 Delta 3: 48 + 6 + 6 + 1 + 1 = 62 under it), the title inside
     on the left (16), «−» value «+» on the right — circles of 36 on a muted line inside their 48 targets, the value
     16/500 at least 64 wide, so the circles keep their place; a value too long for the box (typed, without
     `valueLabel`) shrinks the title, then itself down to 64, never past the box. -->
<div
	class={cn('flex w-full flex-col gap-1.5', className)}
	data-slot="stepper"
	data-variant={variant}
>
	{#if !counter}
		<label
			for={inputId}
			data-slot="stepper-label"
			class={cn('text-label-lg font-medium text-foreground', disabled && 'opacity-50')}
		>
			{label}
		</label>
	{/if}

	<div
		data-slot="stepper-box"
		class={cn(
			'flex items-center rounded-md border bg-card',
			counter ? 'min-h-control-xl gap-3 py-1.5 pr-1 pl-3.5' : 'min-h-control-lg px-1',
			currentError ? 'border-danger' : 'border-input focus-within:border-ring',
			disabled && 'opacity-50'
		)}
	>
		{#if counter}
			<label
				for={inputId}
				data-slot="stepper-label"
				class="min-w-0 flex-1 text-body-lg text-foreground"
			>
				{label}
			</label>
			<div data-slot="stepper-controls" class="flex min-w-0 flex-row items-center gap-2">
				{@render controls()}
			</div>
		{:else}
			{@render controls()}
		{/if}
	</div>

	<FieldMessage id={messageId} error={currentError} {helperText} />
</div>

{#snippet controls()}
	<button
		type="button"
		aria-label={decreaseLabel}
		tabindex={-1}
		disabled={!canDecrease}
		onclick={() => nudge(-1)}
		data-slot="stepper-decrease"
		class={cn(stepperButton, counter && counterButton, hover && stepperButtonHover)}
	>
		{@render face('remove')}
	</button>

	<input
		id={inputId}
		{name}
		{disabled}
		type="text"
		inputmode="numeric"
		readonly={words !== null}
		role="spinbutton"
		value={words ?? current}
		size={counter ? Math.max((words ?? current).length, 1) : undefined}
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuenow={words !== null
			? amount
			: isBlank || !Number.isFinite(parsed)
				? undefined
				: parsed}
		aria-valuetext={words ?? (isBlank ? emptyValueLabel : current)}
		aria-invalid={currentError ? 'true' : undefined}
		aria-describedby={hasMessage ? messageId : undefined}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onblur={() => field?.handleBlur()}
		data-slot="stepper-input"
		class={counter
			? 'field-sizing-content min-h-touch min-w-control-xl bg-transparent text-center text-body-lg font-medium text-foreground outline-none disabled:cursor-not-allowed'
			: 'min-h-touch min-w-touch flex-1 self-stretch bg-transparent text-center text-body-lg text-foreground outline-none disabled:cursor-not-allowed'}
	/>

	<button
		type="button"
		aria-label={increaseLabel}
		tabindex={-1}
		disabled={!canIncrease}
		onclick={() => nudge(1)}
		data-slot="stepper-increase"
		class={cn(stepperButton, counter && counterButton, hover && stepperButtonHover)}
	>
		{@render face('add')}
	</button>
{/snippet}

{#snippet face(glyph: 'remove' | 'add')}
	{#if counter}
		<span
			aria-hidden="true"
			data-slot="stepper-round"
			class="absolute inset-1.5 rounded-full border border-muted-foreground"
		></span>
		<Ionicon name={glyph} class="icon-sm text-foreground" />
	{:else}
		<Ionicon name={glyph} class="icon-md text-foreground" />
	{/if}
{/snippet}
