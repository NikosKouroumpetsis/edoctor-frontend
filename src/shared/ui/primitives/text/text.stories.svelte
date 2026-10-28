<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Text } from '$shared/ui/primitives/text';

	const variants = ['title', 'heading', 'body', 'caption', 'eyebrow'] as const;

	// The application's meta (`atoms/text`); its `children` is the web's `text`, `as` (the tag) is the web's own.
	const { Story } = defineMeta({
		title: 'Primitives/Text',
		component: Text,
		tags: ['autodocs'],
		args: { text: 'Η υγεία σου, πρώτη προτεραιότητα', variant: 'body' },
		argTypes: {
			variant: { control: 'select', options: variants },
			text: { control: 'text' },
			as: { control: 'select', options: ['p', 'span', 'h1', 'h2', 'h3', 'label'] }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Text {...args} />
	{/snippet}
</Story>

<Story name="Variants">
	{#snippet template(args)}
		<div class="flex flex-col gap-3">
			{#each variants as variant (variant)}
				<Text {...args} {variant} text={variant} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story
	name="Semantic Class Override"
	args={{ variant: undefined, class: 'text-display-xl text-foreground' }}
>
	{#snippet template(args)}
		<Text {...args} />
	{/snippet}
</Story>
