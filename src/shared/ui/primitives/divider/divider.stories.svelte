<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Divider } from '$shared/ui/primitives/divider';
	import { Text } from '$shared/ui/primitives/text';

	// The application's meta (`atoms/divider`).
	const { Story } = defineMeta({
		title: 'Primitives/Divider',
		component: Divider,
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
		<div class="max-w-form">
			<Text text="Πάνω από τη γραμμή" />
			<Divider {...args} orientation="horizontal" />
			<Text text="Κάτω από τη γραμμή" />
		</div>
	{/snippet}
</Story>

<!-- The same 16 on both sides of the vertical line (U-06.6). -->
<Story name="Vertical">
	{#snippet template(args)}
		<div class="flex h-touch flex-row items-center">
			<Text text="Αριστερά" />
			<Divider {...args} orientation="vertical" />
			<Text text="Δεξιά" />
		</div>
	{/snippet}
</Story>

<!-- The divider holds the content below its line. -->
<Story name="Holding Content">
	{#snippet template(args)}
		<div class="max-w-form">
			<Text text="Πάνω ενότητα" />
			<Divider {...args}><Text text="Η ενότητα κάτω από τη γραμμή" /></Divider>
		</div>
	{/snippet}
</Story>
