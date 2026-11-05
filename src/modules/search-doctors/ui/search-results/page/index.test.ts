import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusManager, onlineManager } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { resetServerClock } from '$shared/lib/server-clock';
import { createQueryClient, removePersonalQueries } from '$shared/query';
import QueryHarness from '$shared/query/query.harness.svelte';
import { SearchDock } from '$shared/state/search-dock';
import { Session } from '$shared/state/session';
import { prefetchSearchResults, type ResultsPageData } from '$modules/search-doctors/api/results';
import type { SearchDoctorsSearchResults } from '$modules/search-doctors/api/marketplace/search-source';
import type { SearchDoctorsCardFacts } from '$modules/search-doctors/api/marketplace/types';
import { forgetDeviceLocation, readFreshDeviceLocation } from '$shared/state/device-location';
import { readResultsPress } from '$modules/search-doctors/lib/results-scope';
import { readSearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';
import { readSearchDoctorsFilters } from '$modules/search-doctors/lib/search-filters';
import {
	buildSearchDoctorsScope,
	type SearchDoctorsScope
} from '$modules/search-doctors/lib/search-query';
import SearchResults from './index.svelte';
import AppClientHarness from './search-results.harness.svelte';

// The results' reads: stand-ins, so the page never calls out of the test.
const { fetchSearchResults } = vi.hoisted(() => ({ fetchSearchResults: vi.fn() }));
vi.mock('$modules/search-doctors/api/marketplace/search-source', () => ({ fetchSearchResults }));
const { fetchFilterFacets } = vi.hoisted(() => ({ fetchFilterFacets: vi.fn() }));
vi.mock('$modules/search-doctors/api/marketplace/facets-source', () => ({ fetchFilterFacets }));
const { getFacets, getDoctorSuggestions, getLocationSuggestions } = vi.hoisted(() => ({
	getFacets: vi.fn(),
	getDoctorSuggestions: vi.fn(),
	getLocationSuggestions: vi.fn()
}));
vi.mock('$modules/search-doctors/api/marketplace/endpoints', async (importOriginal) => ({
	...(await importOriginal<typeof import('$modules/search-doctors/api/marketplace/endpoints')>()),
	getFacets,
	getDoctorSuggestions,
	getLocationSuggestions
}));
// The device's position («Κοντά μου»): a stand-in, never the browser's.
const { resolveDeviceLocation } = vi.hoisted(() => ({ resolveDeviceLocation: vi.fn() }));
vi.mock('$shared/lib/location', async (importOriginal) => ({
	...(await importOriginal<typeof import('$shared/lib/location')>()),
	resolveDeviceLocation
}));

// U-32.1: a page holds the cards' FACTS (the api's answer); the page writes them — «Καρδιολόγος · Αμπελόκηποι»,
// «Σήμερα · 17:30» (read on Saturday 24 October 2026, 12:00 in Athens), the guest's «Συνδεθείτε για κόστος», «4,8»,
// «Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι», 12 reviews, the point and no pin price.
const card = (
	id: string,
	overrides: Partial<SearchDoctorsCardFacts> = {}
): SearchDoctorsCardFacts => ({
	id,
	doctorSlug: `dr-${id}`,
	name: `Γιατρός ${id}`,
	professionalName: 'Καρδιολόγος',
	imageUrl: null,
	office: {
		city: 'Αμπελόκηποι',
		street: 'Λεωφόρος Αλεξάνδρας',
		streetNumber: '112',
		distanceKm: null
	},
	point: { latitude: 37.99, longitude: 23.76 },
	description: 'Περιγραφή',
	availability: {
		nextAvailableAt: '2026-10-24T17:30:00+03:00',
		hasToday: true,
		hasNext3Days: true
	},
	rating: 4.8,
	reviewCount: 12,
	pricingVisible: false,
	primaryServicePrice: null,
	readAt: Date.parse('2026-10-24T12:00:00+03:00'),
	...overrides
});

const pageOf = (
	items: SearchDoctorsCardFacts[],
	overrides: Partial<SearchDoctorsSearchResults> = {}
): SearchDoctorsSearchResults => ({
	total: items.length,
	totalIsLowerBound: false,
	items,
	nextCursor: null,
	hasNextPage: false,
	...overrides
});

const CARDIOLOGY =
	'what=Καρδιολόγος&whatKind=professional&whatId=p1&whatSlug=kardiologos&whatLabel=Καρδιολόγος';
const NEAR_ME = 'where=Κοντά μου&whereKind=current-location&whereLabel=Κοντά μου';

function visit(search: string) {
	(page as { url: URL }).url = new URL(`http://localhost/doctors?${search}`);
}

/** The scope the page builds for an address (what the server's first page carries). */
function scopeOf(search: string): SearchDoctorsScope {
	const params = new URLSearchParams(search);
	return buildSearchDoctorsScope(
		readSearchDoctorsCriteria(params),
		readSearchDoctorsFilters(params)
	);
}

function renderResults(data: ResultsPageData = { firstPage: null, serverNow: null }) {
	return render(QueryHarness, { props: { component: SearchResults, props: { data } } });
}

const user = () => userEvent.setup({ delay: null });

type Observed = { callback: IntersectionObserverCallback; node: Element };
let observed: Observed[] = [];

beforeEach(() => {
	observed = [];
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(private callback: IntersectionObserverCallback) {}
			observe(node: Element) {
				observed.push({ callback: this.callback, node });
			}
			disconnect() {}
			unobserve() {}
			takeRecords() {
				return [];
			}
		}
	);
	fetchSearchResults.mockResolvedValue(pageOf([]));
	resolveDeviceLocation.mockReturnValue(new Promise(() => {}));
	getFacets.mockResolvedValue({ facets: { services: [] }, pricingVisible: false });
	getLocationSuggestions.mockResolvedValue({ items: [], language: 'el' });
	fetchFilterFacets.mockResolvedValue({
		facets: {
			paymentOptions: [{ value: 'CASH', label: 'Cash', count: 10 }],
			services: [],
			speakLanguages: [],
			priceRange: null
		},
		pricingVisible: false
	});
});

afterEach(() => {
	// The page first (a mounted page would react to the resets below).
	cleanup();
	vi.unstubAllGlobals();
	onlineManager.setOnline(true);
	fetchSearchResults.mockReset();
	fetchFilterFacets.mockReset();
	resolveDeviceLocation.mockReset();
	forgetDeviceLocation();
	// A page drawn «20″/31″ ago» leaves its reading of the server's clock: the next test starts on this device's.
	resetServerClock();
	visit('');
});

describe('search-doctors::ui::search-results', () => {
	const memberSession = () =>
		new Session({
			status: () => 'member',
			member: () => ({ firstName: null }),
			signOut: async () => {}
		});
	const firstPageOf = (cards: SearchDoctorsCardFacts[]) => ({
		firstPage: { scope: scopeOf(CARDIOLOGY), lang: 'el', page: pageOf(cards, { total: 2 }) },
		serverNow: Date.now()
	});

	it('🔴 U-34.4: a guest keeps the server’s anonymous page, with NO second read', async () => {
		visit(CARDIOLOGY);
		render(AppClientHarness, { props: { data: firstPageOf([card('a')]) } });
		expect(await screen.findByTestId('results-card')).toHaveTextContent('Συνδεθείτε για κόστος');
		// U-99.2 (negative): the room is the home's alone.
		expect(document.querySelector('[data-slot$="-price-room"]')).toBeNull();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(fetchSearchResults).not.toHaveBeenCalled();
	});

	it('🔴 U-34.4: a member reads the first page ONCE with the session, and only the fee changes', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(
			pageOf([card('a', { pricingVisible: true, primaryServicePrice: 60 })], { total: 2 })
		);
		render(AppClientHarness, {
			props: { data: firstPageOf([card('a'), card('b')]), session: memberSession() }
		});
		await waitFor(() => expect(fetchSearchResults).toHaveBeenCalledTimes(1));
		const [, , , request, context] = fetchSearchResults.mock.calls[0];
		expect(request).toEqual({ limit: 5 });
		expect(context).toMatchObject({ withSession: true });
		const cards = () => screen.getAllByTestId('results-card');
		await waitFor(() => expect(cards()[0]).toHaveTextContent('60'));
		// A card the read did not bring keeps its words; the page's cards stay where they were.
		expect(cards()).toHaveLength(2);
		expect(cards()[1]).toHaveTextContent('Συνδεθείτε για κόστος');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(fetchSearchResults).toHaveBeenCalledTimes(1);
	});

	/** A session the test can end or start while the page is on the screen. */
	const liveSession = (start: 'guest' | 'member') => {
		const state = new SvelteMap([['status', start]]);
		return {
			session: new Session({
				status: () => state.get('status') as 'guest' | 'member',
				member: () => (state.get('status') === 'member' ? { firstName: null } : null),
				signOut: async () => {}
			}),
			become: (status: 'guest' | 'member') => state.set('status', status)
		};
	};
	const priced = { pricingVisible: true, primaryServicePrice: 60 };
	const reachEnd = () =>
		observed
			.filter(({ node }) => node.getAttribute('data-slot') === 'results-next')
			.at(-1)
			?.callback(
				[{ isIntersecting: true } as IntersectionObserverEntry],
				{} as IntersectionObserver
			);

	it('🔴 U-34.4: a sign-out takes the amount of the first page at once, and asks nothing with the cookies', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a', priced)]));
		const { session, become } = liveSession('member');
		render(AppClientHarness, { props: { data: firstPageOf([card('a')]), session } });
		await waitFor(() => expect(screen.getByTestId('results-card')).toHaveTextContent('60'));
		fetchSearchResults.mockClear();
		become('guest');
		await waitFor(() =>
			expect(screen.getByTestId('results-card')).toHaveTextContent('Συνδεθείτε για κόστος')
		);
		expect(screen.getByTestId('results-card')).not.toHaveTextContent('60');
		for (const [, , , , context] of fetchSearchResults.mock.calls) {
			expect(context?.withSession).toBeUndefined();
		}
	});

	it('🔴 U-34.4: the next pages a member read with the cookies do not stay either: their key is the member’s, and it goes', async () => {
		visit(CARDIOLOGY);
		const client = createQueryClient();
		fetchSearchResults.mockImplementation(async (_client, _scope, _lang, request, context) => {
			const amounts = context?.withSession ? priced : {};
			return request.cursor
				? pageOf([card('b', amounts)], { total: 2 })
				: pageOf([card('a', amounts)], { total: 2, hasNextPage: true, nextCursor: 'c2' });
		});
		const { session, become } = liveSession('member');
		render(AppClientHarness, {
			props: { data: { firstPage: null, serverNow: null }, session, client }
		});
		await waitFor(() => expect(screen.getAllByTestId('results-card')[0]).toHaveTextContent('60'));
		reachEnd();
		await waitFor(() => expect(screen.getAllByTestId('results-card')).toHaveLength(2));
		expect(screen.getAllByTestId('results-card')[1]).toHaveTextContent('60');
		become('guest');
		removePersonalQueries(client);
		await waitFor(() =>
			expect(screen.getAllByTestId('results-card')[0]).toHaveTextContent('Συνδεθείτε για κόστος')
		);
		for (const result of screen.getAllByTestId('results-card')) {
			expect(result).not.toHaveTextContent('60');
		}
		const heldForMember = client
			.getQueryCache()
			.getAll()
			.filter((query) => String(query.queryKey.at(-1)).startsWith('member'))
			.filter((query) => query.state.data !== undefined);
		expect(heldForMember).toEqual([]);
	});

	it('🔴 U-34.4: a guest who signs in with more pages open keeps them, each read once more with the cookies', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockImplementation(async (_client, _scope, _lang, request, context) => {
			const amounts = context?.withSession ? priced : {};
			return request.cursor
				? pageOf([card('b', amounts)], { total: 2 })
				: pageOf([card('a', amounts)], { total: 2, hasNextPage: true, nextCursor: 'c2' });
		});
		const { session, become } = liveSession('guest');
		render(AppClientHarness, { props: { data: { firstPage: null, serverNow: null }, session } });
		await screen.findByTestId('results-card');
		reachEnd();
		await waitFor(() => expect(screen.getAllByTestId('results-card')).toHaveLength(2));
		become('member');
		// The list never falls back to one page on the way.
		await waitFor(() => expect(screen.getAllByTestId('results-card')[1]).toHaveTextContent('60'));
		expect(screen.getAllByTestId('results-card')).toHaveLength(2);
		expect(screen.getAllByTestId('results-card')[0]).toHaveTextContent('60');
	});

	it('🔴 R-7: the first page’s read for the amounts (`member-first`) is ONE: coming back to the tab or to the network past its minute does not ask it again', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a', priced)]));
		render(AppClientHarness, {
			props: { data: firstPageOf([card('a')]), session: memberSession() }
		});
		await waitFor(() => expect(fetchSearchResults).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(screen.getByTestId('results-card')).toHaveTextContent('60'));
		const reads = () =>
			fetchSearchResults.mock.calls.filter(
				([, , , request, context]) => context?.withSession && !('cursor' in request)
			);
		expect(reads()).toHaveLength(1);
		const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
		focusManager.setFocused(false);
		focusManager.setFocused(true);
		onlineManager.setOnline(false);
		onlineManager.setOnline(true);
		await new Promise((resolve) => setTimeout(resolve, 20));
		focusManager.setFocused(undefined);
		clock.mockRestore();
		expect(reads()).toHaveLength(1);
	});

	it('U-34.4: a member’s failed read leaves the page’s words, never an error', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockRejectedValue(new Error('down'));
		render(AppClientHarness, {
			props: { data: firstPageOf([card('a')]), session: memberSession() }
		});
		await waitFor(() => expect(fetchSearchResults).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(screen.getByTestId('results-card')).toHaveTextContent('Συνδεθείτε για κόστος');
	});

	it('§7.3 / S-32.10: the server’s first page shows at once — «Βρέθηκαν N γιατροί» on top, nothing under it, the list cards; no second read', async () => {
		visit(CARDIOLOGY);
		render(AppClientHarness, {
			props: {
				data: {
					firstPage: {
						scope: scopeOf(CARDIOLOGY),
						lang: 'el',
						page: pageOf([card('a'), card('b')], { total: 12 })
					},
					serverNow: Date.now()
				}
			}
		});
		expect(await screen.findByTestId('results-count')).toHaveTextContent('Βρέθηκαν 12 γιατροί');
		const header = document.querySelector('[data-slot="results-header"]') as HTMLElement;
		expect(header.nextElementSibling).toHaveAttribute('data-slot', 'results-list');
		expect(screen.getAllByTestId('results-card')).toHaveLength(2);
		for (const result of screen.getAllByTestId('results-card'))
			expect(result).toHaveAttribute('data-variant', 'list');
		expect(fetchSearchResults).not.toHaveBeenCalled();
		// U-24.2: no chips, no «Εφαρμοσμένα κριτήρια» anywhere.
		expect(screen.queryByText('Εφαρμοσμένα κριτήρια')).toBeNull();
	});

	it('S-34.6: a cut count reads «N+», always plural', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(
			pageOf([card('a')], {
				total: 186,
				totalIsLowerBound: true,
				hasNextPage: true,
				nextCursor: 'c2'
			})
		);
		renderResults();
		expect(await screen.findByTestId('results-count')).toHaveTextContent('Βρέθηκαν 186+ γιατροί');
	});

	it('S-01.6 (app = web): the page reads its criteria and filters from the address, by the application’s names, five a page', async () => {
		visit(`${CARDIOLOGY}&gender=FEMALE&paymentOptions=CASH,CARD&disabilityAccess=true`);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		renderResults();
		await screen.findByTestId('results-count');
		const [, scope, lang, request] = fetchSearchResults.mock.calls[0];
		expect(lang).toBe('el');
		expect(request).toEqual({ cursor: undefined, limit: 5 });
		expect(scope.what).toEqual({
			kind: 'professional',
			professionalId: 'p1',
			professionalSlug: 'kardiologos'
		});
		expect(scope.filters).toMatchObject({
			gender: 'FEMALE',
			paymentOptions: ['CASH', 'CARD'],
			disabilityAccess: true
		});
	});

	it('§7.7: the first read shows the breathing 4:3 skeletons and the count’s skeleton; the map has no pin yet', () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockReturnValue(new Promise(() => {}));
		renderResults();
		expect(screen.getByTestId('results-count-skeleton')).toBeInTheDocument();
		expect(document.querySelectorAll('[data-slot="results-card-skeleton"]')).toHaveLength(4);
		expect(document.querySelector('[data-slot="map-price-pin"]')).toBeNull();
		expect(screen.getByTestId('results-page')).toHaveAttribute('data-view', 'loading');
	});

	it('§7.7 / D2 lesson 7: a failed read is the error with «Δοκιμάστε ξανά» — the retry asks only it again', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockImplementationOnce(async () => {
			throw new Error('down');
		});
		renderResults();
		const error = await screen.findByTestId('results-error');
		expect(error).toHaveTextContent('Δεν μπορέσαμε να εκτελέσουμε την αναζήτηση');
		expect(error).toHaveTextContent(
			'Η αναζήτηση γιατρών δεν μπόρεσε να ολοκληρωθεί αυτή τη στιγμή. Δοκιμάστε ξανά.'
		);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		await user().click(within(error).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(await screen.findByTestId('results-count')).toHaveTextContent('Βρέθηκε 1 γιατρός');
	});

	it('§7.7 (negative): offline the read is paused — the error with «Δοκιμάστε ξανά», never «Καμία ακριβής αντιστοιχία»', async () => {
		visit(CARDIOLOGY);
		onlineManager.setOnline(false);
		fetchSearchResults.mockResolvedValue(pageOf([]));
		renderResults();
		expect(await screen.findByTestId('results-error')).toBeInTheDocument();
		expect(screen.queryByTestId('results-empty')).toBeNull();
	});

	it('S-31.9 / S-32.3: no doctors ⇒ the application’s words and ONE outlined button — the filters first', async () => {
		visit(`${CARDIOLOGY}&gender=FEMALE`);
		fetchSearchResults.mockResolvedValue(pageOf([], { total: 0 }));
		renderResults();
		const empty = await screen.findByTestId('results-empty');
		expect(empty).toHaveTextContent('Καμία ακριβής αντιστοιχία');
		expect(empty).toHaveTextContent('Δοκιμάστε να αφαιρέσετε κάποια φίλτρα.');
		await user().click(within(empty).getByRole('button', { name: 'Εκκαθάριση φίλτρων' }));
		const href = vi.mocked(goto).mock.calls.at(-1)?.[0] as string;
		expect(href).toContain('whatSlug=kardiologos');
		expect(href).not.toContain('gender');
	});

	it('S-32.2 (web): a «Κοντά μου» link without a position never searches Αττική — the device is asked, the list searches its point', async () => {
		visit(NEAR_ME);
		let answer!: (value: unknown) => void;
		resolveDeviceLocation.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		renderResults();
		await waitFor(() => expect(resolveDeviceLocation).toHaveBeenCalledOnce());
		expect(fetchSearchResults).not.toHaveBeenCalled();
		expect(screen.getByTestId('results-page')).toHaveAttribute('data-view', 'locating');
		answer({ status: 'granted', coords: { latitude: 37.943, longitude: 23.647 } });
		await screen.findByTestId('results-count');
		for (const [, scope] of fetchSearchResults.mock.calls)
			expect(scope.where).toEqual({ kind: 'geo', lat: 37.943, lng: 23.647 });
		// The phone's pill says «Κοντά μου», never the default region.
		expect(screen.getByTestId('results-summary-pill')).toHaveTextContent('Κοντά μου');
		expect(screen.getByTestId('results-summary-pill')).not.toHaveTextContent('Αττική');
	});

	it('S-32.2 (web, negative): a refused position ⇒ the message and «Αλλαγή αναζήτησης»; nothing searched, not even the filters’ count', async () => {
		visit(NEAR_ME);
		resolveDeviceLocation.mockResolvedValue({ status: 'denied', canAskAgain: false });
		renderResults();
		const denied = await screen.findByTestId('results-location-denied');
		expect(denied).toHaveTextContent('Δεν δώσατε πρόσβαση στην τοποθεσία.');
		expect(within(denied).getByRole('button', { name: 'Αλλαγή αναζήτησης' })).toBeInTheDocument();
		await user().click(screen.getByTestId('results-summary-filter'));
		await screen.findByTestId('search-filter-modal');
		await new Promise((resolve) => setTimeout(resolve, 400));
		expect(fetchSearchResults).not.toHaveBeenCalled();
		expect(fetchFilterFacets).not.toHaveBeenCalled();
	});

	it('S-07.3 (κανόνας 11, web): an old link with coordinates becomes the clean address at once — the same search, no position', async () => {
		visit(`${NEAR_ME}&whereLat=37.943&whereLng=23.647&gender=MALE`);
		resolveDeviceLocation.mockReturnValue(new Promise(() => {}));
		renderResults();
		await waitFor(() => expect(goto).toHaveBeenCalled());
		const [href, options] = vi.mocked(goto).mock.calls[0] as [string, Record<string, unknown>];
		expect(href).toContain('whereKind=current-location');
		expect(href).toContain('gender=MALE');
		expect(href).not.toMatch(/whereLat|whereLng|37\.943/);
		expect(options).toMatchObject({ replaceState: true });
		expect(fetchSearchResults).not.toHaveBeenCalled();
	});

	it('D-103: the next page is asked when the list’s end comes into view (the application’s `onEndReached`)', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValueOnce(
			pageOf([card('a'), card('b')], { total: 4, hasNextPage: true, nextCursor: 'c2' })
		);
		fetchSearchResults.mockResolvedValueOnce(pageOf([card('c'), card('d')], { total: 4 }));
		renderResults();
		await screen.findByTestId('results-count');
		const end = observed.find(({ node }) => node.getAttribute('data-slot') === 'results-next');
		expect(end).toBeDefined();
		end?.callback(
			[{ isIntersecting: true } as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
		await waitFor(() => expect(screen.getAllByTestId('results-card')).toHaveLength(4));
		expect(fetchSearchResults.mock.calls[1][3]).toEqual({ cursor: 'c2', limit: 5 });
		expect(document.querySelector('[data-slot="results-next"]')).toBeNull();
	});

	// 🔴 MAJOR-2 (r1): an observer tells only when the end CROSSES its edge; on a tall screen the end stays in view
	// after a page and r0's list stopped at ten cards.
	it('D-103 / S-01.6 (app = web): an end still in view after a page asks the next one again — page 3 without a second notification', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults
			.mockResolvedValueOnce(
				pageOf([card('a'), card('b')], { total: 6, hasNextPage: true, nextCursor: 'c2' })
			)
			.mockResolvedValueOnce(
				pageOf([card('c'), card('d')], { total: 6, hasNextPage: true, nextCursor: 'c3' })
			)
			.mockResolvedValueOnce(pageOf([card('e'), card('f')], { total: 6 }));
		renderResults();
		await screen.findByTestId('results-count');
		const ends = () =>
			observed.filter(({ node }) => node.getAttribute('data-slot') === 'results-next');
		ends()[0]?.callback(
			[{ isIntersecting: true } as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
		await waitFor(() => expect(screen.getAllByTestId('results-card')).toHaveLength(6));
		expect(fetchSearchResults.mock.calls.map((call) => call[3])).toEqual([
			{ cursor: undefined, limit: 5 },
			{ cursor: 'c2', limit: 5 },
			{ cursor: 'c3', limit: 5 }
		]);
		// ONE end observed the whole time, told once.
		expect(ends()).toHaveLength(1);
	});

	it('D-103 / S-01.6 (negative, MAJOR-2 of r1): an end out of view asks nothing — neither at first nor after the page it asked', async () => {
		visit(CARDIOLOGY);
		let answerPage2!: (page: SearchDoctorsSearchResults) => void;
		fetchSearchResults
			.mockResolvedValueOnce(
				pageOf([card('a'), card('b')], { total: 6, hasNextPage: true, nextCursor: 'c2' })
			)
			.mockImplementationOnce(() => new Promise((resolve) => (answerPage2 = resolve)))
			.mockResolvedValue(pageOf([card('e'), card('f')], { total: 6 }));
		renderResults();
		await screen.findByTestId('results-count');
		const end = observed.find(({ node }) => node.getAttribute('data-slot') === 'results-next');
		const tell = (isIntersecting: boolean) =>
			end?.callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
		tell(false);
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(fetchSearchResults).toHaveBeenCalledTimes(1);
		tell(true);
		await waitFor(() => expect(fetchSearchResults).toHaveBeenCalledTimes(2));
		// Scrolled away while page 2 loads: it arrives with a page 3 to come, which is not asked.
		tell(false);
		answerPage2(pageOf([card('c'), card('d')], { total: 6, hasNextPage: true, nextCursor: 'c3' }));
		await waitFor(() => expect(screen.getAllByTestId('results-card')).toHaveLength(4));
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(fetchSearchResults).toHaveBeenCalledTimes(2);
	});

	it('§7.7 / D2 lesson 7 (MINOR-9.4 of r1): a failed next page keeps the cards and offers «Δοκιμάστε ξανά» — no loop; the retry asks only its cursor, its skeleton first', async () => {
		visit(CARDIOLOGY);
		let answerRetry!: (page: SearchDoctorsSearchResults) => void;
		fetchSearchResults
			.mockResolvedValueOnce(
				pageOf([card('a'), card('b')], { total: 4, hasNextPage: true, nextCursor: 'c2' })
			)
			.mockImplementationOnce(async () => {
				throw new Error('down');
			})
			.mockImplementationOnce(() => new Promise((resolve) => (answerRetry = resolve)));
		renderResults();
		await screen.findByTestId('results-count');
		observed
			.find(({ node }) => node.getAttribute('data-slot') === 'results-next')
			?.callback(
				[{ isIntersecting: true } as IntersectionObserverEntry],
				{} as IntersectionObserver
			);
		const retry = await screen.findByTestId('results-next-retry');
		expect(screen.getAllByTestId('results-card')).toHaveLength(2);
		expect(screen.queryByTestId('results-error')).toBeNull();
		// (negative) no loop of calls while it failed, the end still in view
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(fetchSearchResults).toHaveBeenCalledTimes(2);
		await user().click(retry);
		expect(fetchSearchResults).toHaveBeenCalledTimes(3);
		expect(fetchSearchResults.mock.calls[2][3]).toEqual({ cursor: 'c2', limit: 5 });
		// «Επιπλέον» (r1): while the retry runs the skeleton shows, not the button (the failure is still recorded).
		await waitFor(() => expect(screen.queryByTestId('results-next-retry')).toBeNull());
		expect(
			document.querySelector('[data-slot="results-next"] [data-slot="results-skeleton"]')
		).not.toBeNull();
		answerRetry(pageOf([card('c'), card('d')], { total: 4 }));
		await waitFor(() => expect(screen.getAllByTestId('results-card')).toHaveLength(4));
		expect(screen.queryByTestId('results-next-retry')).toBeNull();
	});

	it('§7.7 / D2 lesson 7 (MINOR-1 of r1): a next page asked without a network is «Δοκιμάστε ξανά» at the list’s end, the cards kept — never a silent stop', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults
			.mockResolvedValueOnce(
				pageOf([card('a'), card('b')], { total: 4, hasNextPage: true, nextCursor: 'c2' })
			)
			.mockResolvedValue(pageOf([card('c'), card('d')], { total: 4 }));
		renderResults();
		await screen.findByTestId('results-count');
		onlineManager.setOnline(false);
		observed
			.find(({ node }) => node.getAttribute('data-slot') === 'results-next')
			?.callback(
				[{ isIntersecting: true } as IntersectionObserverEntry],
				{} as IntersectionObserver
			);
		expect(await screen.findByTestId('results-next-retry')).toBeInTheDocument();
		expect(screen.getAllByTestId('results-card')).toHaveLength(2);
		// (negative) a paused page is not asked again and again
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(fetchSearchResults).toHaveBeenCalledTimes(1);
		// Back online, the paused page goes on by itself: the cards, no button.
		onlineManager.setOnline(true);
		await waitFor(() => expect(screen.getAllByTestId('results-card')).toHaveLength(4));
		expect(screen.queryByTestId('results-next-retry')).toBeNull();
	});

	it('§7.7 (negative, MINOR-1 of r1): online the next page simply comes — no «Δοκιμάστε ξανά» at any moment', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults
			.mockResolvedValueOnce(
				pageOf([card('a'), card('b')], { total: 4, hasNextPage: true, nextCursor: 'c2' })
			)
			.mockResolvedValue(pageOf([card('c'), card('d')], { total: 4 }));
		renderResults();
		await screen.findByTestId('results-count');
		observed
			.find(({ node }) => node.getAttribute('data-slot') === 'results-next')
			?.callback(
				[{ isIntersecting: true } as IntersectionObserverEntry],
				{} as IntersectionObserver
			);
		expect(screen.queryByTestId('results-next-retry')).toBeNull();
		await waitFor(() => expect(screen.getAllByTestId('results-card')).toHaveLength(4));
		expect(screen.queryByTestId('results-next-retry')).toBeNull();
	});

	it('S-32.10 (negative, NIT-r2-6): a server page older than the client’s 30″ is never shown first — the page reads its address anew, once', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('z')], { total: 1 }));
		render(AppClientHarness, {
			props: {
				data: {
					firstPage: {
						scope: scopeOf(CARDIOLOGY),
						lang: 'el',
						page: pageOf([card('a'), card('b')], { total: 12 })
					},
					serverNow: Date.now() - 31_000
				}
			}
		});
		expect(screen.queryByText('Γιατρός a')).toBeNull();
		expect(await screen.findByTestId('results-count')).toHaveTextContent('Βρέθηκε 1 γιατρός');
		expect(screen.getAllByTestId('results-card')).toHaveLength(1);
		expect(fetchSearchResults).toHaveBeenCalledTimes(1);
	});

	it('S-32.10 (NIT-r2-6): a server page still fresh (drawn 20″ ago, inside the 30″) seeds the list — no read', async () => {
		visit(CARDIOLOGY);
		render(AppClientHarness, {
			props: {
				data: {
					firstPage: {
						scope: scopeOf(CARDIOLOGY),
						lang: 'el',
						page: pageOf([card('a'), card('b')], { total: 12 })
					},
					serverNow: Date.now() - 20_000
				}
			}
		});
		expect(await screen.findByTestId('results-count')).toHaveTextContent('Βρέθηκαν 12 γιατροί');
		expect(screen.getAllByTestId('results-card')).toHaveLength(2);
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(fetchSearchResults).not.toHaveBeenCalled();
	});

	it('S-32.10 (negative, MINOR-9.2 of r1): a server page drawn for ANOTHER address is never shown — the page reads its own, once', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('z')], { total: 1 }));
		render(AppClientHarness, {
			props: {
				data: {
					firstPage: {
						scope: scopeOf(`${CARDIOLOGY}&gender=FEMALE`),
						lang: 'el',
						page: pageOf([card('a'), card('b')], { total: 12 })
					},
					serverNow: Date.now()
				}
			}
		});
		expect(await screen.findByTestId('results-count')).toHaveTextContent('Βρέθηκε 1 γιατρός');
		expect(screen.getAllByTestId('results-card')).toHaveLength(1);
		expect(screen.queryByText('Γιατρός a')).toBeNull();
		expect(fetchSearchResults).toHaveBeenCalledTimes(1);
		expect(fetchSearchResults.mock.calls[0][1]).toEqual(scopeOf(CARDIOLOGY));
	});

	it('D-103 (MINOR-7 of r1): «Εμφάνιση N γιατρών» asks the new first page AT THE PRESS — the route still on its way', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')], { total: 7 }));
		renderResults();
		await screen.findByTestId('results-count');
		await user().click(screen.getByTestId('results-filters-pill'));
		const dialog = await screen.findByTestId('search-filter-modal');
		await user().click(await within(dialog).findByTestId('search-filter-payment-CASH'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('search-filter-apply')).toHaveTextContent(
				'Εμφάνιση 7 γιατρών'
			)
		);
		vi.mocked(goto).mockImplementationOnce(() => new Promise(() => {}));
		const before = fetchSearchResults.mock.calls.length;
		await user().click(within(dialog).getByTestId('search-filter-apply'));
		const href = vi.mocked(goto).mock.calls.at(-1)?.[0] as string;
		// The list's reads (five a page): the filters' live count (one card) is not this read.
		const asked = fetchSearchResults.mock.calls
			.slice(before)
			.filter((call) => call[3]?.limit === 5);
		expect(asked).toHaveLength(1);
		const [, scope, lang, request] = asked[0];
		expect(scope).toEqual(scopeOf(href.slice(href.indexOf('?') + 1)));
		expect(scope.filters).toMatchObject({ paymentOptions: ['CASH'] });
		expect(lang).toBe('el');
		expect(request).toEqual({ cursor: undefined, limit: 5 });
	});

	it('D-103 (NIT-r2-2): «Εμφάνιση N γιατρών» with the filters unchanged goes to the address already shown — no prefetch, its read is on screen', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')], { total: 7 }));
		renderResults();
		await screen.findByTestId('results-count');
		await user().click(screen.getByTestId('results-filters-pill'));
		const dialog = await screen.findByTestId('search-filter-modal');
		await waitFor(() =>
			expect(within(dialog).getByTestId('search-filter-apply')).toHaveTextContent(
				'Εμφάνιση 7 γιατρών'
			)
		);
		const before = fetchSearchResults.mock.calls.length;
		await user().click(within(dialog).getByTestId('search-filter-apply'));
		expect(vi.mocked(goto)).toHaveBeenCalled();
		const asked = fetchSearchResults.mock.calls
			.slice(before)
			.filter((call) => call[3]?.limit === 5);
		expect(asked).toHaveLength(0);
	});

	it('D-103 (negative, MINOR-7 of r1): the page the press went to reads the same key — ONE call for it, never a second', async () => {
		const search = `${CARDIOLOGY}&gender=FEMALE`;
		fetchSearchResults.mockResolvedValue(pageOf([card('a')], { total: 1 }));
		const client = createQueryClient();
		prefetchSearchResults(
			client,
			readResultsPress(`/doctors?${search}`, readFreshDeviceLocation()),
			'el'
		);
		visit(search);
		render(AppClientHarness, { props: { data: { firstPage: null, serverNow: null }, client } });
		expect(await screen.findByTestId('results-count')).toHaveTextContent('Βρέθηκε 1 γιατρός');
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(fetchSearchResults).toHaveBeenCalledTimes(1);
		expect(fetchSearchResults.mock.calls[0][1]).toEqual(scopeOf(search));
	});

	it('D-103 (negative, MINOR-7 of r1): «Κοντά μου» without this visit’s position prefetches nothing — never the default Αττική', async () => {
		const client = createQueryClient();
		prefetchSearchResults(
			client,
			readResultsPress(`/doctors?${NEAR_ME}`, readFreshDeviceLocation()),
			'el'
		);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(fetchSearchResults).not.toHaveBeenCalled();
		expect(client.getQueryCache().getAll()).toHaveLength(0);
	});

	it('U-25.1 (MINOR-9.1 of r1): nothing under «Βρέθηκαν N» — no sort on the page; «Ταξινόμηση» lives only in the filters', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')], { total: 3 }));
		renderResults();
		await screen.findByTestId('results-count');
		const header = document.querySelector('[data-slot="results-header"]') as HTMLElement;
		expect(header.nextElementSibling).toHaveAttribute('data-slot', 'results-list');
		// (negative) the page itself carries no sort
		expect(screen.queryByText('Ταξινόμηση')).toBeNull();
		expect(screen.queryByRole('radiogroup')).toBeNull();
		await user().click(screen.getByTestId('results-filters-pill'));
		const dialog = await screen.findByTestId('search-filter-modal');
		const sorts = screen.getAllByText('Ταξινόμηση');
		expect(sorts.length).toBeGreaterThan(0);
		for (const node of sorts) expect(dialog).toContainElement(node);
		for (const group of screen.getAllByRole('radiogroup')) expect(dialog).toContainElement(group);
	});

	it('U-24 (§7.2, MINOR-5 of r1): another language keeps the search — the English address is /en/doctors with the same criteria and filters', async () => {
		visit(`${CARDIOLOGY}&gender=FEMALE`);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		const dock = new SearchDock();
		render(AppClientHarness, { props: { data: { firstPage: null, serverNow: null }, dock } });
		await screen.findByTestId('results-count');
		const english = new URL(dock.languageHref?.('en') ?? '', 'http://localhost');
		expect(english.pathname).toBe('/en/doctors');
		expect(english.searchParams.get('gender')).toBe('FEMALE');
		expect(english.searchParams.get('whatSlug')).toBe('kardiologos');
		expect(dock.languageHref?.('el')).toMatch(/^\/doctors\?/);
	});

	it('S-07.3 (κανόνας 11, negative, MINOR-5 of r1): an old link’s coordinates never reach another language’s address; the page gone, the frame’s own again', async () => {
		visit(`${NEAR_ME}&whereLat=37.9&whereLng=23.6&gender=FEMALE`);
		const dock = new SearchDock();
		const view = render(AppClientHarness, {
			props: { data: { firstPage: null, serverNow: null }, dock }
		});
		const english = dock.languageHref?.('en') ?? '';
		expect(english).toMatch(/^\/en\/doctors\?/);
		expect(english).toContain('whereKind=current-location');
		expect(english).toContain('gender=FEMALE');
		expect(english).not.toMatch(/whereLat|whereLng|37\.9|23\.6/);
		view.unmount();
		expect(dock.languageHref).toBeNull();
	});

	it('U-24.4 / (ε) (MINOR-8 β of r1): «Χάρτης» goes away as it is pressed — the focus moves to the sheet’s handle, never to the page', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a'), card('b')]));
		renderResults();
		await screen.findByTestId('results-count');
		const scroll = document.querySelector('[data-slot="map-sheet-scroll"]') as HTMLElement;
		scroll.scrollTop = 60;
		await fireEvent.scroll(scroll);
		await user().click(screen.getByTestId('results-map-switch'));
		await waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Επαναφορά λίστας' }))
		);
		expect(document.activeElement).not.toBe(document.body);
		// MINOR-2 of r1: the strip shows the list’s top.
		expect(scroll.scrollTop).toBe(0);
	});

	it('U-24.4 (NIT-7, app = web): at the strip («Χάρτης») only «Βρέθηκαν N» and the handle stay reachable below 744 — the cards are hidden; at half the grip is no control', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a'), card('b')]));
		renderResults();
		await screen.findByTestId('results-count');
		const scroll = document.querySelector('[data-slot="map-sheet-scroll"]') as HTMLElement;
		// At half: nothing hidden, and no «Επαναφορά λίστας» that would do nothing.
		expect([...scroll.classList].filter((name) => name.includes('invisible'))).toEqual([]);
		expect(screen.queryByRole('button', { name: 'Επαναφορά λίστας' })).toBeNull();
		scroll.scrollTop = 60;
		await fireEvent.scroll(scroll);
		expect([...scroll.classList].filter((name) => name.includes('invisible'))).toEqual([]);
		await user().click(screen.getByTestId('results-map-switch'));
		expect(screen.getByTestId('results-sheet')).toHaveAttribute('data-snap', 'peek');
		expect(scroll).toHaveClass('max-tablet:[&>*:not(:first-child)]:invisible');
		const header = scroll.firstElementChild as HTMLElement;
		expect(header).toHaveAttribute('data-slot', 'results-header');
		expect(header).toContainElement(screen.getByTestId('results-count'));
		for (const result of screen.getAllByTestId('results-card'))
			expect(header).not.toContainElement(result);
		expect(screen.getByRole('button', { name: 'Επαναφορά λίστας' })).toBeInTheDocument();
		// (negative) the hiding is the phone's alone: from 744 nothing (no `inert`, no unscoped class)
		for (const name of [...scroll.classList].filter((item) => item.includes('invisible')))
			expect(name.startsWith('max-tablet:')).toBe(true);
		expect(screen.getByTestId('results-page').querySelector('[inert]')).toBeNull();
	});

	it('U-24.4 / (ε) (MINOR-8 γ of r1): from 744 «Αλλαγή αναζήτησης» drops the bar; Escape lifts it and the focus comes back to that button', async () => {
		visit(NEAR_ME);
		resolveDeviceLocation.mockResolvedValue({ status: 'denied', canAskAgain: false });
		const dock = new SearchDock();
		render(AppClientHarness, { props: { data: { firstPage: null, serverNow: null }, dock } });
		const denied = await screen.findByTestId('results-location-denied');
		const change = within(denied).getByRole('button', { name: 'Αλλαγή αναζήτησης' });
		await user().click(change);
		expect(dock.dropped).toBe(true);
		await waitFor(() => expect(document.activeElement).not.toBe(change));
		await fireEvent.keyDown(document, { key: 'Escape' });
		await waitFor(() => expect(dock.dropped).toBe(false));
		await waitFor(() => expect(document.activeElement).toBe(change));
		expect(document.activeElement).not.toBe(document.body);
	});

	it('U-24.2 / U-24.3: the filters open from the button with their reads (D-103) and «Εμφάνιση N γιατρών» goes to the filtered address', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')], { total: 7 }));
		renderResults();
		await screen.findByTestId('results-count');
		expect(fetchFilterFacets).not.toHaveBeenCalled();
		await user().click(screen.getByTestId('results-filters-pill'));
		const dialog = await screen.findByTestId('search-filter-modal');
		expect(dialog).toHaveAttribute('data-shape', 'sheet');
		await waitFor(() => expect(fetchFilterFacets).toHaveBeenCalled());
		await user().click(within(dialog).getByTestId('search-filter-payment-CASH'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('search-filter-apply')).toHaveTextContent(
				'Εμφάνιση 7 γιατρών'
			)
		);
		await user().click(within(dialog).getByTestId('search-filter-apply'));
		const href = vi.mocked(goto).mock.calls.at(-1)?.[0] as string;
		expect(href).toMatch(/^\/doctors\?/);
		expect(href).toContain('paymentOptions=CASH');
		expect(href).toContain('whatSlug=kardiologos');
	});

	it('§7.2: ONE list and ONE map placed per zone by CSS — the phone’s bar and sheet, the 744 switch, the map beside the list from 1128', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		renderResults();
		await screen.findByTestId('results-count');
		expect(screen.getByTestId('results-page')).toHaveClass('fixed', 'inset-0', 'tablet:static');
		expect(document.querySelector('[data-slot="results-phone-bar"]')).toHaveClass('tablet:hidden');
		expect(screen.getByTestId('results-sheet')).toHaveAttribute('data-snap', 'half');
		const pane = screen.getByTestId('results-map-pane');
		expect(pane).toHaveClass(
			'max-tablet:absolute',
			'max-tablet:inset-0',
			'tablet:max-laptop:hidden',
			'laptop:map-pane-sticky',
			'laptop:rounded-lg'
		);
		const stage = document.querySelector('[data-slot="results-stage"]') as HTMLElement;
		// Rewritten by U-28.1 (the owner, 29/10: «χάρτης να είναι το 1/3 και όχι το μισό»): the split was
		// `laptop:grid-cols-[minmax(0,27fr)_minmax(0,23fr)]` (~46 %, U-24.4); it is 2/3 + 1/3 now (the U-28.1 guard).
		expect(stage).toHaveClass('laptop:grid', 'laptop:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]');
		expect(screen.getByTestId('results-grid')).toHaveClass(
			'grid-cols-1',
			'tablet:grid-cols-2',
			'split:grid-cols-3',
			'laptop:grid-cols-2',
			'gap-x-6',
			'gap-y-results-row-gap'
		);
		// 744–1127: «Εμφάνιση χάρτη» ⇄ «Εμφάνιση λίστας».
		const toggle = screen.getByTestId('results-map-toggle');
		expect(toggle.parentElement).toHaveClass('hidden', 'tablet:block', 'laptop:hidden');
		expect(toggle).toHaveTextContent('Εμφάνιση χάρτη');
		await user().click(toggle);
		expect(toggle).toHaveTextContent('Εμφάνιση λίστας');
		expect(pane).toHaveClass('tablet:max-laptop:fixed', 'tablet:max-laptop:top-bar-top');
	});

	it('§7.2 (NIT-5 of r1, app = web): the 744 switch draws the application’s glyphs — the map, then `list-outline` (never `menu`)', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		renderResults();
		await screen.findByTestId('results-count');
		const toggle = screen.getByTestId('results-map-toggle');
		expect(toggle.querySelector('[data-icon="map-outline"]')).not.toBeNull();
		await user().click(toggle);
		expect(toggle.querySelector('[data-icon="list-outline"]')).not.toBeNull();
		expect(toggle.querySelector('[data-icon="menu"]')).toBeNull();
	});

	it('§7.2: the phone’s first scroll opens the sheet whole and shows «Χάρτης», which leaves only its top; the handle brings it to half', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a'), card('b')]));
		renderResults();
		await screen.findByTestId('results-count');
		expect(screen.queryByTestId('results-map-switch')).toBeNull();
		const scroll = document.querySelector('[data-slot="map-sheet-scroll"]') as HTMLElement;
		scroll.scrollTop = 60;
		await fireEvent.scroll(scroll);
		expect(screen.getByTestId('results-sheet')).toHaveAttribute('data-snap', 'full');
		await user().click(screen.getByTestId('results-map-switch'));
		expect(screen.getByTestId('results-sheet')).toHaveAttribute('data-snap', 'peek');
		await user().click(screen.getByRole('button', { name: 'Επαναφορά λίστας' }));
		expect(screen.getByTestId('results-sheet')).toHaveAttribute('data-snap', 'half');
	});

	it('U-27.4 (app = web): «🔒 Συνδεθείτε για κόστος» on a results card opens the sign-in page, never the profile; U-27.2: the map has «Μεγέθυνση» / «Σμίκρυνση»', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		renderResults();
		await screen.findByTestId('results-count');
		const result = screen.getByTestId('results-card');
		const link = within(result).getByRole('link', { name: 'Προφίλ γιατρού Γιατρός a' });
		const followed = vi.fn((event: Event) => event.preventDefault());
		link.addEventListener('click', followed);
		await user().click(within(result).getByTestId('results-card-sign-in'));
		expect(goto).toHaveBeenCalledWith('/login');
		expect(followed).not.toHaveBeenCalled();
		// The map's zoom: its names in the page's language, drawn from 744 only.
		const zoomIn = screen.getByRole('button', { name: 'Μεγέθυνση' });
		const zoomOut = screen.getByRole('button', { name: 'Σμίκρυνση' });
		expect(zoomIn.closest('[data-slot="map-view-zoom"]')).toHaveClass('hidden', 'tablet:flex');
		expect(screen.getByTestId('results-map')).toContainElement(zoomOut);
	});

	it('§7.2 (negative): the map is never drawn before the page shows — no map in a box with no size (jsdom, the server)', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		renderResults();
		await screen.findByTestId('results-count');
		expect(screen.getByTestId('results-map')).toHaveAttribute('data-loaded', 'false');
		expect(document.querySelector('.maplibregl-map')).toBeNull();
	});

	it('U-28.1: from 1128 the list takes 2/3 and the map 1/3 (24 apart) — the list’s columns 2 · 3 · 4 from 1128 · 1440 · 1920, its skeleton the same; below 1128 the columns are the same as before', async () => {
		visit(CARDIOLOGY);
		let answer: (value: SearchDoctorsSearchResults) => void = () => {};
		fetchSearchResults.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		renderResults();
		const skeleton = await waitFor(
			() => document.querySelector('[data-slot="results-skeleton"]') as HTMLElement
		);
		const columns = [
			'grid-cols-1',
			'tablet:grid-cols-2',
			'split:grid-cols-3',
			'laptop:grid-cols-2',
			'desktop:grid-cols-3',
			'wide:grid-cols-4'
		];
		expect(skeleton).toHaveClass(...columns, 'gap-x-6', 'gap-y-results-row-gap');
		answer(pageOf([card('a'), card('b')]));
		await screen.findByTestId('results-count');
		expect(screen.getByTestId('results-page')).toHaveAttribute('data-desktop-map', 'split');
		const stage = document.querySelector('[data-slot="results-stage"]') as HTMLElement;
		expect(stage).toHaveClass(
			'laptop:grid',
			'laptop:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]',
			'laptop:gap-6',
			'laptop:items-start'
		);
		expect(stage).not.toHaveClass('laptop:grid-cols-[minmax(0,27fr)_minmax(0,23fr)]');
		const grid = screen.getByTestId('results-grid');
		expect(grid).toHaveClass(...columns);
		// The grid's own column count is one per zone: no other `grid-cols-*` of it.
		expect([...grid.classList].filter((name) => name.includes('grid-cols-'))).toEqual(columns);
		// The map beside the list, stuck under the bar, as before.
		expect(screen.getByTestId('results-map-pane')).toHaveClass(
			'laptop:map-pane-sticky',
			'laptop:mt-6',
			'laptop:rounded-lg'
		);
		expect(screen.getByTestId('results-map-pane')).not.toHaveClass('laptop:hidden');
	});

	/** The page's nodes whose classes the three states of U-28.2 may change. */
	const layoutNodes = () => ({
		stage: document.querySelector('[data-slot="results-stage"]') as HTMLElement,
		sheet: screen.getByTestId('results-sheet'),
		grid: screen.getByTestId('results-grid'),
		pane: screen.getByTestId('results-map-pane'),
		toggleBox: screen.getByTestId('results-map-toggle').parentElement as HTMLElement
	});
	/** A node's classes below 1128: every class without the `laptop:` / `desktop:` / `wide:` zone. */
	const below1128 = (node: HTMLElement) =>
		[...node.classList].filter((name) => !/^(laptop|desktop|wide):/.test(name)).sort();

	it('U-28.2: the split map has its three named buttons — «Χάρτης σε πλήρη οθόνη» (top right, over the zoom), «Απόκρυψη χάρτη» (top left) and the zoom — and no «Εμφάνιση χάρτη» from 1128', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		renderResults();
		await screen.findByTestId('results-count');
		const map = screen.getByTestId('results-map');
		const expand = within(map).getByRole('button', { name: 'Χάρτης σε πλήρη οθόνη' });
		const hide = within(map).getByRole('button', { name: 'Απόκρυψη χάρτη' });
		expect(within(map).getByRole('button', { name: 'Μεγέθυνση' })).toBeInTheDocument();
		expect(expand.closest('[data-slot="map-view-zoom"]')).toHaveClass('top-2', 'right-3');
		expect(hide).toHaveClass('top-2', 'left-4', 'laptop:flex');
		expect(layoutNodes().toggleBox).toHaveClass('hidden', 'tablet:block', 'laptop:hidden');
	});

	it('U-28.2: «Χάρτης σε πλήρη οθόνη» ⇒ the map over the whole stage — the list, its «Βρέθηκαν N» with «Φίλτρα» and the legal line out (the sheet `laptop:hidden`), the page at its top, the same button «Κλείσιμο χάρτη πλήρους οθόνης» with the focus, «Απόκρυψη χάρτη» gone; «×» ⇒ the split again', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a'), card('b')]));
		const legal = createRawSnippet(() => ({ render: () => '<p data-testid="legal-line">©</p>' }));
		render(QueryHarness, {
			props: {
				component: SearchResults,
				props: { data: { firstPage: null, serverNow: null }, legal }
			}
		});
		await screen.findByTestId('results-count');
		const scroller = document.scrollingElement ?? document.documentElement;
		scroller.scrollTop = 300;
		const expand = screen.getByRole('button', { name: 'Χάρτης σε πλήρη οθόνη' });
		await user().click(expand);
		expect(screen.getByTestId('results-page')).toHaveAttribute('data-desktop-map', 'expanded');
		const nodes = layoutNodes();
		expect(nodes.stage).toHaveClass('laptop:grid-cols-1');
		expect(nodes.stage).not.toHaveClass('laptop:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]');
		// The sheet holds the header (count + filters), the cards and the legal line: all of it out from 1128.
		expect(nodes.sheet).toHaveClass('laptop:hidden');
		for (const part of [
			screen.getByTestId('results-count'),
			screen.getByTestId('results-filters-pill'),
			screen.getByTestId('results-grid'),
			screen.getByTestId('legal-line')
		])
			expect(nodes.sheet).toContainElement(part);
		// The map keeps its sticky height on the whole width.
		expect(nodes.pane).toHaveClass('laptop:map-pane-sticky');
		expect(nodes.pane).not.toHaveClass('laptop:hidden');
		expect(scroller.scrollTop).toBe(0);
		const close = screen.getByRole('button', { name: 'Κλείσιμο χάρτη πλήρους οθόνης' });
		expect(close).toBe(expand);
		expect(close).toHaveFocus();
		expect(screen.queryByRole('button', { name: 'Απόκρυψη χάρτη' })).toBeNull();
		await user().click(close);
		expect(screen.getByTestId('results-page')).toHaveAttribute('data-desktop-map', 'split');
		expect(layoutNodes().sheet).not.toHaveClass('laptop:hidden');
		expect(layoutNodes().stage).toHaveClass('laptop:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]');
		expect(screen.getByRole('button', { name: 'Χάρτης σε πλήρη οθόνη' })).toHaveFocus();
		expect(screen.getByRole('button', { name: 'Απόκρυψη χάρτη' })).toBeInTheDocument();
	});

	it('U-28.2: «Απόκρυψη χάρτη» ⇒ no map in the layout and the list on the whole width (3 · 4 · 5 columns), the dark «Εμφάνιση χάρτη» from 1128 with the focus; its press ⇒ the split again, the focus on «Απόκρυψη χάρτη»', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a'), card('b')]));
		renderResults();
		await screen.findByTestId('results-count');
		await user().click(screen.getByRole('button', { name: 'Απόκρυψη χάρτη' }));
		expect(screen.getByTestId('results-page')).toHaveAttribute('data-desktop-map', 'hidden');
		const nodes = layoutNodes();
		expect(nodes.pane).toHaveClass('laptop:hidden');
		expect(nodes.stage).toHaveClass('laptop:grid-cols-1');
		const columns = [
			'grid-cols-1',
			'tablet:grid-cols-2',
			'split:grid-cols-3',
			'laptop:grid-cols-3',
			'desktop:grid-cols-4',
			'wide:grid-cols-5'
		];
		expect([...nodes.grid.classList].filter((name) => name.includes('grid-cols-'))).toEqual(
			columns
		);
		// The same dark pill as 744–1127 (the same node and place), drawn from 1128 too now.
		const toggle = screen.getByTestId('results-map-toggle');
		expect(nodes.toggleBox).toHaveClass(
			'fixed',
			'bottom-map-switch-bottom',
			'left-1/2',
			'tablet:block'
		);
		expect(nodes.toggleBox).not.toHaveClass('laptop:hidden');
		expect(toggle).toHaveTextContent('Εμφάνιση χάρτη');
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await waitFor(() => expect(toggle).toHaveFocus());
		await user().click(toggle);
		expect(screen.getByTestId('results-page')).toHaveAttribute('data-desktop-map', 'split');
		expect(layoutNodes().pane).not.toHaveClass('laptop:hidden');
		expect(layoutNodes().toggleBox).toHaveClass('laptop:hidden');
		await waitFor(() =>
			expect(screen.getByRole('button', { name: 'Απόκρυψη χάρτη' })).toHaveFocus()
		);
		expect(document.activeElement).not.toBe(document.body);
	});

	it('U-28.2 (negative): below 1128 the three states are the same page — every class they change is a `laptop:` one, the 744 switch keeps its words and state; and the state reaches neither the address nor a storage', async () => {
		visit(CARDIOLOGY);
		fetchSearchResults.mockResolvedValue(pageOf([card('a')]));
		renderResults();
		await screen.findByTestId('results-count');
		const address = page.url.href;
		const stored = vi.spyOn(Storage.prototype, 'setItem');
		const snapshot = () => {
			const nodes = layoutNodes();
			return {
				stage: below1128(nodes.stage),
				sheet: below1128(nodes.sheet),
				grid: below1128(nodes.grid),
				pane: below1128(nodes.pane),
				toggleBox: below1128(nodes.toggleBox),
				toggle: screen.getByTestId('results-map-toggle').textContent,
				pressed: screen.getByTestId('results-map-toggle').getAttribute('aria-pressed')
			};
		};
		const split = snapshot();
		await user().click(screen.getByRole('button', { name: 'Χάρτης σε πλήρη οθόνη' }));
		expect(snapshot()).toEqual(split);
		await user().click(screen.getByRole('button', { name: 'Κλείσιμο χάρτη πλήρους οθόνης' }));
		await user().click(screen.getByRole('button', { name: 'Απόκρυψη χάρτη' }));
		expect(snapshot()).toEqual(split);
		expect(goto).not.toHaveBeenCalled();
		expect(page.url.href).toBe(address);
		expect(stored).not.toHaveBeenCalled();
		stored.mockRestore();
	});
});
