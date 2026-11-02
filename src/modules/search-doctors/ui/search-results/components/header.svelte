<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { FilterButton } from '$shared/ui/molecules/filter-button';
	import { layoutOf } from '$shared/ui/molecules/search-trigger';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import type { ModalOrigin } from '$shared/ui/templates/modal-screen';
	import type { SearchResultsView } from '../hooks/use-state.svelte';
	import type { ResultsMessageOptions } from '../types';

	let {
		view,
		countLabel,
		filtersLabel,
		filterCount,
		messageOptions,
		onOpenFilters
	}: {
		view: SearchResultsView;
		/** «Βρέθηκαν N γιατροί» (S-32.10, «N+» on a lower bound). */
		countLabel: string;
		/** The filters button's name with its count. */
		filtersLabel: string;
		filterCount: number;
		messageOptions: ResultsMessageOptions;
		onOpenFilters: (origin?: ModalOrigin) => void;
	} = $props();
</script>

<!-- §7.3: «Βρέθηκαν N γιατροί» at the top (the phone 16/600 centred, from 744 22/600 left) and nothing under
     it; from 744 the filters pill «⚙ Φίλτρα [2]» on its right. -->
<div
	data-slot="results-header"
	class="flex flex-row items-center justify-center gap-4 px-gutter-sm pb-4 tablet:justify-between tablet:px-0 tablet:pb-5"
>
	{#if view.status === 'results'}
		<h1
			data-testid="results-count"
			aria-live="polite"
			class="text-center text-body-lg font-semibold text-foreground tablet:text-left tablet:text-heading-sm"
		>
			{countLabel}
		</h1>
	{:else if view.status === 'loading' || view.status === 'locating'}
		<Skeleton data-testid="results-count-skeleton" class="h-6 w-1/2 rounded-xs tablet:w-1/4" />
	{:else}
		<h1 class="sr-only">{m.results_title({}, messageOptions)}</h1>
	{/if}
	<FilterButton
		shape="pill"
		label={m.results_filters({}, messageOptions)}
		aria-label={filtersLabel}
		count={filterCount}
		testId="results-filters-pill"
		class="hidden tablet:inline-flex"
		onclick={(event) => onOpenFilters(layoutOf(event.currentTarget))}
	/>
</div>
