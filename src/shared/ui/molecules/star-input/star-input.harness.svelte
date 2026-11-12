<script lang="ts">
	import { StarInput } from './index';

	let {
		initial = 0,
		disabled = false,
		onValueChange
	}: {
		initial?: number;
		disabled?: boolean;
		onValueChange?: (value: number) => void;
	} = $props();

	// The caller's words for the value, as a page writes them («4,5 στα 5»).
	const spoken = (value: number) =>
		value === 0 ? 'Χωρίς βαθμό' : `${String(value / 2).replace('.', ',')} στα 5`;

	// svelte-ignore state_referenced_locally
	let value = $state(initial);
</script>

<StarInput
	bind:value
	aria-label="Σε βάθος"
	valueText={spoken}
	{disabled}
	{onValueChange}
	data-testid="stars"
/>
<output data-testid="bound">{value}</output>
