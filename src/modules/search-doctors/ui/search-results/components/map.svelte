<script lang="ts">
	import { tick } from 'svelte';
	import { RESULTS_MAP_CAMERA } from '$modules/search-doctors/config/results-map';
	import type { SearchResultCard } from '$modules/search-doctors/types';
	import { mapStyleUrl } from '$shared/config/map';
	import { theme } from '$shared/preferences/theme';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { MapPricePin } from '$shared/ui/molecules/map-price-pin';
	import {
		MapView,
		type MapViewExpandControl,
		type MapViewHideControl,
		type MapViewPadding,
		type MapViewZoomControls
	} from '$shared/ui/organisms/map-view';
	import PinCard from './pin-card.svelte';

	let {
		items,
		selectedId = $bindable(null),
		hotId,
		locale,
		profileHref,
		profileLabel,
		mapLabel,
		closeLabel,
		fitKey,
		fitPadding,
		zoomControls,
		expandControl,
		hideControl,
		onSignIn,
		onSelect
	}: {
		/** The list's cards (D-103: the SAME data; the map asks nothing of its own). */
		items: SearchResultCard[];
		/** The pin whose card is open. */
		selectedId?: string | null;
		/** The card under the pointer in the list: its pin grows. */
		hotId: string | null;
		locale: SupportedLocale;
		profileHref: (doctorSlug: string) => string;
		profileLabel: string;
		mapLabel: string;
		closeLabel: string;
		/** The search the pins belong to: the camera fits them once per search (a next page leaves it where it is). */
		fitKey?: string;
		/** The room the camera keeps around the pins (what covers the map when they are fitted). */
		fitPadding?: () => MapViewPadding;
		/** U-27.2: the map's «+» / «−» (from 744), their names in the page's language. */
		zoomControls?: MapViewZoomControls;
		/** U-28.2: the map's «⤢» / «×» from 1128 (the page's state and words). */
		expandControl?: MapViewExpandControl;
		/** U-28.2: the map's «Απόκρυψη χάρτη» from 1128. */
		hideControl?: MapViewHideControl;
		/** «Συνδεθείτε για κόστος» on the pin's card: the sign-in (S-31.4, U-27.4), never the profile. */
		onSignIn: () => void;
		/** A pin was pressed (the phone lowers its sheet, so the card shows above it). */
		onSelect?: (id: string) => void;
	} = $props();

	// No coordinates, no pin (§7.1): only the cards whose office has both.
	const points = $derived(
		items.flatMap((card) =>
			card.point
				? [{ id: card.id, latitude: card.point.latitude, longitude: card.point.longitude, card }]
				: []
		)
	);
	const selected = $derived(points.find((point) => point.id === selectedId)?.card ?? null);
	const styleUrl = $derived(mapStyleUrl(theme.resolved));

	let root = $state<HTMLElement | null>(null);
	/** Closes the open pin's card; the focus goes back to its pin (MINOR-8 α of r1: never to `body`). */
	async function closeCard() {
		const id = selectedId;
		selectedId = null;
		if (id === null) return;
		await tick();
		const pins = root?.querySelectorAll<HTMLElement>('[data-slot="map-view-pin"]') ?? [];
		[...pins]
			.find((pin) => pin.dataset.id === id)
			?.querySelector<HTMLElement>('button')
			?.focus();
	}
	/** Escape on a pin or in the open card closes the card (its «×» from the keyboard). */
	function onEscape(event: KeyboardEvent) {
		if (event.key !== 'Escape' || selectedId === null) return;
		event.preventDefault();
		void closeCard();
	}
</script>

<!-- U-24.4 (§7.1): the results map — the ONE config's style in the reader's theme, Greek names, a pin per card with
     coordinates (its price, or the dot while the fee needs sign-in), the card of the pressed pin over the map
     (`pin-card`). The wrapper draws no box (`contents`): the map and the card lie in the caller's pane. -->
<div bind:this={root} data-slot="results-map-layer" class="contents">
	<MapView
		{styleUrl}
		{points}
		{selectedId}
		labelLanguage={locale}
		camera={RESULTS_MAP_CAMERA}
		{fitKey}
		{fitPadding}
		{zoomControls}
		{expandControl}
		{hideControl}
		aria-label={mapLabel}
		onMapPress={() => (selectedId = null)}
		testId="results-map"
		class="absolute inset-0"
	>
		{#snippet pin(point, { selected: isSelected })}
			<MapPricePin
				label={point.card.pinLabel}
				selected={isSelected}
				hot={point.id === hotId}
				aria-label={`${point.card.name}, ${point.card.pinLabel ?? point.card.fee.label}`}
				testId={`results-pin-${point.id}`}
				onclick={() => {
					selectedId = point.id;
					onSelect?.(point.id);
				}}
				onkeydown={onEscape}
			/>
		{/snippet}
	</MapView>
	{#if selected}
		{#key selected.id}
			<PinCard
				card={selected}
				href={profileHref(selected.doctorSlug)}
				{profileLabel}
				{closeLabel}
				onClose={() => void closeCard()}
				onkeydown={onEscape}
				{onSignIn}
			/>
		{/key}
	{/if}
</div>
