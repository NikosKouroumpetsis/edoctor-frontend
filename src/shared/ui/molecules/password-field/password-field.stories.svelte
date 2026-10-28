<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PasswordField } from '$shared/ui/molecules/password-field';

	// The application's meta (`molecules/password-field`).
	const { Story } = defineMeta({
		title: 'Molecules/PasswordField',
		component: PasswordField,
		tags: ['autodocs'],
		args: {
			hideLabel: 'Απόκρυψη κωδικού',
			label: 'Κωδικός πρόσβασης',
			placeholder: '••••••••',
			showLabel: 'Εμφάνιση κωδικού'
		},
		argTypes: {
			label: { control: 'text' },
			helperText: { control: 'text' },
			error: { control: 'text' },
			required: { control: 'boolean' },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	// Each story is controlled with its own value, as the application's `ControlledPasswordField`.
	let playground = $state('');
	let reveal = $state('Str0ngPass');
	let helper = $state('');
	let invalid = $state('abc');
	let disabled = $state('secret');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PasswordField {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<!-- The spelled-out toggle: the words «Εμφάνιση»/«Απόκρυψη» are the affordance, not an eye glyph. -->
<Story
	name="Text Reveal"
	args={{ hideLabel: 'Απόκρυψη', revealVariant: 'text', showLabel: 'Εμφάνιση' }}
>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PasswordField {...args} bind:value={reveal} /></div>
	{/snippet}
</Story>

<Story name="With Helper Text" args={{ helperText: 'Τουλάχιστον 8 χαρακτήρες.', required: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PasswordField {...args} bind:value={helper} /></div>
	{/snippet}
</Story>

<Story name="With Error" args={{ error: 'Ο κωδικός είναι πολύ σύντομος.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PasswordField {...args} bind:value={invalid} /></div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PasswordField {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>
