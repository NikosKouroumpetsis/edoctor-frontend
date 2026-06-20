<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent } from 'storybook/test';
	import { SingleSelection } from '$shared/ui/molecules/single-selection';

	const { Story } = defineMeta({
		title: 'Molecules/Single selection',
		component: SingleSelection,
		tags: ['autodocs']
	});

	const options = [
		{ value: 'morning', label: 'Morning' },
		{ value: 'afternoon', label: 'Afternoon' },
		{ value: 'evening', label: 'Evening' }
	];
</script>

<script lang="ts">
	let value = $state('');
	let preselected = $state('afternoon');
	let navValue = $state('morning');
</script>

<Story name="Default">
	{#snippet template()}
		<div class="w-96"><SingleSelection label="Preferred time" {options} bind:value /></div>
	{/snippet}
</Story>

<Story name="Pre-selected">
	{#snippet template()}
		<div class="w-96">
			<SingleSelection label="Preferred time" {options} bind:value={preselected} />
		</div>
	{/snippet}
</Story>

<Story
	name="Arrow navigation"
	play={async ({ canvas }) => {
		const radios = canvas.getAllByRole('radio');
		radios[0].focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect(radios[1]).toHaveFocus();
	}}
>
	{#snippet template()}
		<div class="w-96">
			<SingleSelection label="Preferred time" {options} bind:value={navValue} />
		</div>
	{/snippet}
</Story>
