import {
	createInfiniteQuery,
	createQuery,
	hashKey,
	useQueryClient,
	type InfiniteData
} from '@tanstack/svelte-query';
import { untrack } from 'svelte';
import { browser } from '$app/environment';
import {
	memberFirstPageQuery,
	searchResultsInfiniteQuery
} from '$modules/search-doctors/api/marketplace/search-results';
import type { ResultsFirstPage } from '$modules/search-doctors/api/results';
import type { SearchDoctorsSearchResults } from '$modules/search-doctors/api/marketplace/search-source';
import { criteriaWithDeviceLocation } from '$modules/search-doctors/lib/device-location';
import { buildSearchResultCard, overlayMemberFees } from '$modules/search-doctors/lib/doctor-card';
import { readSearchResultsTotal } from '$modules/search-doctors/lib/results-count';
import {
	readSearchDoctorsCriteria,
	type SearchDoctorsCriteria
} from '$modules/search-doctors/lib/search-criteria';
import { readSearchDoctorsFilters } from '$modules/search-doctors/lib/search-filters';
import {
	buildSearchDoctorsScope,
	type SearchDoctorsScope
} from '$modules/search-doctors/lib/search-query';
import type { SearchResultCard } from '$modules/search-doctors/types';
import { resolveDeviceLocation } from '$shared/lib/location';
import { readFreshDeviceLocation, rememberDeviceLocation } from '$shared/state/device-location';
import { readQueryState } from '$shared/lib/query-state';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** «Κοντά μου» without a position yet: being read, refused, or not found in time (S-07.3, S-32.2). */
export type NearMeStatus = 'locating' | 'denied' | 'unavailable';

/**
 * What the results show, in the application's order (S-32.3): the position «Κοντά μου» still waits for, the first
 * read, its failure (offline too: a paused read is never «no doctors»), the answered «no doctors», or the cards.
 */
export type SearchResultsView =
	| { status: NearMeStatus }
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'empty' }
	| { status: 'results' };

export type SearchResultsOptions = {
	/** The page's address: the ONLY source of the criteria and the filters (`readSearchDoctorsCriteria`). */
	url: () => URL;
	/** The server's first page, or `null`. */
	firstPage: () => ResultsFirstPage | null;
	/** The server's «now» when it drew the first page (the cache's age of it). */
	serverNow: () => number | null;
	locale: () => SupportedLocale;
	/** 🔴 U-34.4: the reader is a member (known only in the browser, U-80.1 Ε6). */
	member?: () => boolean;
};

/**
 * 🔴 The results' read, the application's `useSearchDoctorsResultsScreen` (S-01.6): the criteria and the filters ONLY
 * from the address (`readSearchDoctorsCriteria`, `readSearchDoctorsFilters`), the scope a search sends, ONE infinite
 * read of five a page (the next one at the list's end, the application's `onEndReached`), the count the first page
 * states (S-32.10: what the list shows, «N+» on a lower bound). The server's first page seeds the read when it was
 * drawn for this very scope. «Κοντά μου» (S-07.3 rule 11, web): the address has no position, so the visit's memory
 * gives it or the RECEIVER's device is asked (10″); until then nothing is searched — never the default Αττική.
 */
export class SearchResultsState {
	/** «Κοντά μου» waits for its position (`null`: it has one, or the search is not «Κοντά μου»). */
	nearMe = $state<NearMeStatus | null>(null);

	// Declared first: the deriveds below read it (lazily, once the constructor has set it).
	readonly #options: SearchResultsOptions;

	/** The page's address, read ONLY here (`readSearchDoctorsCriteria`, `readSearchDoctorsFilters`). */
	readonly criteria: SearchDoctorsCriteria = $derived.by(() =>
		readSearchDoctorsCriteria(this.#options.url().searchParams)
	);
	readonly filters = $derived.by(() => readSearchDoctorsFilters(this.#options.url().searchParams));
	/** The search is «Κοντά μου» (`whereKind=current-location`). */
	readonly isNearMe = $derived(this.criteria.whereSelection?.kind === 'current-location');
	/** The criteria the list searches by, or `null` while «Κοντά μου» has no position. */
	readonly searchCriteria: SearchDoctorsCriteria | null = $derived.by(() =>
		criteriaWithDeviceLocation(this.criteria, readFreshDeviceLocation())
	);
	readonly scope: SearchDoctorsScope | null = $derived(
		this.searchCriteria ? buildSearchDoctorsScope(this.searchCriteria, this.filters) : null
	);

	readonly #query;
	readonly #memberFirst;
	#locateToken = 0;

	constructor(options: SearchResultsOptions) {
		this.#options = options;
		const queryClient = useQueryClient();

		this.#query = createInfiniteQuery(() => {
			const lang = options.locale();
			const scope = this.scope;
			// While «Κοντά μου» waits the read is OFF; its key is the criteria's own (never shown: `view` waits).
			const keyScope = scope ?? buildSearchDoctorsScope(this.criteria, this.filters);
			// U-34.4: a member's next pages come with the cookies, so they need no second read.
			const member = options.member?.() ?? false;
			const base = searchResultsInfiniteQuery(queryClient, keyScope, lang, member);
			// A guest who signs in keeps the pages open: they hold no amount, so they may start a member's read (read again
			// below, once). Never the other way round: a member's pages stay with the member (U-34.4).
			const guestPages = member
				? queryClient.getQueryState<InfiniteData<SearchDoctorsSearchResults, string | undefined>>(
						searchResultsInfiniteQuery(queryClient, keyScope, lang).queryKey
					)
				: undefined;
			const ssr = options.firstPage();
			const serverNow = options.serverNow();
			// NIT-r2-6: the server's page stays the route's data for the whole visit (its query is read untracked), so
			// it seeds only while it is still fresh for this client (its `staleTime`, on the server's clock, D-118):
			// coming back to its address minutes later reads anew, never shows that old page first.
			const staleTime = queryClient.getDefaultOptions().queries?.staleTime;
			const fresh =
				serverNow !== null &&
				(staleTime === 'static' ||
					(typeof staleTime === 'number' && readServerNow() - serverNow < staleTime));
			const seeded =
				fresh && ssr && scope && hashKey([ssr.scope, ssr.lang]) === hashKey([scope, lang]);
			return {
				...base,
				// The app's client reads only in the browser (`enabled: browser`); this read keeps that rule.
				enabled: browser && scope !== null,
				// U-32.1: the read holds the cards' facts (the press's prefetch and the server's page too); their words
				// are built here, in the page's language (`lib/doctor-card`), each on the clock it was read at (D-118).
				select: (data) => ({
					...data,
					pages: data.pages.map((page) => ({
						...page,
						items: page.items.map((card) => buildSearchResultCard(card, lang))
					}))
				}),
				...(guestPages?.data
					? { initialData: guestPages.data, initialDataUpdatedAt: guestPages.dataUpdatedAt }
					: seeded
						? {
								initialData: { pages: [ssr.page], pageParams: [undefined] },
								initialDataUpdatedAt: serverNow ?? undefined
							}
						: {})
			};
		});

		// 🔴 U-34.4: the first page the server (or the press's prefetch) drew for a guest, read ONCE more for a member. A
		// guest asks nothing, and a page that came with the cookies already shows its amounts.
		this.#memberFirst = createQuery(() => {
			const lang = options.locale();
			const scope = this.scope;
			const keyScope = scope ?? buildSearchDoctorsScope(this.criteria, this.filters);
			const first = this.#query.data?.pages[0]?.items ?? [];
			return {
				...memberFirstPageQuery(queryClient, keyScope, lang),
				enabled:
					browser &&
					scope !== null &&
					(options.member?.() ?? false) &&
					first.some((card) => card.fee.kind === 'login'),
				select: (page: { items: Parameters<typeof buildSearchResultCard>[0][] }) =>
					page.items.map((card) => buildSearchResultCard(card, lang))
			};
		});

		// U-34.4: a guest who signs in with more pages open: those were read without the cookies. Once, at the sign-in.
		$effect(() => {
			if (!(options.member?.() ?? false)) return;
			untrack(() => {
				const pages = this.#query.data?.pages ?? [];
				if (pages.slice(1).some((page) => page.items.some((card) => card.fee.kind === 'login')))
					void this.#query.refetch();
			});
		});

		// «Κοντά μου» without a position: the device is asked in the browser (never on the server), once per search.
		$effect(() => {
			const waiting = browser && this.isNearMe && this.searchCriteria === null;
			const status = this.nearMe;
			if (!waiting) {
				if (status !== null) untrack(() => (this.nearMe = null));
				return;
			}
			if (status !== null) return;
			untrack(() => this.#locate());
		});
	}

	/** Reads the device's position (10″); granted ⇒ kept for the visit and searched; else the message. */
	#locate() {
		const token = ++this.#locateToken;
		this.nearMe = 'locating';
		void resolveDeviceLocation().then((result) => {
			if (token !== this.#locateToken) return;
			if (result.status === 'granted') {
				rememberDeviceLocation(result.coords);
				this.nearMe = null;
			} else {
				this.nearMe = result.status;
			}
		});
	}

	/** «Δοκιμάστε ξανά» of a position not found in time: the device is asked again. */
	locateAgain = (): void => {
		this.#locate();
	};

	/** Every card loaded so far, page after page — none while «Κοντά μου» waits. */
	get items(): SearchResultCard[] {
		if (this.scope === null) return [];
		// 🔴 U-34.4: a sign-out takes the amounts at once, whatever a read still holds.
		const member = this.#options.member?.() ? this.#memberFirst.data : undefined;
		return (this.#query.data?.pages ?? []).flatMap((page, index) =>
			index === 0 ? overlayMemberFees(page.items, member) : page.items
		);
	}

	/** The count the list states (S-32.10), «N+» on a lower bound; `null` while unknown. */
	get count(): { total: number | null; totalIsLowerBound: boolean } {
		const first = this.scope === null ? undefined : this.#query.data?.pages[0];
		return readSearchResultsTotal(first, this.items.length);
	}

	get view(): SearchResultsView {
		if (this.isNearMe && this.scope === null) return { status: this.nearMe ?? 'locating' };
		// Every field read each time (a TanStack result notifies only for the fields read, D1 lesson 9).
		const { fetchStatus, isError, isPending } = this.#query;
		const state = readQueryState({ fetchStatus, isError, isPending });
		if (state === 'waiting') return { status: 'loading' };
		// NIT-9 (r1): the server reads nothing (`enabled: browser`): a page drawn there without its first page (a failed
		// read) is still loading — the browser asks it at once — never the error the hydration would replace.
		if (!browser && state === 'unavailable') return { status: 'loading' };
		if (state === 'failed' || state === 'unavailable') {
			// A failed NEXT page keeps the cards; the end of the list offers its own «Δοκιμάστε ξανά».
			return this.items.length > 0 ? { status: 'results' } : { status: 'error' };
		}
		return this.items.length > 0 ? { status: 'results' } : { status: 'empty' };
	}

	get hasNextPage(): boolean {
		return this.scope !== null && Boolean(this.#query.hasNextPage);
	}

	get isFetchingNextPage(): boolean {
		return this.#query.isFetchingNextPage;
	}

	/** The next page failed: the cards stay, the list's end asks for it again. */
	get isNextPageError(): boolean {
		return this.#query.isFetchNextPageError;
	}

	/**
	 * 🔴 MINOR-1 (r1, the live L-3; D2 lesson 7): the next page asked without a network is PAUSED — neither fetching nor
	 * failed — and would stop the list in silence. With cards shown and a page still to come it is the same
	 * «Δοκιμάστε ξανά» as a failure. Every field read each time (D1 lesson 9).
	 */
	get isNextPageUnavailable(): boolean {
		const { fetchStatus, isPending, hasNextPage } = this.#query;
		return (
			!isPending &&
			fetchStatus === 'paused' &&
			this.scope !== null &&
			Boolean(hasNextPage) &&
			this.items.length > 0
		);
	}

	/**
	 * The list's end is in view (the application's `onEndReached`, checked again after every page): one next page at a
	 * time, never while one failed or waits for a network (no loop of calls).
	 */
	loadMore = (): void => {
		if (
			this.hasNextPage &&
			!this.isFetchingNextPage &&
			!this.isNextPageError &&
			!this.isNextPageUnavailable
		)
			void this.#query.fetchNextPage();
	};

	/** «Δοκιμάστε ξανά»: only what failed — the next page, or the whole read. */
	retry = (): void => {
		if (this.items.length > 0) void this.#query.fetchNextPage();
		else void this.#query.refetch();
	};
}
