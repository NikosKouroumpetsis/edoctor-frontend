<script lang="ts">
	import { useQueryClient } from '@tanstack/svelte-query';
	import type { Pathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { recordServerNow } from '$shared/lib/server-clock';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { readFreshDeviceLocation } from '$shared/state/device-location';
	import { getSearchDockOptional } from '$shared/state/search-dock';
	import { layoutOf } from '$shared/ui/molecules/search-trigger';
	import type { SearchBarPanelContext } from '$shared/ui/organisms/search-bar';
	import type { ModalOrigin } from '$shared/ui/templates/modal-screen';
	import { prefetchSearchResults } from '$modules/search-doctors/api/results';
	import { readResultsPress } from '$modules/search-doctors/lib/results-scope';
	import { searchResultsHref } from '$modules/search-doctors/lib/search-criteria';
	import SearchCriteria, {
		CriteriaPanel,
		CriteriaSearchBar,
		useCriteriaWiring
	} from '$modules/search-doctors/ui/search-criteria';
	import DiscoveryHeader from '$modules/search-doctors/ui/discovery-header';
	import { useSignIn } from '$modules/search-doctors/ui/search-doctor-card';
	import { DiscoveryState, useHomeSections, useStreamedSections } from '../hooks';
	import Rows from '../components/rows.svelte';
	import type { DiscoveryHomeProps } from '../types';

	let { data, after }: DiscoveryHomeProps = $props();

	const discovery = new DiscoveryState();
	const dock = getSearchDockOptional();
	const queryClient = useQueryClient();

	const locale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale });
	const localizedHref = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const resultsPath = $derived(localizedHref('/doctors'));
	const signIn = useSignIn(() => locale);

	// Category-scoped sections (client-side, TanStack Query); the `all` view is the streamed SSR `data.sections`.
	const home = useHomeSections(
		() => discovery.activeCategory,
		() => getPageLocale(page.url)
	);
	// The `all` view: the streamed SSR sections, «Δοκιμή ξανά» asking only the failed ones again.
	const streamed = useStreamedSections(
		() => data.sections,
		() => getPageLocale(page.url)
	);

	// The category rows write «Σήμερα / Αύριο» on the server's clock, not the device's (D-118).
	$effect(() => recordServerNow(data.serverNow));

	/**
	 * 🔗 The search (D2, U-21 ⇒ U-23): ONE state for the phone's window of cards (< 744) and the big bar's panel
	 * (≥ 744). Its search goes to the results with the application's names (`/doctors?what=…&whereSlug=…`); a doctor
	 * row opens the doctor's page (the application's: one without a slug does nothing).
	 */
	const { search, lists, bar } = useCriteriaWiring({
		locale: () => locale,
		dock,
		onSearch: (criteria) => {
			// `resolve()` takes the localized path with its query (SvelteKit's `PathnameWithSearchOrHash`, the route
			// `/doctors` with a search; the cast is the one `localizedHref` makes for a localized path).
			const href = searchResultsHref(localizeHref('/doctors', { locale }), criteria);
			// D-103 (MINOR-7 of r1): the results' first page is asked at the press, not after the route's round trip.
			prefetchSearchResults(queryClient, readResultsPress(href, readFreshDeviceLocation()), locale);
			void goto(resolve(href as `/doctors?${string}`));
		}
	});

	// The phone's window grows out of the pill that opened it.
	let sheetOrigin = $state<ModalOrigin | undefined>();
	function openSheet(event: MouseEvent) {
		sheetOrigin = layoutOf(event.currentTarget as Element);
		search.open('sheet', 'what');
	}

	// The bar's small pill writes what the search holds (U-23.2), part by part.
	$effect(() => {
		if (!dock) return;
		const [what, where, when] = bar.segments.map((segment) => segment.value);
		dock.summary = { what, where, when };
	});

	// What follows the rows (the articles) shows only once they are neither loading nor failed (the application's).
	const rowsSettled = $derived(
		discovery.shownCategory === 'all'
			? !streamed.isWaiting && !streamed.isError
			: !home.isLoading && !home.isError
	);
</script>

<svelte:head>
	<title>{m.home_meta_title({}, messageOptions)}</title>
	<meta name="description" content={m.home_meta_description({}, messageOptions)} />
</svelte:head>

{#snippet barPanel(field: string, context: SearchBarPanelContext)}
	<CriteriaPanel {field} {context} {bar} {lists} {locale} />
{/snippet}

<CriteriaSearchBar
	{dock}
	segments={bar.segments}
	active={bar.active}
	onActiveChange={bar.setActive}
	panel={barPanel}
	submitLabel={m.search_submit({}, messageOptions)}
	panelTitle={m.search_title({}, messageOptions)}
	closeLabel={m.search_close({}, messageOptions)}
	onSubmit={() => search.submitCriteria()}
/>

<SearchCriteria {search} {lists} {locale} sourceLayout={sheetOrigin} />

<div class="container-page">
	<!-- The home's header (U-32.6, the application's `discovery-header`): the phone's pill and the categories. -->
	<DiscoveryHeader
		categories={data.categories}
		selectedCategoryId={discovery.activeCategory}
		onSelectCategory={discovery.selectCategory}
		searchOpen={search.surface === 'sheet'}
		onOpenSearch={openSheet}
		{locale}
	/>

	<div class="flex flex-col gap-6 pt-5 pb-section">
		<Rows
			{discovery}
			{home}
			{streamed}
			sections={data.sections}
			{messageOptions}
			{resultsPath}
			onSignIn={signIn}
		/>
		{#if after && rowsSettled && !discovery.leaving}
			{@render after()}
		{/if}
	</div>
</div>
