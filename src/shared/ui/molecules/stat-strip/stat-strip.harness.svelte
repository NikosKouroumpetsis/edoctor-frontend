<script lang="ts">
	import { StatStrip, type StatStripCell } from './index';

	let {
		wrapId,
		wrapText = 'Επιλογή ασθενών',
		ids = ['rating', 'badge', 'reviews']
	}: { wrapId?: string; wrapText?: string; ids?: string[] } = $props();
</script>

{#snippet rating()}
	<span>4,9</span>
{/snippet}
{#snippet badge()}
	<span>{wrapText}</span>
{/snippet}
{#snippet reviews()}
	<span>124 κριτικές</span>
{/snippet}

<StatStrip
	cells={ids.map(
		(id): StatStripCell => ({
			id,
			render: id === 'rating' ? rating : id === 'badge' ? badge : reviews
		})
	)}
	wrap={wrapId ? { id: wrapId, text: wrapText } : undefined}
	testId="stats"
	testIdPrefix="stat"
/>
