<script lang="ts">
	import { untrack } from 'svelte';
	import { MapSheet, type MapSheetSnap } from './index';

	let {
		initial = 'half',
		withHeader = true,
		onCard = () => {},
		sheetStyle
	}: {
		initial?: MapSheetSnap;
		withHeader?: boolean;
		onCard?: () => void;
		sheetStyle?: string;
	} = $props();
	let snap = $state<MapSheetSnap>(untrack(() => initial));
</script>

{#snippet header()}
	<h2>Βρέθηκαν 12</h2>
{/snippet}

<div class="relative h-map-h" data-testid="stage">
	<MapSheet
		bind:snap
		restoreLabel="Επαναφορά λίστας"
		header={withHeader ? header : undefined}
		aria-label="Λίστα γιατρών"
		testId="sheet"
		style={sheetStyle}
	>
		<p>Λίστα</p>
		<button type="button" class="size-touch" onclick={() => onCard()}>Κάρτα α</button>
	</MapSheet>
</div>
<button type="button" class="size-touch" data-testid="to-peek" onclick={() => (snap = 'peek')}
	>Χάρτης</button
>
<output data-testid="snap">{snap}</output>
