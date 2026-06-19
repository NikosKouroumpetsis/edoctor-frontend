<script lang="ts">
	import {
		Select,
		SelectTrigger,
		SelectValue,
		SelectContent,
		SelectItem
	} from '$shared/ui/primitives/select';
	import { TextField } from '$shared/ui/molecules/text-field';
	import type { FieldApi } from '$shared/lib/form';

	const DIAL_CODES = [
		{ value: '+30', label: '🇬🇷 +30' },
		{ value: '+357', label: '🇨🇾 +357' },
		{ value: '+44', label: '🇬🇧 +44' },
		{ value: '+49', label: '🇩🇪 +49' },
		{ value: '+1', label: '🇺🇸 +1' }
	];

	let {
		label = 'Phone number',
		value = $bindable(''),
		dialCode = $bindable('+30'),
		field,
		error,
		disabled = false
	}: {
		label?: string;
		value?: string;
		dialCode?: string;
		field?: FieldApi<string>;
		error?: string;
		disabled?: boolean;
	} = $props();
</script>

<div class="flex w-full items-start gap-2" data-slot="phone-field">
	<Select bind:value={dialCode} {disabled}>
		<SelectTrigger class="h-14 w-28 shrink-0" aria-label="Country dial code">
			<SelectValue />
		</SelectTrigger>
		<SelectContent>
			{#each DIAL_CODES as code (code.value)}
				<SelectItem value={code.value}>{code.label}</SelectItem>
			{/each}
		</SelectContent>
	</Select>

	<TextField
		class="flex-1"
		{label}
		{field}
		bind:value
		{error}
		{disabled}
		type="tel"
		inputmode="tel"
		autocomplete="tel"
	/>
</div>
