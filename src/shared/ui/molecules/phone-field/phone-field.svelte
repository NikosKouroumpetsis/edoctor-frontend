<script lang="ts">
	import { SelectRoot, SelectTrigger } from '$shared/ui/primitives/select';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { SelectOptions } from '$shared/ui/molecules/select';
	import { cn } from '$shared/lib/utils';
	import type { FieldApi } from '$shared/lib/form';
	import { fieldSizes } from '$shared/ui/primitives/input';
	import type { TextFieldSize } from '$shared/ui/molecules/text-field';
	import { DEFAULT_PHONE_DIAL_CODE, PHONE_COUNTRIES, type PhoneValue } from './countries';

	let {
		label,
		countryLabel,
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
		class: className
	}: {
		/** The number's floating label. */
		label: string;
		/** The visible mini caption above the country. */
		countryLabel: string;
		/** The country trigger's accessible name. */
		countryAccessibilityLabel: string;
		/** The country list's search field. */
		searchPlaceholder: string;
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
		class?: string;
	} = $props();

	const dialCode = $derived(value.dialCode || DEFAULT_PHONE_DIAL_CODE);
	const currentNumber = $derived(field ? (field.value ?? '') : value.number);
	// The invalid state tints both halves (the application's): the form field's error, else the prop.
	const currentError = $derived(field ? field.error : error);
	const country = $derived(PHONE_COUNTRIES.find((entry) => entry.value === dialCode));
	const countryOptions = PHONE_COUNTRIES.map((entry) => ({
		label: entry.label,
		value: entry.value
	}));

	function commit(next: PhoneValue) {
		value = next;
		onChange?.(next);
	}
</script>

<!--
	Stacked / joined layout (the application's `PhoneField`, ported from this one): the country trigger on
	top (rounded top, a mini caption, the full country label) and the floating-label number below (square
	top, no top border), so both rows read as one control; the message renders once, below the number.
-->
<div class={cn('w-full', className)} data-slot="phone-field">
	<SelectRoot
		value={dialCode}
		{disabled}
		onValueChange={(next) => commit({ dialCode: next, number: currentNumber })}
	>
		<SelectTrigger
			class={cn(
				'relative h-auto w-full items-center justify-between rounded-b-none',
				fieldSizes[size].input,
				fieldSizes[size].start,
				fieldSizes[size].end,
				currentError && 'border-danger bg-danger/10'
			)}
			aria-label={countryAccessibilityLabel}
		>
			<span
				class="pointer-events-none absolute top-1.5 left-2.5 text-label-md font-normal text-muted-foreground"
			>
				{countryLabel}
			</span>
			<span class="truncate">{country?.label ?? ''}</span>
		</SelectTrigger>
		<SelectOptions options={countryOptions} value={dialCode} {searchPlaceholder} />
	</SelectRoot>

	<TextField
		{label}
		{field}
		value={currentNumber}
		onChangeText={(next) => commit({ dialCode, number: next })}
		{error}
		{helperText}
		{size}
		placeholder={numberPlaceholder}
		{disabled}
		type="tel"
		inputmode="tel"
		autocomplete="tel-national"
		inputClass="rounded-t-none border-t-0"
	/>
</div>
