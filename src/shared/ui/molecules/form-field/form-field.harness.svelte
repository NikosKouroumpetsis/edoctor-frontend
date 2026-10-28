<script lang="ts">
	import { FormField } from './index';
	import { Input } from '$shared/ui/primitives/input';

	let {
		label = 'Email',
		error,
		helperText,
		required = false,
		disabled = false
	}: {
		label?: string;
		error?: string;
		helperText?: string;
		required?: boolean;
		disabled?: boolean;
	} = $props();
</script>

<FormField {label} {error} {helperText} {required} {disabled}>
	{#snippet children(control)}
		<Input {...control} {disabled} placeholder="name@example.com" />
	{/snippet}
</FormField>
