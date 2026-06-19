<script lang="ts">
	import EyeIcon from '~icons/lucide/eye';
	import EyeOffIcon from '~icons/lucide/eye-off';
	import { TextField } from '$shared/ui/molecules/text-field';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label = 'Password',
		value = $bindable(''),
		field,
		error,
		name,
		disabled = false,
		required = false,
		autocomplete = 'current-password'
	}: {
		label?: string;
		value?: string;
		field?: FieldApi<string>;
		error?: string;
		name?: string;
		disabled?: boolean;
		required?: boolean;
		autocomplete?: 'current-password' | 'new-password';
	} = $props();

	let revealed = $state(false);
</script>

<TextField
	{label}
	{field}
	bind:value
	{error}
	{name}
	{disabled}
	{required}
	{autocomplete}
	type={revealed ? 'text' : 'password'}
>
	{#snippet trailing()}
		<button
			type="button"
			aria-label={revealed ? 'Hide password' : 'Show password'}
			aria-pressed={revealed}
			tabindex={-1}
			onclick={() => (revealed = !revealed)}
			class="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			{#if revealed}<EyeOffIcon class="size-4" />{:else}<EyeIcon class="size-4" />{/if}
		</button>
	{/snippet}
</TextField>
