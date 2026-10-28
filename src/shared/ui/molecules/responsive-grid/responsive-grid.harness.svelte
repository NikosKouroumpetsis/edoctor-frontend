<script lang="ts">
	import { ResponsiveGrid, type GridColumns, type GridColumnsByZone, type GridGap } from './index';

	let {
		count = 5,
		columns,
		gap,
		keyed = true
	}: {
		count?: number;
		columns?: GridColumns | GridColumnsByZone;
		gap?: GridGap;
		keyed?: boolean;
	} = $props();

	const items = $derived(
		Array.from({ length: count }, (_, index) => ({
			id: `slot-${index}`,
			label: `Κελί ${index + 1}`
		}))
	);
</script>

<ResponsiveGrid
	{items}
	{columns}
	{gap}
	keyExtractor={keyed ? (item) => item.id : undefined}
	aria-label="Ώρες"
	data-testid="grid"
>
	{#snippet renderItem(item, index)}
		<span data-index={index}>{item.label}</span>
	{/snippet}
</ResponsiveGrid>
