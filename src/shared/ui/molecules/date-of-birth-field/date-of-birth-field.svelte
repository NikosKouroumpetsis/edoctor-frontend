<script lang="ts" module>
	import type { FieldSize } from '$shared/ui/primitives/floating-label';

	/**
	 * `segments`: day / month / year boxes (the default). `single`: ONE date field, the floating label on top and the
	 * browser's own date control with its calendar (U-129: the sign-up's and the booking's prototypes, `type="date"`).
	 */
	export type DateOfBirthFieldVariant = 'segments' | 'single';

	/** Each segment's box per field size (R3-11): the family's 48 / 56 / 64 with its side padding. */
	const segmentBoxes: Record<FieldSize, string> = {
		default: 'min-h-control-md px-2.5',
		lg: 'min-h-control-lg px-3',
		xl: 'min-h-control-xl px-3.5'
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { FloatingLabel } from '$shared/ui/primitives/floating-label';
	import { fieldSizes, Input } from '$shared/ui/primitives/input';
	import AlertIcon from '~icons/lucide/circle-alert';
	import { m } from '$paraglide/messages.js';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label,
		value = $bindable(''),
		field,
		error,
		helperText,
		size = 'default',
		disabled = false,
		allowFuture = false,
		typed = $bindable(false),
		variant = 'segments'
	}: {
		label?: string;
		/** ISO date string `YYYY-MM-DD`. */
		value?: string;
		field?: FieldApi<string>;
		error?: string;
		/** The muted line under the boxes while there is no error (the application's port). */
		helperText?: string;
		/** The field family's size (`default | lg | xl`), as the other fields. */
		size?: FieldSize;
		disabled?: boolean;
		/**
		 * A date that may lie ahead (a policy's expiry, P-W3 Σ-8): the future is accepted. By default it is refused, as
		 * a birth date is (`date_of_birth_field_error_future`).
		 */
		allowFuture?: boolean;
		/**
		 * Whether anything is typed in the boxes (bound by the caller): an empty `value` with `typed` is a date left half
		 * or wrong, never «no date» (review w3-w3 R1 MINOR-4).
		 */
		typed?: boolean;
		/** The boxes (default) or one date field (`single`), each screen as its own prototype draws it. */
		variant?: DateOfBirthFieldVariant;
	} = $props();

	let day = $state('');
	let month = $state('');
	let year = $state('');
	let localError = $state('');

	// `single`: the date as the browser's control holds it; set from outside only (a typed day stays where it is).
	let iso = $state('');
	let dateEl = $state<HTMLInputElement | null>(null);
	let focused = $state(false);
	const inputId = useId(undefined, 'date');
	const messageId = `${inputId}-message`;

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
			iso = current;
			if (dateEl && dateEl.value !== current) dateEl.value = current;
			if (!current) {
				day = '';
				month = '';
				year = '';
				localError = '';
				markTyped(false);
				return;
			}
			const [yy, mm, dd] = current.split('-');
			day = dd ? String(Number(dd)) : '';
			month = mm ? String(Number(mm)) : '';
			year = yy ?? '';
			markTyped(true);
		});
	});

	const currentError = $derived((field ? field.error : error) || localError);

	const digits = (raw: string, max: number) => raw.replace(/\D/g, '').slice(0, max);

	/** Tells the caller whether anything is typed in the boxes, only when that changed. */
	function markTyped(next: boolean) {
		if (typed !== next) typed = next;
	}

	function emit(next: string) {
		lastEmitted = next;
		if (field) field.setValue(next);
		else value = next;
	}

	function commit() {
		localError = '';
		markTyped(Boolean(day || month || year));
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
			localError = m.date_of_birth_field_error_invalid();
			emit('');
			return;
		}
		if (!allowFuture && dt.getTime() > Date.now()) {
			localError = m.date_of_birth_field_error_future();
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

	/**
	 * `single`: the control gives `YYYY-MM-DD` or nothing. Nothing with something in it (`badInput`: a day left half or
	 * impossible) is «typed», as half-filled boxes are; a day ahead is refused unless `allowFuture`, as `commit` does.
	 */
	function onDateInput(event: Event & { currentTarget: HTMLInputElement }) {
		const next = event.currentTarget.value;
		localError = '';
		markTyped(next !== '' || event.currentTarget.validity.badInput);
		if (!next) {
			emit('');
			return;
		}
		if (!allowFuture && Date.parse(next) > Date.now()) {
			localError = m.date_of_birth_field_error_future();
			emit('');
			return;
		}
		emit(next);
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

{#if variant === 'single'}
	<div class="relative w-full" data-slot="date-of-birth-field" data-variant="single">
		<div class="relative">
			<!-- The text field's own box (`TextField`), the label always up: the control shows its «ηη/μμ/εεεε» when empty. -->
			<input
				bind:this={dateEl}
				id={inputId}
				type="date"
				value={iso}
				{disabled}
				aria-invalid={currentError ? 'true' : undefined}
				aria-describedby={currentError || helperText ? messageId : undefined}
				oninput={onDateInput}
				onfocus={() => (focused = true)}
				onblur={() => {
					focused = false;
					onBlur();
				}}
				data-slot="date-of-birth-field-input"
				class={cn(
					'peer block w-full appearance-none rounded-md border border-input bg-card pr-3 text-foreground transition-[color,box-shadow] outline-none',
					'focus:border-ring',
					'disabled:cursor-not-allowed disabled:opacity-50',
					'aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger/10',
					fieldSizes[size].input,
					fieldSizes[size].start
				)}
			/>
			<FloatingLabel
				for={inputId}
				data-slot="date-of-birth-field-label"
				label={label ?? m.date_of_birth_field_label()}
				floated
				{focused}
				error={Boolean(currentError)}
				{size}
			/>
		</div>
		{#if currentError}
			<p
				id={messageId}
				data-slot="date-of-birth-field-error"
				class="mt-1 flex items-center gap-1 text-body-sm text-danger-text"
			>
				<AlertIcon class="size-4 shrink-0" />
				{currentError}
			</p>
		{:else if helperText}
			<p
				id={messageId}
				data-slot="date-of-birth-field-helper"
				class="mt-1 text-body-sm text-muted-foreground"
			>
				{helperText}
			</p>
		{/if}
	</div>
{:else}
	<fieldset class="w-full" data-slot="date-of-birth-field" {disabled}>
		<legend class="mb-1.5 text-label-lg text-muted-foreground"
			>{label ?? m.date_of_birth_field_label()}</legend
		>
		<div class="grid max-w-narrow grid-cols-4 items-start gap-touch-gap">
			<Input
				bind:ref={dayEl}
				{disabled}
				bind:value={day}
				oninput={onDay}
				onblur={onBlur}
				inputmode="numeric"
				maxlength={2}
				placeholder={m.date_of_birth_field_day_placeholder()}
				aria-label={m.date_of_birth_field_day()}
				aria-invalid={currentError ? 'true' : undefined}
				class={cn(segmentBoxes[size], 'text-center')}
			/>
			<Input
				bind:ref={monthEl}
				{disabled}
				bind:value={month}
				oninput={onMonth}
				onblur={onBlur}
				onkeydown={(e) => onSegmentKeydown(e, month, dayEl)}
				inputmode="numeric"
				maxlength={2}
				placeholder={m.date_of_birth_field_month_placeholder()}
				aria-label={m.date_of_birth_field_month()}
				aria-invalid={currentError ? 'true' : undefined}
				class={cn(segmentBoxes[size], 'text-center')}
			/>
			<Input
				bind:ref={yearEl}
				{disabled}
				bind:value={year}
				oninput={onYear}
				onblur={onBlur}
				onkeydown={(e) => onSegmentKeydown(e, year, monthEl)}
				inputmode="numeric"
				maxlength={4}
				placeholder={m.date_of_birth_field_year_placeholder()}
				aria-label={m.date_of_birth_field_year()}
				aria-invalid={currentError ? 'true' : undefined}
				class={cn(segmentBoxes[size], 'col-span-2 text-center')}
			/>
		</div>

		{#if currentError}
			<p
				data-slot="date-of-birth-field-error"
				class="mt-1 flex items-center gap-1 text-body-sm text-danger-text"
			>
				<AlertIcon class="size-4 shrink-0" />
				{currentError}
			</p>
		{:else if helperText}
			<p data-slot="date-of-birth-field-helper" class="mt-1 text-body-sm text-muted-foreground">
				{helperText}
			</p>
		{/if}
	</fieldset>
{/if}
