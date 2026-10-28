<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SkeletonLines } from '$shared/ui/molecules/skeleton-lines';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	const { Story } = defineMeta({
		title: 'Molecules/SkeletonLines',
		component: SkeletonLines,
		tags: ['autodocs'],
		args: {
			lines: [
				{ height: 'h-6', width: 'w-1/2' },
				{ width: 'w-full' },
				{ width: 'w-5/6' },
				{ width: 'w-3/4' }
			]
		}
	});
</script>

<!-- A title line over three text lines, in the default `gap-2` column. -->
<Story name="Playground">
	{#snippet template(args)}
		<div aria-busy="true" class="w-full max-w-form"><SkeletonLines {...args} /></div>
	{/snippet}
</Story>

<!-- Two paragraphs: the fourth line starts a group, 16 lower (the profile window's body). -->
<Story name="Paragraphs">
	{#snippet template()}
		<div aria-busy="true" class="w-full max-w-form">
			<SkeletonLines
				class="gap-5"
				lines={[
					{ height: 'h-6', width: 'w-full' },
					{ height: 'h-6', width: 'w-11/12' },
					{ height: 'h-6', width: 'w-4/5' },
					{ height: 'h-6', startsGroup: true, width: 'w-1/3' },
					{ height: 'h-6', width: 'w-full' },
					{ height: 'h-6', width: 'w-5/6' }
				]}
			/>
		</div>
	{/snippet}
</Story>

<Story name="With a block">
	{#snippet template()}
		<div aria-busy="true" class="w-full max-w-form">
			<SkeletonLines
				class="gap-4"
				lines={[
					{ height: 'h-6', width: 'w-2/5' },
					{ height: 'h-map-h', shape: 'block', width: 'w-full' },
					{ width: 'w-full' }
				]}
			/>
		</div>
	{/snippet}
</Story>

<!-- Every height the scale offers it, and what follows the lines in the same column. -->
<Story name="Heights and children">
	{#snippet template()}
		<div aria-busy="true" class="w-full max-w-form">
			<SkeletonLines
				class="gap-3"
				lines={[
					{ height: 'h-3', width: 'w-1/5' },
					{ width: 'w-1/3' },
					{ height: 'h-5', width: 'w-2/3' },
					{ height: 'h-control-xs', width: 'w-3/4' },
					{ height: 'h-control-sm', width: 'w-3/5' },
					{ height: 'h-hero-skeleton', shape: 'block', width: 'w-full' }
				]}
			>
				<Skeleton class="size-control-xs rounded-full" />
			</SkeletonLines>
		</div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div aria-busy="true" class="w-full max-w-form bg-background p-card">
			<SkeletonLines
				class="gap-4"
				lines={[
					{ height: 'h-6', width: 'w-2/5' },
					{ height: 'h-map-h', shape: 'block', width: 'w-full' },
					{ width: 'w-full' },
					{ width: 'w-3/4' }
				]}
			/>
		</div>
	{/snippet}
</Story>
