<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Separator } from '$shared/ui/primitives/separator';
	import { Text } from '$shared/ui/primitives/text';

	// The application's meta (`atoms/separator`).
	const { Story } = defineMeta({
		title: 'Primitives/Separator',
		component: Separator,
		tags: ['autodocs'],
		args: { orientation: 'horizontal', spacing: 'md' },
		argTypes: {
			orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
			spacing: { control: 'radio', options: ['md', 'none'] }
		}
	});
</script>

<Story name="Horizontal">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<Text text="Ενότητα Α" />
			<Separator {...args} orientation="horizontal" />
			<Text text="Ενότητα Β" />
		</div>
	{/snippet}
</Story>

<!-- The line's own `mx-4` on both sides of it, no gap of the row (U-06.6). -->
<Story name="Vertical">
	{#snippet template(args)}
		<div class="flex h-control-xs flex-row items-center">
			<Text text="10:00" />
			<Separator {...args} orientation="vertical" />
			<Text text="Διαθέσιμο" />
		</div>
	{/snippet}
</Story>

<Story name="Spacing">
	{#snippet template()}
		<div class="w-full max-w-narrow">
			<Text text="Κενό md" />
			<Separator />
			<Text text="Χωρίς κενό (none)" />
			<Separator spacing="none" />
			<Text text="Τέλος" />
		</div>
	{/snippet}
</Story>
