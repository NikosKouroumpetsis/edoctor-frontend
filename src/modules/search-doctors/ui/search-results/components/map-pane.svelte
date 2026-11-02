<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import type { SearchResultCard } from '$modules/search-doctors/types';
	import type { ResultsStage } from '../hooks/use-stage.svelte';
	import type { ResultsMessageOptions } from '../types';
	import ResultsMap from './map.svelte';

	let {
		items,
		stage,
		locale,
		messageOptions,
		profileHref,
		fitKey,
		onSignIn
	}: {
		/** The list's cards (D-103: the SAME data; the map asks nothing of its own). */
		items: SearchResultCard[];
		stage: ResultsStage;
		locale: SupportedLocale;
		messageOptions: ResultsMessageOptions;
		profileHref: (doctorSlug: string) => string;
		/** The search the pins belong to: the camera fits them once per search. */
		fitKey?: string;
		onSignIn: () => void;
	} = $props();
</script>

<!-- Each zone places the pane on its own (no zone undoes another's): behind the sheet below 744; 744–1127
     hidden, or the whole area under the top bar once «Εμφάνιση χάρτη» is pressed; stuck beside the list from
     1128, on the whole stage when expanded, out of the layout when hidden (U-28.2; the map stays made, so it
     comes back where it was). The pin card lies in the pane, over the map and above the phone's sheet. -->
<div
	bind:this={stage.mapPane}
	data-slot="results-map-pane"
	data-testid="results-map-pane"
	class={cn(
		'max-tablet:absolute max-tablet:inset-0',
		stage.mapShown
			? 'tablet:max-laptop:fixed tablet:max-laptop:inset-x-0 tablet:max-laptop:top-bar-top tablet:max-laptop:bottom-0 tablet:max-laptop:z-20'
			: 'tablet:max-laptop:hidden',
		'laptop:map-pane-sticky laptop:mt-6 laptop:overflow-hidden laptop:rounded-lg',
		stage.desktopMap === 'hidden' && 'laptop:hidden'
	)}
>
	<ResultsMap
		{items}
		bind:selectedId={stage.selectedId}
		hotId={stage.hotId}
		{locale}
		{profileHref}
		profileLabel={m.card_profile_link({}, messageOptions)}
		mapLabel={m.results_map_label({}, messageOptions)}
		closeLabel={m.results_pin_close({}, messageOptions)}
		{fitKey}
		fitPadding={stage.mapFitPadding}
		zoomControls={{
			zoomInLabel: m.results_map_zoom_in({}, messageOptions),
			zoomOutLabel: m.results_map_zoom_out({}, messageOptions)
		}}
		expandControl={{
			expanded: stage.desktopMap === 'expanded',
			expandLabel: m.results_map_expand({}, messageOptions),
			collapseLabel: m.results_map_collapse({}, messageOptions),
			onExpandedChange: stage.setMapExpanded
		}}
		hideControl={{
			label: m.results_map_hide({}, messageOptions),
			onHide: () => void stage.hideMap()
		}}
		{onSignIn}
		onSelect={stage.selectPin}
	/>
</div>
