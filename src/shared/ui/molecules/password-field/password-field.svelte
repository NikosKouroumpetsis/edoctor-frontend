<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
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
		invalid = false,
		autocomplete = 'current-password',
		...restProps
	}: Pick<HTMLInputAttributes, 'maxlength' | 'oninput'> & {
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
		/** The error look without a message (the message lives elsewhere). */
		invalid?: boolean;
		autocomplete?: 'current-password' | 'new-password';
		'data-testid'?: string;
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
	{invalid}
	{autocomplete}
	type={revealed ? 'text' : 'password'}
	{...restProps}
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
