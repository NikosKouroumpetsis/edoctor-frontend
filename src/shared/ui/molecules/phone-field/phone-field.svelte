<script lang="ts" module>
	import type { TextFieldSize } from '$shared/ui/molecules/text-field';

	// Padding-based geometry that matches the text-field family per size, so the
	// stacked country select and the number input share the exact same height.
	const TRIGGER_PAD: Record<TextFieldSize, string> = {
		sm: 'h-auto px-2 pt-3 pb-1 text-xs',
		default: 'h-auto px-2.5 pt-4 pb-1.5 text-sm',
		lg: 'h-auto px-2.5 pt-5 pb-2.5 text-base',
		xl: 'h-auto px-3.5 pt-6 pb-3 text-lg'
	};
</script>

<script lang="ts">
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$shared/ui/primitives/select';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { cn } from '$shared/lib/utils';
	import type { FieldApi } from '$shared/lib/form';

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
			class={cn('relative w-full items-center justify-between rounded-b-none', TRIGGER_PAD[size])}
			aria-label={countryLabel}
		>
			<span
				class="pointer-events-none absolute top-1.5 left-2.5 origin-[0] scale-90 text-xs text-muted-foreground"
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
