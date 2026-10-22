<script lang="ts" module>
	/** `next` held inside the optional `min`/`max` bounds. */
	function clamp(next: number, min?: number, max?: number): number {
		const floor = min == null ? next : Math.max(min, next);
		return max == null ? floor : Math.min(max, floor);
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import AlertIcon from '~icons/lucide/circle-alert';
	import MinusIcon from '~icons/lucide/minus';
	import PlusIcon from '~icons/lucide/plus';
	import { m } from '$paraglide/messages.js';
	import type { FieldApi } from '$shared/lib/form';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { Button } from '$shared/ui/primitives/button';

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
		/** Names of «−» / «+» and the spoken blank value; default to the page locale's messages. */
		decreaseLabel?: string;
		increaseLabel?: string;
		emptyValueLabel?: string;
		class?: string;
	} = $props();

	// Generated once; `id` is treated as a static prop on mount.
	const inputId = useId(untrack(() => id) ?? undefined, 'stepper');
	const messageId = `${inputId}-message`;

	const messageOptions = $derived({ locale: getPageLocale(page.url) });
	const decreaseText = $derived(decreaseLabel ?? m.stepper_decrease({}, messageOptions));
	const increaseText = $derived(increaseLabel ?? m.stepper_increase({}, messageOptions));
	const emptyText = $derived(emptyValueLabel ?? m.stepper_empty({}, messageOptions));

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
		class={cn('text-label-lg text-foreground', disabled && 'opacity-50')}
	>
		{label}
	</label>

	<div
		data-slot="stepper-box"
		class={cn(
			'flex min-h-control-lg items-center rounded-md border bg-card px-1',
			currentError ? 'border-destructive' : 'border-input focus-within:border-ring',
			disabled && 'opacity-50'
		)}
	>
		<Button
			variant="ghost"
			size="icon"
			aria-label={decreaseText}
			tabindex={-1}
			disabled={!canDecrease}
			onclick={() => nudge(-1)}
		>
			<MinusIcon class="size-5" />
		</Button>

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
			aria-valuetext={isBlank ? emptyText : current}
			aria-invalid={currentError ? 'true' : undefined}
			aria-describedby={hasMessage ? messageId : undefined}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={() => field?.handleBlur()}
			data-slot="stepper-input"
			class="min-h-touch min-w-touch flex-1 self-stretch bg-transparent text-center text-body-lg text-foreground outline-none disabled:cursor-not-allowed"
		/>

		<Button
			variant="ghost"
			size="icon"
			aria-label={increaseText}
			tabindex={-1}
			disabled={!canIncrease}
			onclick={() => nudge(1)}
		>
			<PlusIcon class="size-5" />
		</Button>
	</div>

	{#if currentError}
		<p
			id={messageId}
			data-slot="stepper-error"
			class="mt-1 flex items-center gap-1 text-body-sm text-destructive"
		>
			<AlertIcon class="size-4 shrink-0" />
			{currentError}
		</p>
	{:else if helperText}
		<p id={messageId} data-slot="stepper-helper" class="mt-1 text-body-sm text-muted-foreground">
			{helperText}
		</p>
	{/if}
</div>
