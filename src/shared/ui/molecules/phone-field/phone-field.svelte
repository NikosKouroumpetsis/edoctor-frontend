<script lang="ts">
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$shared/ui/primitives/select';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { cn } from '$shared/lib/utils';
	import type { FieldApi } from '$shared/lib/form';
	import { fieldSizes } from '$shared/ui/primitives/input';
	import type { TextFieldSize } from '$shared/ui/molecules/text-field';

	const DIAL_CODES = [
		{ value: '+30', label: '🇬🇷 Ελλάδα +30' },
		{ value: '+357', label: '🇨🇾 Κύπρος +357' },
		{ value: '+44', label: '🇬🇧 United Kingdom +44' },
		{ value: '+49', label: '🇩🇪 Deutschland +49' },
		{ value: '+1', label: '🇺🇸 United States +1' }
	];

	let {
		label = 'Phone number',
		countryLabel = 'Country',
		value = $bindable(''),
		dialCode = $bindable('+30'),
		field,
		error,
		size = 'default',
		placeholder = '',
		disabled = false
	}: {
		label?: string;
		countryLabel?: string;
		value?: string;
		dialCode?: string;
		field?: FieldApi<string>;
		error?: string;
		size?: TextFieldSize;
		placeholder?: string;
		disabled?: boolean;
	} = $props();

	// Resolve the displayed country directly from the data (so a preset dial code
	// shows its full label immediately, without waiting for the dropdown to open).
	const country = $derived(DIAL_CODES.find((c) => c.value === dialCode));
</script>

<!--
	Stacked / joined layout (1:1 with the old Vue PhoneNumber): country select on
	top (rounded-t, floating label, shared divider border) and the phone number
	input below (rounded-b, floating label) — same padding so both rows are equal
	height and read as one connected control.
-->
<div class="w-full" data-slot="phone-field">
	<Select bind:value={dialCode} {disabled}>
		<SelectTrigger
			class={cn(
				'relative h-auto w-full items-center justify-between rounded-b-none',
				fieldSizes[size].input,
				fieldSizes[size].start,
				fieldSizes[size].end
			)}
			aria-label={countryLabel}
		>
			<span
				class="pointer-events-none absolute top-1.5 left-2.5 text-label-md font-normal text-muted-foreground"
			>
				{countryLabel}
			</span>
			<span class="truncate">{country?.label ?? ''}</span>
		</SelectTrigger>
		<SelectContent>
			{#each DIAL_CODES as code (code.value)}
				<SelectItem value={code.value}>{code.label}</SelectItem>
			{/each}
		</SelectContent>
	</Select>

	<TextField
		{label}
		{field}
		bind:value
		{error}
		{size}
		{placeholder}
		{disabled}
		type="tel"
		inputmode="tel"
		autocomplete="tel"
		inputClass="rounded-t-none border-t-0"
	/>
</div>
