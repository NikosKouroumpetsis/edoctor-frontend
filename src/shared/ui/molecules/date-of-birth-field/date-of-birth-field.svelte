<script lang="ts">
	import { untrack } from 'svelte';
	import { Input, type InputSize } from '$shared/ui/primitives/input';
	import AlertIcon from '~icons/lucide/circle-alert';
	import { m } from '$paraglide/messages.js';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label,
		value = $bindable(''),
		field,
		error,
		size = 'default',
		disabled = false
	}: {
		label?: string;
		/** ISO date string `YYYY-MM-DD`. */
		value?: string;
		field?: FieldApi<string>;
		error?: string;
		size?: InputSize;
		disabled?: boolean;
	} = $props();

	let day = $state('');
	let month = $state('');
	let year = $state('');
	let localError = $state('');

	let dayEl = $state<HTMLElement | null>(null);
	let monthEl = $state<HTMLElement | null>(null);
	let yearEl = $state<HTMLElement | null>(null);

	// The last value WE wrote to value/field, so the hydration effect can tell our
	// own writes apart from external ones.
	let lastEmitted = $state<string | null>(null);

	// Hydrate the segments only from EXTERNAL value changes (initial value, a
	// programmatic set, or a form reset). Everything inside `untrack` is excluded
	// from this effect's dependencies (the only dependency is `current`), so typing
	// — which writes `value` through `commit()` — never re-runs it and clobbers the
	// segments the user is editing.
	$effect(() => {
		const current = field ? (field.value ?? '') : value;
		untrack(() => {
			if (current === lastEmitted) return; // our own write — ignore
			lastEmitted = current;
			if (!current) {
				day = '';
				month = '';
				year = '';
				localError = '';
				return;
			}
			const [yy, mm, dd] = current.split('-');
			day = dd ? String(Number(dd)) : '';
			month = mm ? String(Number(mm)) : '';
			year = yy ?? '';
		});
	});

	const currentError = $derived((field ? field.error : error) || localError);

	const digits = (raw: string, max: number) => raw.replace(/\D/g, '').slice(0, max);

	function emit(next: string) {
		lastEmitted = next;
		if (field) field.setValue(next);
		else value = next;
	}

	function commit() {
		localError = '';
		// Incomplete: clear any previously emitted date so the form never keeps a
		// stale value, but leave the segments the user is still typing untouched.
		if (!day || !month || year.length < 4) {
			emit('');
			return;
		}
		const yNum = Number(year);
		const mNum = Number(month);
		const dNum = Number(day);
		const dt = new Date(Date.UTC(yNum, mNum - 1, dNum));
		const isReal =
			dt.getUTCFullYear() === yNum && dt.getUTCMonth() === mNum - 1 && dt.getUTCDate() === dNum;
		if (!isReal) {
			localError = m.dob_error_invalid();
			emit('');
			return;
		}
		if (dt.getTime() > Date.now()) {
			localError = m.dob_error_future();
			emit('');
			return;
		}
		emit(
			`${String(yNum).padStart(4, '0')}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
		);
	}

	// `bind:value` updates the field state before these run; we then strip any
	// non-digits in place (reassigning the bound state reconciles the DOM, even
	// when the sanitized result still differs from what was just typed).
	function onDay() {
		day = digits(day, 2);
		commit();
		if (day.length === 2 && Number(day) >= 1 && Number(day) <= 31) monthEl?.focus();
	}

	function onMonth() {
		month = digits(month, 2);
		commit();
		if (month.length === 2 && Number(month) >= 1 && Number(month) <= 12) yearEl?.focus();
	}

	function onYear() {
		year = digits(year, 4);
		commit();
	}

	function onBlur() {
		field?.handleBlur();
	}

	// Backspace on an already-empty segment moves focus back to the previous one
	// (segmented-input convention), complementing the forward auto-advance.
	function onSegmentKeydown(
		event: KeyboardEvent,
		currentValue: string,
		previous: HTMLElement | null
	) {
		if (event.key === 'Backspace' && currentValue === '' && previous) {
			event.preventDefault();
			previous.focus();
		}
	}
</script>

<fieldset class="w-full" data-slot="date-of-birth-field" {disabled}>
	<legend class="mb-1.5 text-label-lg text-muted-foreground">{label ?? m.dob_label()}</legend>
	<div class="flex items-start gap-2">
		<Input
			bind:ref={dayEl}
			{size}
			{disabled}
			bind:value={day}
			oninput={onDay}
			onblur={onBlur}
			inputmode="numeric"
			maxlength={2}
			placeholder={m.dob_day_placeholder()}
			aria-label={m.dob_day()}
			aria-invalid={currentError ? 'true' : undefined}
			class="w-16 text-center"
		/>
		<Input
			bind:ref={monthEl}
			{size}
			{disabled}
			bind:value={month}
			oninput={onMonth}
			onblur={onBlur}
			onkeydown={(e) => onSegmentKeydown(e, month, dayEl)}
			inputmode="numeric"
			maxlength={2}
			placeholder={m.dob_month_placeholder()}
			aria-label={m.dob_month()}
			aria-invalid={currentError ? 'true' : undefined}
			class="w-16 text-center"
		/>
		<Input
			bind:ref={yearEl}
			{size}
			{disabled}
			bind:value={year}
			oninput={onYear}
			onblur={onBlur}
			onkeydown={(e) => onSegmentKeydown(e, year, monthEl)}
			inputmode="numeric"
			maxlength={4}
			placeholder={m.dob_year_placeholder()}
			aria-label={m.dob_year()}
			aria-invalid={currentError ? 'true' : undefined}
			class="w-20 text-center"
		/>
	</div>

	{#if currentError}
		<p
			data-slot="date-of-birth-field-error"
			class="mt-1 flex items-center gap-1 text-body-sm text-destructive"
		>
			<AlertIcon class="size-4 shrink-0" />
			{currentError}
		</p>
	{/if}
</fieldset>
