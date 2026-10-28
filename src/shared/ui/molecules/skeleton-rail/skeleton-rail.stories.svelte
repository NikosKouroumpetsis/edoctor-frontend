<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SkeletonRail } from '$shared/ui/molecules/skeleton-rail';

	const { Story } = defineMeta({
		title: 'Molecules/SkeletonRail',
		component: SkeletonRail,
		tags: ['autodocs'],
		args: { count: 6 },
		argTypes: { count: { control: { type: 'number', min: 1, max: 10, step: 1 } } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div aria-busy="true" class="w-full max-w-content"><SkeletonRail {...args} /></div>
	{/snippet}
</Story>

<Story name="Three tiles">
	{#snippet template()}
		<div aria-busy="true"><SkeletonRail count={3} /></div>
	{/snippet}
</Story>

<!-- Six tiles are wider than the phone: the row is cut at its own edge, the page never scrolls sideways. -->
<Story
	name="Cut at the edge on the phone"
	globals={{ viewport: { value: 'z375', isRotated: false } }}
>
	{#snippet template()}
		<div aria-busy="true"><SkeletonRail /></div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div aria-busy="true" class="w-full max-w-content bg-background p-card"><SkeletonRail /></div>
	{/snippet}
</Story>
