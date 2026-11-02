<script lang="ts">
	import { untrack } from 'svelte';
	import { hashKey, useQueryClient } from '@tanstack/svelte-query';
	import type { Pathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { recordServerNow } from '$shared/lib/server-clock';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { readFreshDeviceLocation } from '$shared/state/device-location';
	import { getSearchDockOptional } from '$shared/state/search-dock';
	import { SearchSummaryBar } from '$shared/ui/molecules/search-summary-bar';
	import { MapSheet } from '$shared/ui/organisms/map-sheet';
	import type { SearchBarPanelContext } from '$shared/ui/organisms/search-bar';
	import type { ModalOrigin } from '$shared/ui/templates/modal-screen';
	import { prefetchSearchResults } from '$modules/search-doctors/api/results';
	import { criteriaTranslator } from '$modules/search-doctors/lib/criteria-messages';
	import {
		buildEffectiveSearchCriteriaSummary,
		buildSearchResultsNavPill
	} from '$modules/search-doctors/lib/effective-criteria';
	import { buildSearchFiltersLabel } from '$modules/search-doctors/lib/filters-label';
	import { buildSearchResultsCountLabel } from '$modules/search-doctors/lib/results-count';
	import { buildSearchResultsEmptyState } from '$modules/search-doctors/lib/results-empty';
	import { readResultsPress } from '$modules/search-doctors/lib/results-scope';
	import {
		searchResultsHref,
		type SearchCriteriaField,
		type SearchDoctorsCriteria
	} from '$modules/search-doctors/lib/search-criteria';
	import {
		clearSearchDoctorsNarrowingFilters,
		countActiveSearchDoctorsFilters,
		type SearchDoctorsFilters
	} from '$modules/search-doctors/lib/search-filters';
	import { buildSearchDoctorsScope } from '$modules/search-doctors/lib/search-query';
	import SearchCriteria, {
		CriteriaPanel,
		CriteriaSearchBar,
		useCriteriaWiring
	} from '$modules/search-doctors/ui/search-criteria';
	import { useSignIn } from '$modules/search-doctors/ui/search-doctor-card';
	import SearchFilters, { FiltersState } from '$modules/search-doctors/ui/search-filters';
	import Header from '../components/header.svelte';
	import List from '../components/list.svelte';
	import MapPane from '../components/map-pane.svelte';
	import MapSwitch from '../components/map-switch.svelte';
	import MapToggle from '../components/map-toggle.svelte';
	import { ResultsStage } from '../hooks/use-stage.svelte';
	import { SearchResultsState } from '../hooks/use-state.svelte';
	import type { SearchResultsProps } from '../types';

	let { data, legal }: SearchResultsProps = $props();

	const dock = getSearchDockOptional();
	const queryClient = useQueryClient();
	const locale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale });
	const resultsPath = $derived(localizeHref('/doctors', { locale }));
	const localizedHref = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const profileHref = (doctorSlug: string) =>
		`${localizedHref('/doctors')}/${encodeURIComponent(doctorSlug)}`;
	const signIn = useSignIn(() => locale);

	// The cards write «Σήμερα / Αύριο» on the server's clock (D-118), as the home's.
	$effect(() => {
		if (data.serverNow !== null) recordServerNow(data.serverNow);
	});

	const results = new SearchResultsState({
		url: () => page.url,
		firstPage: () => data.firstPage,
		serverNow: () => data.serverNow,
		locale: () => locale
	});
	// The layout's own state (§7.2): the sheet, the switches, the pin, the map from 1128 (U-28.2).
	const stage = new ResultsStage();

	/**
	 * A new results address: the criteria and the filters by the application's names (U-24.2: a link that shares and
	 * steps back — a push, so «back» returns to the previous search). `resolve()` takes the localized path with its
	 * query (SvelteKit's `PathnameWithSearchOrHash`, the route `/doctors` with a search).
	 */
	function navigate(criteria: SearchDoctorsCriteria, filters: SearchDoctorsFilters) {
		const href = searchResultsHref(resultsPath, criteria, filters);
		stage.resetList();
		// D-103 (MINOR-7 of r1): the new first page is asked at the press, not after SvelteKit's round trip — never
		// for the address already shown (NIT-r2-2: its read is on screen).
		prefetchSearchResults(
			queryClient,
			readResultsPress(href, readFreshDeviceLocation(), page.url),
			locale
		);
		void goto(resolve(href as `/doctors?${string}`), { keepFocus: true });
	}

	// 🔴 MINOR-5 (r1): another language of THIS search — the clean address of the readers' criteria and filters (never
	// the raw query: an old link's coordinates stay out, S-07.3 rule 11), for the frame's settings and the legal line.
	// Given while the page is set up (the server's links too), taken back when it goes.
	const resultsIn = (target: SupportedLocale) =>
		searchResultsHref(
			localizeHref('/doctors', { locale: target }),
			results.criteria,
			results.filters
		);
	if (dock) dock.languageHref = resultsIn;
	$effect(() => () => {
		if (dock?.languageHref === resultsIn) dock.languageHref = null;
	});

	// 🔴 S-07.3 rule 11 (web): an old link with the device's coordinates becomes the clean address at once — the same
	// criteria and filters without them (the history keeps no position; the reader's own device is asked instead).
	$effect(() => {
		const params = page.url.searchParams;
		if (!params.has('whereLat') && !params.has('whereLng')) return;
		const href = untrack(() => searchResultsHref(resultsPath, results.criteria, results.filters));
		void goto(resolve(href as `/doctors?${string}`), {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	});

	// ---- the search (D2's ONE state: the phone's window, the bar dropped from the top bar's pill from 744) ----
	// A new search keeps the applied filters (the application's `setParams` merge).
	const { search, lists, bar } = useCriteriaWiring({
		locale: () => locale,
		dock,
		onSearch: (criteria) => navigate(criteria, results.filters),
		initialCriteria: () => results.criteria
	});

	// The criteria the search ACTUALLY used (its defaults written), for the phone's pill and the top bar's pill.
	// «Κοντά μου» still without its position is «Κοντά μου», never the default region: the summary reads only the
	// KIND of the «Πού» scope (its point is not written anywhere).
	const summaryScope = $derived(
		results.scope ??
			(results.isNearMe
				? {
						...buildSearchDoctorsScope(results.criteria),
						where: { kind: 'geo' as const, lat: Number.NaN, lng: Number.NaN }
					}
				: buildSearchDoctorsScope(results.criteria))
	);
	const summary = $derived(
		buildEffectiveSearchCriteriaSummary(
			results.criteria,
			summaryScope,
			criteriaTranslator(locale),
			locale
		)
	);
	const navPill = $derived(
		buildSearchResultsNavPill(summary, (parts) =>
			m.results_nav_pill_subtitle(parts, messageOptions)
		)
	);
	$effect(() => {
		if (!dock) return;
		const valueOf = (field: SearchCriteriaField) =>
			summary.find((item) => item.field === field)?.value;
		dock.summary = {
			what: valueOf('what'),
			where: valueOf('where'),
			when: valueOf('availability')
		};
	});

	let sheetOrigin = $state<ModalOrigin | undefined>();
	/**
	 * Opens the search on `field`: the phone's window, or from 744 the bar dropped under the top bar — which gives the
	 * focus back to `trigger` when Escape lifts it (MINOR-8 γ of r1: never to `body`).
	 */
	function openSearch(
		field: SearchCriteriaField = 'what',
		origin?: ModalOrigin,
		trigger: HTMLElement | null = null
	) {
		if (stage.onPhone) {
			sheetOrigin = origin;
			search.open('sheet', field);
			return;
		}
		bar.setActive(field);
		dock?.drop(trigger);
	}
	/** The control pressed now (an empty state's button), the bar's way back for the focus. */
	const pressedControl = () =>
		document.activeElement instanceof HTMLElement ? document.activeElement : null;

	// ---- the filters ----
	let filtersOrigin = $state<ModalOrigin | undefined>();
	const filters = new FiltersState({
		criteria: () => results.searchCriteria,
		initialFilters: () => results.filters,
		locale: () => locale,
		onSubmit: (next) => navigate(results.criteria, next)
	});
	function openFilters(origin?: ModalOrigin) {
		filtersOrigin = origin;
		filters.show();
	}
	const activeFilterCount = $derived(countActiveSearchDoctorsFilters(results.filters));
	const filtersLabel = $derived(buildSearchFiltersLabel(activeFilterCount, locale));

	const view = $derived(results.view);
	const count = $derived(results.count);
	const countLabel = $derived(
		buildSearchResultsCountLabel(count.total, locale, count.totalIsLowerBound)
	);
	const emptyState = $derived(
		view.status === 'empty' && results.scope
			? buildSearchResultsEmptyState(results.filters, results.scope, locale)
			: null
	);

	/** The empty state's one button (S-31.9): drop the filters, widen «Πότε» to any date, or change the search. */
	function onEmptyAction() {
		if (emptyState?.action === 'clear-filters') {
			navigate(results.criteria, clearSearchDoctorsNarrowingFilters(results.filters));
		} else if (emptyState?.action === 'anytime') {
			navigate({ ...results.criteria, availability: 'all' }, results.filters);
		} else {
			openSearch('what', undefined, pressedControl());
		}
	}

	// The map's camera (NIT-8 of r1): fitted once per search, clear of the phone's sheet over it.
	const mapFitKey = $derived(results.scope ? hashKey([results.scope]) : undefined);
</script>

<svelte:head>
	<title>{m.results_title({}, messageOptions)}</title>
</svelte:head>

{#snippet barPanel(field: string, context: SearchBarPanelContext)}
	<CriteriaPanel {field} {context} {bar} {lists} {locale} />
{/snippet}

{#snippet listHeader()}
	<Header
		{view}
		{countLabel}
		{filtersLabel}
		filterCount={activeFilterCount}
		{messageOptions}
		onOpenFilters={openFilters}
	/>
{/snippet}

<!-- From 744 the top bar's pill drops this bar (§7.2, §6.4): the results have no big bar of their own. -->
<CriteriaSearchBar
	{dock}
	inline={false}
	slot="results-search"
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
<SearchFilters {filters} {locale} sourceLayout={filtersOrigin} />

<!-- §7.2 (U-24.4): ONE list and ONE map, placed by CSS per zone. Below 744 the whole screen: the summary bar, the map
     behind and the list in the sheet over it. 744–1127 the list (2 columns, 3 from 950) and the floating switch to
     the map under the top bar. From 1128 (U-28.1) the list left on 2/3 (2 · 3 · 4 columns from 1128 · 1440 · 1920)
     and the map right on 1/3, stuck under the bar; U-28.2: the map over the whole stage (the list, its header and the
     legal line out), or no map and the list on the whole width (3 · 4 · 5) with the floating «Εμφάνιση χάρτη». -->
<div
	bind:this={stage.pageRoot}
	data-slot="results-page"
	data-testid="results-page"
	data-view={view.status}
	data-map-shown={stage.mapShown}
	data-desktop-map={stage.desktopMap}
	class="fixed inset-0 flex flex-col bg-card tablet:static tablet:block tablet:min-h-page"
>
	<div
		bind:this={stage.phoneBar}
		data-slot="results-phone-bar"
		class="relative z-20 shrink-0 bg-card px-gutter-sm py-3 shadow-raised tablet:hidden"
	>
		<SearchSummaryBar
			title={navPill.title}
			subtitle={navPill.subtitle}
			backLabel={m.results_back({}, messageOptions)}
			openLabel={m.search_open({}, messageOptions)}
			{filtersLabel}
			filterCount={activeFilterCount}
			onBack={() => void goto(localizedHref('/'))}
			onOpenSearch={(origin) => openSearch('what', origin)}
			onOpenFilters={openFilters}
			testId="results-summary-bar"
			testIdPrefix="results-summary"
		/>
	</div>

	<div
		data-slot="results-stage"
		class={cn(
			'relative min-h-0 flex-1 tablet:mx-auto tablet:w-full tablet:max-w-page tablet:px-gutter-sm split:px-gutter-md laptop:grid laptop:items-start laptop:gap-6 desktop:px-gutter-lg wide:max-w-wide',
			stage.desktopMap === 'split'
				? 'laptop:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
				: 'laptop:grid-cols-1'
		)}
	>
		<MapSheet
			bind:snap={stage.snap}
			bind:scrollElement={stage.listScroll}
			restoreLabel={m.results_sheet_restore({}, messageOptions)}
			header={listHeader}
			aria-label={m.results_list_label({}, messageOptions)}
			testId="results-sheet"
			class={cn(
				'tablet:pt-6 tablet:pb-section',
				stage.desktopMap === 'expanded' && 'laptop:hidden'
			)}
		>
			<List
				{results}
				{stage}
				{emptyState}
				{messageOptions}
				{profileHref}
				onSignIn={signIn}
				{onEmptyAction}
				onChangeWhere={() => openSearch('where', undefined, pressedControl())}
				{legal}
			/>
		</MapSheet>

		<MapPane
			items={results.items}
			{stage}
			{locale}
			{messageOptions}
			{profileHref}
			fitKey={mapFitKey}
			onSignIn={signIn}
		/>
	</div>

	{#if stage.snap === 'full'}
		<MapSwitch label={m.results_map({}, messageOptions)} onclick={() => void stage.showMap()} />
	{/if}

	<MapToggle
		mapShown={stage.mapShown}
		desktopMap={stage.desktopMap}
		showMapLabel={m.results_show_map({}, messageOptions)}
		showListLabel={m.results_show_list({}, messageOptions)}
		onclick={() => void stage.toggleMap()}
	/>
</div>
