<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Toggle } from '$shared/ui/primitives/toggle';
	import BoldIcon from '~icons/lucide/bold';

	const { Story } = defineMeta({
		title: 'Primitives/Toggle',
		component: Toggle,
		tags: ['autodocs'],
		args: { variant: 'default', size: 'default', disabled: false },
		argTypes: {
			variant: { control: 'select', options: ['default', 'outline'] },
			size: { control: 'select', options: ['default', 'sm', 'lg'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let pressed = $state(false);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Toggle bind:pressed {...args} aria-label="Toggle bold"><BoldIcon /></Toggle>
	{/snippet}
</Story>

<Story name="Variants">
	{#snippet template()}
		<div class="flex items-center gap-3">
			<Toggle aria-label="Default bold"><BoldIcon /></Toggle>
			<Toggle variant="outline" aria-label="Outline bold"><BoldIcon /></Toggle>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex items-center gap-3">
			<Toggle size="sm" aria-label="Small bold"><BoldIcon /></Toggle>
			<Toggle size="default" aria-label="Default bold"><BoldIcon /></Toggle>
			<Toggle size="lg" aria-label="Large bold"><BoldIcon /></Toggle>
		</div>
	{/snippet}
</Story>
