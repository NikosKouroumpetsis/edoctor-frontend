<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SkeletonRail } from '$shared/ui/molecules/skeleton-rail';
	import { SkeletonSection } from '$shared/ui/molecules/skeleton-section';

	const at = (value: string) => ({ viewport: { value, isRotated: false } });

	const { Story } = defineMeta({
		title: 'Molecules/SkeletonSection',
		component: SkeletonSection,
		tags: ['autodocs'],
		args: { cardCount: 3 },
		argTypes: { cardCount: { control: { type: 'number', min: 1, max: 6, step: 1 } } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<section aria-busy="true" class="w-full max-w-content"><SkeletonSection {...args} /></section>
	{/snippet}
</Story>

<Story name="One card">
	{#snippet template()}
		<section aria-busy="true" class="w-full max-w-content">
			<SkeletonSection cardCount={1} />
		</section>
	{/snippet}
</Story>

<!-- The home while it loads: the tabs' rail and three sections, the page busy, the shapes decorative. -->
<Story name="The home loading on the phone" globals={at('z375')}>
	{#snippet template()}
		<div aria-busy="true" class="flex flex-col gap-section">
			<SkeletonRail />
			<SkeletonSection />
			<SkeletonSection />
			<SkeletonSection />
		</div>
	{/snippet}
</Story>

<Story name="On the tablet" globals={at('z744')}>
	{#snippet template()}
		<section aria-busy="true"><SkeletonSection cardCount={4} /></section>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<section aria-busy="true" class="w-full max-w-content bg-background p-card">
			<SkeletonSection />
		</section>
	{/snippet}
</Story>
