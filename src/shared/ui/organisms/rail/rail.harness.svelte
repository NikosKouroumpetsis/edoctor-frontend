<script lang="ts">
	import { Rail, type RailControlsFrom, type RailTrailing } from './index';

	let {
		separated = false,
		trailing,
		withControls = false,
		controlsFrom,
		bleed,
		untitled = false,
		endPadding,
		cards = ['Α', 'Β', 'Γ', 'Δ']
	}: {
		untitled?: boolean;
		endPadding?: 'sm' | 'md';
		separated?: boolean;
		trailing?: RailTrailing;
		withControls?: boolean;
		controlsFrom?: RailControlsFrom;
		bleed?: boolean;
		cards?: string[];
	} = $props();

	const scrollLabels = $derived(
		withControls ? { previous: 'Προηγούμενα', next: 'Επόμενα' } : undefined
	);
</script>

{#snippet card(name: string)}
	<a href="#card" class="flex min-h-touch w-card-rail-w items-center rounded-xl bg-muted px-4"
		>Κάρτα {name}</a
	>
{/snippet}

{#if separated}
	<Rail
		title={untitled ? undefined : 'Κριτικές'}
		variant="separated"
		{endPadding}
		items={cards}
		keyExtractor={(name) => name}
		{trailing}
		{scrollLabels}
		{controlsFrom}
		{bleed}
		data-testid="rail"
	>
		{#snippet renderItem(name)}{@render card(name)}{/snippet}
	</Rail>
{:else}
	<Rail
		title="Δημοφιλείς"
		subtitle="Αυτή την εβδομάδα"
		{trailing}
		{scrollLabels}
		{controlsFrom}
		{bleed}
		data-testid="rail"
	>
		{#each cards as name (name)}{@render card(name)}{/each}
	</Rail>
{/if}
