<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ResponsiveGrid } from '$shared/ui/molecules/responsive-grid';
	import { DateCard } from '$shared/ui/primitives/date-card';

	const noop = () => {};

	// The application's meta (`atoms/date-card`): a card fills its grid cell, so alone it stands in a cell 160 wide.
	const { Story } = defineMeta({
		title: 'Primitives/DateCard',
		component: DateCard,
		tags: ['autodocs'],
		args: { onclick: noop, subtitle: 'από 10:00', title: '12 Αυγ' },
		render: template
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="w-placeholder-xl">
		<DateCard title={String(args.title)} subtitle={String(args.subtitle)} onclick={noop} />
	</div>
{/snippet}

<Story name="Playground" />

<Story
	name="Long Text"
	args={{ subtitle: 'από 10:00 έως αργά το απόγευμα', title: 'Τετάρτη 12 Αυγούστου' }}
/>

<!-- The 3 × 2 grid the cards sit in, with a short last row. -->
<Story name="Grid">
	{#snippet template()}
		<ResponsiveGrid
			columns={3}
			gap="rail"
			items={['12', '13', '14', '17', '18']}
			keyExtractor={(day) => day}
			aria-label="Ημέρες"
		>
			{#snippet renderItem(day)}
				<DateCard onclick={noop} subtitle="από 10:00" title={`${day} Αυγ`} />
			{/snippet}
		</ResponsiveGrid>
	{/snippet}
</Story>

<!-- Web only: a card that is a link (an already resolved `href`). -->
<Story name="As Link">
	{#snippet template()}
		<div class="w-placeholder-xl">
			<DateCard title="12 Αυγ" subtitle="από 10:00" href="#availability-2026-08-12" />
		</div>
	{/snippet}
</Story>
