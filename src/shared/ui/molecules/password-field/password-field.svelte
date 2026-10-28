<script lang="ts">
	import { TextField, type TextFieldSize } from '$shared/ui/molecules/text-field';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label,
		hideLabel,
		showLabel,
		revealVariant = 'icon',
		value = $bindable(''),
		field,
		error,
		helperText,
		name,
		size = 'default',
		placeholder = '',
		disabled = false,
		required = false,
		autocomplete = 'current-password'
	}: {
		label: string;
		/** Names of the reveal control, already localized (the application requires both). */
		hideLabel: string;
		showLabel: string;
		/** The eye glyph, or the words themselves as a text button. */
		revealVariant?: 'icon' | 'text';
		value?: string;
		field?: FieldApi<string>;
		error?: string;
		helperText?: string;
		name?: string;
		size?: TextFieldSize;
		placeholder?: string;
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
	{helperText}
	{name}
	{size}
	{placeholder}
	{disabled}
	{required}
	{autocomplete}
	type={revealed ? 'text' : 'password'}
>
	{#snippet trailing()}
		<button
			type="button"
			aria-label={revealVariant === 'icon' ? (revealed ? hideLabel : showLabel) : undefined}
			aria-pressed={revealed}
			tabindex={-1}
			onclick={() => (revealed = !revealed)}
			class="inline-flex min-h-touch min-w-touch items-center justify-center rounded-md px-1 text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{#if revealVariant === 'text'}
				<span class="text-body-sm font-semibold text-foreground underline"
					>{revealed ? hideLabel : showLabel}</span
				>
			{:else}
				<Ionicon name={revealed ? 'eye-off' : 'eye'} class="icon-md" />
			{/if}
		</button>
	{/snippet}
</TextField>
