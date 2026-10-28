<script lang="ts" module>
	import type { TextFieldSize } from '$shared/ui/molecules/text-field';

	// The inline variant owns the border itself (see below), so its input is border/background-less and
	// takes only the shared field geometry; `CODE_PAD` is the side padding of the dial-code column.
	const CODE_PAD: Record<TextFieldSize, string> = {
		default: 'px-2.5',
		lg: 'px-3.5',
		xl: 'px-4'
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { SelectRoot, SelectTrigger } from '$shared/ui/primitives/select';
	import { cn } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { FloatingLabel } from '$shared/ui/primitives/floating-label';
	import { fieldSizes } from '$shared/ui/primitives/input';
	import { SelectOptions } from '$shared/ui/molecules/select';
	import {
		DEFAULT_PHONE_DIAL_CODE,
		PHONE_COUNTRIES,
		type PhoneValue
	} from '$shared/ui/molecules/phone-field/countries';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label,
		countryAccessibilityLabel,
		searchPlaceholder,
		numberPlaceholder = '',
		value = $bindable({ dialCode: DEFAULT_PHONE_DIAL_CODE, number: '' }),
		onChange,
		field,
		error,
		helperText,
		size = 'default',
		disabled = false,
		id,
		inputTestId,
		class: className
	}: {
		/** The floating label and the number's accessible name. */
		label: string;
		/** The country trigger's accessible name. */
		countryAccessibilityLabel: string;
		/** The country list's search field. */
		searchPlaceholder: string;
		/** Shown only while the number is focused. */
		numberPlaceholder?: string;
		/** The application's combined value `{ dialCode, number }`. */
		value?: PhoneValue;
		onChange?: (value: PhoneValue) => void;
		/** Connect the NUMBER to a `createForm` field; the dial code stays in `value`. */
		field?: FieldApi<string>;
		error?: string;
		helperText?: string;
		size?: TextFieldSize;
		disabled?: boolean;
		id?: string;
		inputTestId?: string;
		class?: string;
	} = $props();

	const inputId = useId(untrack(() => id) ?? undefined, 'phone-inline');
	const messageId = `${inputId}-message`;

	const dialCode = $derived(value.dialCode || DEFAULT_PHONE_DIAL_CODE);
	const currentNumber = $derived(field ? (field.value ?? '') : value.number);
	const currentError = $derived(field ? field.error : error);
	const hasMessage = $derived(Boolean(currentError || helperText));
	const countryOptions = PHONE_COUNTRIES.map((country) => ({
		label: country.value,
		subtitle: country.name,
		value: country.value,
		leading: country.flag
	}));

	// Placeholder is shown only while focused (an empty, unfocused field shows just the resting label).
	let placeholderText = $state(' ');
	let focused = $state(false);
	// The application's `floated = focused || hasValue` (R3-3); an autofilled number floats it by CSS.
	const floated = $derived(focused || currentNumber !== '');

	function commit(next: PhoneValue) {
		value = next;
		onChange?.(next);
	}

	function handleDialCode(next: string) {
		commit({ dialCode: next, number: currentNumber });
	}

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		// The application keeps digits and spaces only.
		const sanitized = input.value.replace(/[^\d\s]/g, '');
		if (sanitized !== input.value) input.value = sanitized;
		if (field) field.setValue(sanitized);
		commit({ dialCode, number: sanitized });
	}
</script>

<!--
	Inline / serial layout: one control owns the focus-within / invalid states, so the whole control
	highlights as one unit. Its border is an overlay drawn on top, so it adds no height: the field stays
	48 / 56 / 64 like the other field molecules. Inside: a muted dial-code trigger on the LEFT, a 1px
	divider, and the floating-label number on the RIGHT. The message sits OUTSIDE the box.
-->
<div class={cn('w-full pb-1', className)} data-slot="phone-field-inline">
	<div
		data-slot="phone-field-inline-control"
		class={cn(
			'group relative flex w-full flex-row items-stretch overflow-hidden rounded-md bg-card',
			currentError && 'bg-danger/10',
			disabled && 'pointer-events-none opacity-50'
		)}
	>
		<SelectRoot value={dialCode} {disabled} onValueChange={handleDialCode}>
			<SelectTrigger
				class={cn(
					'h-auto shrink-0 items-center justify-center gap-1 rounded-none border-transparent border-r-input bg-muted font-medium text-foreground focus-visible:border-transparent focus-visible:border-r-input focus-visible:ring-0',
					CODE_PAD[size]
				)}
				chevronSize="sm"
				aria-label={countryAccessibilityLabel}
			>
				<span class="truncate">{dialCode}</span>
			</SelectTrigger>
			<SelectOptions options={countryOptions} value={dialCode} {searchPlaceholder} />
		</SelectRoot>

		<div class="relative flex-1">
			<input
				id={inputId}
				type="tel"
				inputmode="tel"
				autocomplete="tel-national"
				{disabled}
				value={currentNumber}
				placeholder={placeholderText}
				aria-invalid={currentError ? 'true' : undefined}
				aria-describedby={hasMessage ? messageId : undefined}
				oninput={handleInput}
				onfocus={() => {
					focused = true;
					placeholderText = numberPlaceholder || ' ';
				}}
				onblur={() => {
					focused = false;
					placeholderText = ' ';
					field?.handleBlur();
				}}
				data-slot="phone-field-inline-input"
				data-testid={inputTestId}
				class={cn(
					'peer block w-full appearance-none bg-transparent pr-3 text-foreground outline-none',
					'placeholder:text-muted-foreground',
					'disabled:cursor-not-allowed disabled:opacity-50',
					fieldSizes[size].input,
					fieldSizes[size].start
				)}
			/>

			<!-- Not `insideBorder`: the box's border is an overlay, so the label's parent starts at its outer edge. -->
			<FloatingLabel
				for={inputId}
				data-slot="phone-field-inline-label"
				{label}
				{floated}
				{focused}
				error={Boolean(currentError)}
				{size}
			/>
		</div>

		<span
			aria-hidden="true"
			data-slot="phone-field-inline-border"
			class={cn(
				'pointer-events-none absolute inset-0 rounded-md border transition-colors',
				currentError ? 'border-danger' : 'border-input group-focus-within:border-ring'
			)}
		></span>
	</div>

	<FieldMessage id={messageId} error={currentError} {helperText} />
</div>
