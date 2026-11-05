<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import { searchWords } from '$shared/lib/text';
	import { getSessionOptional } from '$shared/state/session';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Button } from '$shared/ui/primitives/button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { favoritesListQuery, isNotPatientAccount } from '$modules/search-doctors/api/favorites';
	import { buildSearchResultCard } from '$modules/search-doctors/lib/doctor-card';
	import {
		clampFavoritesSearch,
		filterFavoriteCards,
		FAVORITES_SEARCH_MAX
	} from '$modules/search-doctors/lib/favorites';
	import type { SearchResultCard } from '$modules/search-doctors/types';
	import SearchDoctorCard, {
		searchDoctorCardMedia,
		useFavoriteToggle,
		useSignIn
	} from '$modules/search-doctors/ui/search-doctor-card';
	import { useFavoritesGrid } from '../hooks/use-grid.svelte';
	import type { FavoritesPageProps } from '../types';

	let { locale, profileHref, searchHref }: FavoritesPageProps = $props();

	const options = $derived({ locale });
	const session = getSessionOptional();
	const signIn = useSignIn(() => locale);
	const favorites = useFavoriteToggle(() => locale);
	const isMember = $derived(session?.isMember ?? false);
	// The page's server knows nobody (U-80.1 Ε6): it draws the wait, and the browser fills it in.
	const isGuest = $derived(session ? session.status === 'guest' : true);

	const list = createQuery(() => ({
		...favoritesListQuery(locale, isMember),
		select: (data: { items: { facts: Parameters<typeof buildSearchResultCard>[0] }[] }) =>
			data.items.map((item) => buildSearchResultCard(item.facts, locale))
	}));

	// 🔴 U-65.6 / U-83.3: a rune of this page and nothing else: never the address, a storage or the server.
	let query = $state('');
	const words = $derived(searchWords(query));
	const cards = $derived<readonly SearchResultCard[]>(isMember ? (list.data ?? []) : []);
	const visible = $derived(filterFavoriteCards(cards, words));
	let title = $state<HTMLElement | null>(null);
	const grid = useFavoritesGrid(
		() => cards,
		() => visible,
		() => title
	);

	// An account with no patient's profile (a doctor's) has no favourites: the empty page, never the error's.
	const notPatient = $derived(isMember && isNotPatientAccount(list.error));
	const failed = $derived(
		session?.readFailed === true ||
			(isMember && !notPatient && list.isError && list.data === undefined)
	);
	const waiting = $derived(
		!failed && !isGuest && !notPatient && (!isMember || list.data === undefined)
	);
	const isEmpty = $derived(
		isMember &&
			!failed &&
			(notPatient || list.data !== undefined) &&
			cards.length === 0 &&
			grid.shown.length === 0
	);
	const hasFavorites = $derived(!isGuest && !failed && !waiting && !isEmpty);
	const noMatch = $derived(words.length > 0 && visible.length === 0 && grid.shown.length === 0);

	const countLabel = $derived(
		words.length > 0
			? m.favorites_count_filtered({ shown: visible.length, total: cards.length }, options)
			: cards.length === 1
				? m.favorites_count_one({ count: cards.length }, options)
				: m.favorites_count_other({ count: cards.length }, options)
	);

	// Whoever leaves the page's member leaves the words with it.
	$effect(() => {
		if (!isMember) query = '';
	});

	function retry() {
		if (session?.readFailed) session.retryRead();
		else void list.refetch();
	}

	const trackGrid = (element: HTMLElement) => {
		grid.setNode(element);
		return { destroy: () => grid.setNode(null) };
	};

	// Π5: the skeleton has the shape of the page's cards, 4 in the phone's column, then two rows of the width's columns.
	const SKELETONS = [
		'',
		'',
		'',
		'',
		'hidden split:flex',
		'hidden split:flex',
		'hidden desktop:flex',
		'hidden desktop:flex',
		'hidden wide:flex',
		'hidden wide:flex'
	];
	const gridClasses =
		'grid grid-cols-1 gap-x-4 gap-y-results-row-gap tablet:grid-cols-2 tablet:gap-x-6 split:grid-cols-3 desktop:grid-cols-4 wide:grid-cols-5';
</script>

<svelte:head>
	<title>{m.favorites_title({}, options)} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet heartGlyph()}
	<StateGlyph name="heart-outline" />
{/snippet}
{#snippet searchGlyph()}
	<StateGlyph name="search-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- 🔴 U-79.1 / U-83 / U-85 (wave 2, screen 20): no lists, no groups — every saved doctor in ONE grid, the newest first, the
     specialty in bold over the name, a search over them on the device. The results' card, one at a time below 744 as the
     application's tab (U-100), then 2 · 3 · 4 · 5 columns (744 · 950 · 1440 · 1920). -->
<main
	data-testid="favorites-page"
	class="flex min-h-page flex-col bg-background pt-6 pb-results-list-end tablet:min-h-0 tablet:pt-reading-gap tablet:pb-section-lg"
>
	<div class="container-page flex flex-1 flex-col">
		<h1
			bind:this={title}
			tabindex="-1"
			class="text-heading-md font-semibold text-foreground outline-none tablet:text-heading-xl"
		>
			{m.favorites_title({}, options)}
		</h1>

		{#if isGuest}
			<!-- Π3: the application's `GuestTabTemplate`; from 744 the same page with the template's tablet values. -->
			<div data-testid="favorites-guest" class="flex max-w-narrow flex-col tablet:max-w-form">
				<p
					class="mt-3 text-title-sm font-normal text-foreground tablet:mt-6 tablet:text-heading-sm tablet:font-semibold"
				>
					{m.favorites_guest_headline({}, options)}
				</p>
				<p class="mt-4 text-body-lg text-foreground tablet:mt-2 tablet:text-muted-foreground">
					{m.favorites_guest_body({}, options)}
				</p>
				<Button
					tone="contrast"
					bordered={false}
					label={m.favorites_guest_cta({}, options)}
					data-testid="favorites-sign-in"
					class="mt-section self-start px-section py-3.5 tablet:mt-6 tablet:min-h-control-md tablet:px-6 tablet:py-0"
					textClass="text-title-xs tablet:text-body-lg tablet:font-semibold"
					onclick={() => signIn()}
				/>
			</div>
		{:else if failed}
			<div class="flex flex-1 items-center justify-center">
				<ErrorState
					titleAs="h2"
					title={m.favorites_error_title({}, options)}
					description={m.favorites_error_body({}, options)}
					actionLabel={m.favorites_error_retry({}, options)}
					onActionPress={retry}
					icon={errorGlyph}
					testId="favorites-error"
				/>
			</div>
		{:else if waiting}
			<Skeleton class="mt-2.5 h-3.5 w-1/4 rounded-xs tablet:w-1/12" />
			<div
				data-testid="favorites-loading"
				aria-busy="true"
				class={cn('mt-6 tablet:mt-section', gridClasses)}
			>
				{#each SKELETONS as zone, index (index)}
					<div class={cn('flex w-full flex-col gap-2.5', zone)} aria-hidden="true">
						<Skeleton class={cn(searchDoctorCardMedia.list.skeletonClass, 'w-full rounded-lg')} />
						<Skeleton class="h-4 w-3/5 rounded-xs" />
						<Skeleton class="h-3 w-4/5 rounded-xs" />
						<Skeleton class="h-3 w-2/5 rounded-xs" />
					</div>
				{/each}
			</div>
		{:else if isEmpty}
			<div class="flex flex-1 items-center justify-center tablet:py-section-lg">
				<EmptyState
					titleAs="h2"
					title={m.favorites_empty_title({}, options)}
					description={m.favorites_empty_body({}, options)}
					actionLabel={m.favorites_empty_action({}, options)}
					actionHref={searchHref}
					icon={heartGlyph}
					testId="favorites-empty"
				/>
			</div>
		{:else if hasFavorites}
			<p
				data-testid="favorites-count"
				aria-live="polite"
				class="mt-1 text-body-md text-muted-foreground tablet:text-body-lg"
			>
				{cards.length > 0 ? countLabel : ''}
			</p>
			<div role="search" class="mt-4 tablet:mt-5 tablet:max-w-text">
				<SearchField
					value={query}
					shape="pill"
					placeholder={m.favorites_search_placeholder({}, options)}
					aria-label={m.favorites_search_placeholder({}, options)}
					maxlength={FAVORITES_SEARCH_MAX}
					autocomplete="off"
					autocapitalize="off"
					spellcheck={false}
					onChangeText={(next) => (query = clampFavoritesSearch(next))}
					onClear={() => (query = '')}
					clearLabel={m.favorites_search_clear({}, options)}
					testId="favorites-search"
					clearTestId="favorites-search-clear"
				/>
			</div>
			<div class="mt-6 flex flex-1 flex-col tablet:mt-section">
				{#if grid.shown.length > 0}
					<div use:trackGrid data-testid="favorites-grid" class={gridClasses}>
						{#each grid.shown as card, index (card.id)}
							<div
								data-flip-key={card.id}
								data-state={grid.leaving(card.id) ? 'leaving' : undefined}
								class={cn(
									'min-w-0 transition-[opacity,scale,transform] duration-standard ease-standard',
									grid.leaving(card.id) && 'pointer-events-none scale-92 opacity-0',
									grid.entering(card.id) && 'animate-card-enter'
								)}
							>
								<SearchDoctorCard
									doctor={card}
									variant="list"
									href={profileHref(card.doctorSlug)}
									profileLabel={m.card_profile_link({}, options)}
									favoriteLabel={m.favorite_toggle({}, options)}
									saved
									specialtyPlacement="top"
									highlightQuery={query}
									onFavorite={() => favorites.remove(card)}
									onSignIn={() => signIn()}
									loading={index < 2 ? 'eager' : 'lazy'}
									testId="favorites-card"
								/>
							</div>
						{/each}
					</div>
				{:else if noMatch}
					<!-- 🔴 U-65.6: the words typed are a text node of the title, whatever they hold. -->
					<EmptyState
						titleAs="h2"
						title={m.favorites_search_no_match({ query }, options)}
						description={m.favorites_search_no_match_body({}, options)}
						actionLabel={m.favorites_search_clear({}, options)}
						onActionPress={() => (query = '')}
						icon={searchGlyph}
						class="wrap-anywhere"
						testId="favorites-no-match"
					/>
				{/if}
			</div>
		{/if}
	</div>
</main>
