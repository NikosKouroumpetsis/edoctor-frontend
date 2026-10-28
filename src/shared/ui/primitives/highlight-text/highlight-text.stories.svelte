<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { HighlightText } from '$shared/ui/primitives/highlight-text';

	const examples = [
		{ text: 'Αθήνα', query: 'αθη' },
		{ text: 'Παθολόγος', query: 'παθ' },
		{ text: 'Dr. Athena Papadopoulou', query: 'papa' },
		{ text: 'Κηφισιά', query: 'ξξξ' }
	];

	const { Story } = defineMeta({
		title: 'Primitives/HighlightText',
		component: HighlightText,
		tags: ['autodocs'],
		args: {
			text: 'Αθήνα',
			query: 'αθη',
			class: 'text-body-md font-medium text-foreground'
		},
		argTypes: {
			text: { control: 'text' },
			query: { control: 'text' },
			class: { control: 'text' },
			highlightClass: { control: 'text' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<HighlightText {...args} />
	{/snippet}
</Story>

<Story name="Examples">
	{#snippet template(args)}
		<div class="flex flex-col gap-3">
			{#each examples as example (example.text)}
				<HighlightText {...args} text={example.text} query={example.query} />
			{/each}
		</div>
	{/snippet}
</Story>
