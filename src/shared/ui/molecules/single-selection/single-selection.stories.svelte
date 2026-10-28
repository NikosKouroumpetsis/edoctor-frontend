<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent } from 'storybook/test';
	import { SingleSelection } from '$shared/ui/molecules/single-selection';

	const options = [
		{ label: 'Πρωί', value: 'morning' },
		{ label: 'Μεσημέρι', value: 'noon' },
		{ label: 'Βράδυ', value: 'evening' }
	];

	// The application's meta (`molecules/single-selection`).
	const { Story } = defineMeta({
		title: 'Molecules/Single selection',
		component: SingleSelection,
		tags: ['autodocs'],
		args: { label: 'Προτιμώμενη ώρα', options, disabled: false },
		argTypes: { disabled: { control: 'boolean' } }
	});
</script>

<script lang="ts">
	let playground = $state('morning');
	let invalid = $state('');
	let disabled = $state('morning');
</script>

<!-- The arrows move the choice within the radio group (the web's interaction check). -->
<Story
	name="Playground"
	play={async ({ canvas }) => {
		const radios = canvas.getAllByRole('radio');
		radios[0].focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect(radios[1]).toHaveFocus();
	}}
>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><SingleSelection {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<Story name="With Error" args={{ error: 'Επιλέξτε μία ώρα' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><SingleSelection {...args} bind:value={invalid} /></div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><SingleSelection {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>
