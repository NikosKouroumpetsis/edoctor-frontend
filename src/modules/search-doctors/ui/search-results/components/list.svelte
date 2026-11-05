<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Button } from '$shared/ui/primitives/button';
	import type { SearchResultsEmptyState } from '$modules/search-doctors/lib/results-empty';
	import SearchDoctorCard, {
		useFavoriteToggle
	} from '$modules/search-doctors/ui/search-doctor-card';
	import type { ResultsStage } from '../hooks/use-stage.svelte';
	import type { SearchResultsState } from '../hooks/use-state.svelte';
	import type { ResultsMessageOptions } from '../types';
	import CardSkeleton from './card-skeleton.svelte';

	let {
		results,
		stage,
		emptyState,
		messageOptions,
		profileHref,
		onSignIn,
		onEmptyAction,
		onChangeWhere,
		legal
	}: {
		/** The results' read (the cards, the view, the next page). */
		results: SearchResultsState;
		stage: ResultsStage;
		/** The empty state's words and button (S-31.9), or `null`. */
		emptyState: SearchResultsEmptyState | null;
		messageOptions: ResultsMessageOptions;
		profileHref: (doctorSlug: string) => string;
		/** «Συνδεθείτε για κόστος»: the sign-in over the page. */
		onSignIn: () => void;
		/** The empty state's one button (S-31.9). */
		onEmptyAction: () => void;
		/** «Κοντά μου» refused: the search opens on «Πού». */
		onChangeWhere: () => void;
		/** The thin legal line at the list's end. */
		legal?: Snippet;
	} = $props();

	const view = $derived(results.view);
	const favorites = useFavoriteToggle(() => messageOptions.locale);

	// ---- the list's end (the application's `onEndReached`): the next page while it is in view ----
	// 🔴 MAJOR-2 (r1): an observer tells only when the end CROSSES its edge; an end still in view after a page (a tall
	// screen) would stop the list. The observer only says where the end is; the effect asks again after every page.
	let sentinel = $state<HTMLElement | null>(null);
	let endInView = $state(false);
	$effect(() => {
		const node = sentinel;
		if (!node || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(
			([entry]) => {
				endInView = entry?.isIntersecting ?? false;
			},
			{ rootMargin: '0px 0px 50% 0px' }
		);
		observer.observe(node);
		return () => {
			observer.disconnect();
			endInView = false;
		};
	});
	$effect(() => {
		if (
			endInView &&
			results.hasNextPage &&
			!results.isFetchingNextPage &&
			!results.isNextPageError &&
			!results.isNextPageUnavailable
		)
			untrack(() => results.loadMore());
	});
</script>

{#snippet searchGlyph()}
	<StateGlyph name="search-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
{#snippet locationGlyph()}
	<StateGlyph name="location-outline" />
{/snippet}

{#snippet skeletonGrid(cards: number)}
	<div
		data-slot="results-skeleton"
		class={cn(
			'grid grid-cols-1 gap-x-6 gap-y-results-row-gap tablet:grid-cols-2 split:grid-cols-3',
			stage.desktopColumns
		)}
	>
		{#each Array.from({ length: cards }, (_, index) => index) as key (key)}
			<CardSkeleton />
		{/each}
	</div>
{/snippet}

<div data-slot="results-list" class="px-gutter-sm pb-results-list-end tablet:px-0 tablet:pb-0">
	{#if view.status === 'loading' || view.status === 'locating'}
		{@render skeletonGrid(4)}
	{:else if view.status === 'error'}
		<ErrorState
			titleAs="h2"
			title={m.results_error_title({}, messageOptions)}
			description={m.results_error_body({}, messageOptions)}
			actionLabel={m.results_retry({}, messageOptions)}
			onActionPress={results.retry}
			icon={errorGlyph}
			testId="results-error"
		/>
	{:else if view.status === 'denied'}
		<EmptyState
			titleAs="h2"
			title={m.criteria_location_denied({}, messageOptions)}
			actionLabel={m.results_empty_change_search({}, messageOptions)}
			onActionPress={onChangeWhere}
			icon={locationGlyph}
			testId="results-location-denied"
		/>
	{:else if view.status === 'unavailable'}
		<EmptyState
			titleAs="h2"
			title={m.criteria_location_unavailable({}, messageOptions)}
			actionLabel={m.results_retry({}, messageOptions)}
			onActionPress={results.locateAgain}
			icon={locationGlyph}
			testId="results-location-unavailable"
		/>
	{:else if view.status === 'empty' && emptyState}
		<EmptyState
			titleAs="h2"
			title={emptyState.title}
			description={emptyState.description}
			actionLabel={emptyState.actionLabel}
			onActionPress={onEmptyAction}
			icon={searchGlyph}
			testId="results-empty"
		/>
	{:else}
		<div
			data-slot="results-grid"
			data-testid="results-grid"
			class={cn(
				'grid grid-cols-1 gap-x-6 gap-y-results-row-gap tablet:grid-cols-2 split:grid-cols-3',
				stage.desktopColumns
			)}
		>
			{#each results.items as card, index (card.id)}
				<SearchDoctorCard
					doctor={card}
					variant="list"
					href={profileHref(card.doctorSlug)}
					profileLabel={m.card_profile_link({}, messageOptions)}
					favoriteLabel={m.favorite_toggle({}, messageOptions)}
					saved={favorites.isSaved(card.id)}
					pop={favorites.isPopping(card.id)}
					onFavorite={() => favorites.toggle(card)}
					{onSignIn}
					onHover={(hovering) => stage.hover(card.id, hovering)}
					loading={index < 2 ? 'eager' : 'lazy'}
					testId="results-card"
				/>
			{/each}
		</div>
		<!-- The list's end (§7.7): the next page asks itself while this is in view, its skeleton meanwhile —
		     first, even while a retry runs; a failed or network-less next page keeps the cards and offers
		     «Δοκιμάστε ξανά» (MINOR-1 of r1, D2 lesson 7), asking only that page. -->
		{#if results.isFetchingNextPage || (results.hasNextPage && !results.isNextPageError && !results.isNextPageUnavailable)}
			<div bind:this={sentinel} data-slot="results-next" class="mt-results-row-gap">
				{#if results.isFetchingNextPage}
					{@render skeletonGrid(2)}
				{/if}
			</div>
		{:else if results.isNextPageError || results.isNextPageUnavailable}
			<div data-slot="results-next-error" class="mt-section flex justify-center">
				<Button
					tone="outline"
					radius="full"
					label={m.results_retry({}, messageOptions)}
					onclick={results.retry}
					data-testid="results-next-retry"
				/>
			</div>
		{/if}
	{/if}
	{@render legal?.()}
</div>
