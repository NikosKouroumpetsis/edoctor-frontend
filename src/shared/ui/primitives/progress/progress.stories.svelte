<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Progress } from '$shared/ui/primitives/progress';

	const { Story } = defineMeta({
		title: 'Primitives/Progress',
		component: Progress,
		tags: ['autodocs'],
		args: { value: 40, max: 100 },
		argTypes: { value: { control: { type: 'range', min: 0, max: 100, step: 1 } } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-80"><Progress {...args} /></div>
	{/snippet}
</Story>

<Story name="Indeterminate">
	{#snippet template()}
		<div class="w-80"><Progress value={null} /></div>
	{/snippet}
</Story>

<Story name="Complete">
	{#snippet template()}
		<div class="w-80"><Progress value={100} /></div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex w-80 flex-col gap-3">
			<Progress size="sm" value={40} />
			<Progress size="default" value={40} />
			<Progress size="lg" value={40} />
		</div>
	{/snippet}
</Story>
