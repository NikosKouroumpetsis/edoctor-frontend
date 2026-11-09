<script lang="ts">
	import { untrack } from 'svelte';
	import { DateOfBirthField } from './index';
	import type { DateOfBirthFieldVariant } from './date-of-birth-field.svelte';

	let {
		allowFuture = false,
		variant = 'segments',
		initial = ''
	}: { allowFuture?: boolean; variant?: DateOfBirthFieldVariant; initial?: string } = $props();
	let value = $state(untrack(() => initial));
	let typed = $state(false);
</script>

<DateOfBirthField bind:value bind:typed label="Date of birth" {allowFuture} {variant} />
<button type="button" class="size-touch" data-testid="dob-clear" onclick={() => (value = '')}
	>clear</button
>
<p data-testid="dob-value">{value || 'empty'}</p>
<p data-testid="dob-typed">{typed ? 'typed' : 'blank'}</p>
