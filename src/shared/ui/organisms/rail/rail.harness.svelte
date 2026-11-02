<script lang="ts">
	import {
		RAIL_CARDS_PER_VIEW,
		Rail,
		type RailControlsFrom,
		type RailTrailing,
		type RailTrailingAt
	} from './index';

	let {
		separated = false,
		trailing,
		withControls = false,
		controlsFrom,
		bleed,
		untitled = false,
		endPadding,
		byZone = false,
		trailingAt,
		cards = ['Α', 'Β', 'Γ', 'Δ']
	}: {
		untitled?: boolean;
		endPadding?: 'sm' | 'md';
		separated?: boolean;
		trailing?: RailTrailing;
		withControls?: boolean;
		controlsFrom?: RailControlsFrom;
		bleed?: boolean;
		/** The home rows' `perView={RAIL_CARDS_PER_VIEW}`. */
		byZone?: boolean;
		trailingAt?: RailTrailingAt;
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
		perView={byZone ? RAIL_CARDS_PER_VIEW : undefined}
		data-testid="rail"
	>
		{#snippet renderItem(name)}{@render card(name)}{/snippet}
	</Rail>
{:else}
	<Rail
		title="Δημοφιλείς"
		subtitle="Αυτή την εβδομάδα"
		{trailing}
		{trailingAt}
		{scrollLabels}
		{controlsFrom}
		{bleed}
		perView={byZone ? RAIL_CARDS_PER_VIEW : undefined}
		data-testid="rail"
	>
		{#each cards as name (name)}{@render card(name)}{/each}
	</Rail>
{/if}
