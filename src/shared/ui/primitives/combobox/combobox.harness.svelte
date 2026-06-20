<script lang="ts">
	import { Combobox, type ComboboxOption } from './index';

	let { allowFreeText = true }: { allowFreeText?: boolean } = $props();

	const options: ComboboxOption[] = [
		{ label: 'Καρδιολόγος', value: 'cardio' },
		{ label: 'Δερματολόγος', value: 'derma' },
		{ label: 'Νευρολόγος', value: 'neuro' }
	];

	let value = $state('');
</script>

<Combobox label="Specialty" {options} {allowFreeText} bind:value />
<p data-testid="cb-value">{value || 'empty'}</p>
