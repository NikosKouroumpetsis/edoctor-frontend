import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { focusManager, onlineManager, QueryClient } from '@tanstack/svelte-query';
import { goto, invalidateAll } from '$app/navigation';
import { SearchDock } from '$shared/state/search-dock';
import type {
	SearchDoctorsCardFacts,
	SearchDoctorsSection,
	SearchDoctorsSectionLink
} from '$modules/search-doctors/api/marketplace/types';
import { searchDoctorsQueryKeys } from '$modules/search-doctors/api/home/query-keys';
import { forgetDeviceLocation, readFreshDeviceLocation } from '$shared/state/device-location';
import { readSearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';
import { readSearchDoctorsFilters } from '$modules/search-doctors/lib/search-filters';
import { buildSearchDoctorsScope } from '$modules/search-doctors/lib/search-query';
import type {
	DoctorCard,
	HomePageData,
	HomeRowResult,
	SectionId
} from '$modules/search-doctors/types';
import { holdTransitions } from '../../../../../../vitest-mocks/css-transitions';
import Harness from './discovery-home.harness.svelte';

const { fetchHomeSection, resolveCategoryScope } = vi.hoisted(() => ({
	fetchHomeSection: vi.fn(),
	resolveCategoryScope: vi.fn()
}));
vi.mock('$modules/search-doctors/api/marketplace/build-section-query', async (importOriginal) => ({
	...(await importOriginal<
		typeof import('$modules/search-doctors/api/marketplace/build-section-query')
	>()),
	fetchHomeSection
}));
vi.mock('$modules/search-doctors/api/marketplace/category-scope', async (importOriginal) => ({
	...(await importOriginal<
		typeof import('$modules/search-doctors/api/marketplace/category-scope')
	>()),
	resolveCategoryScope
}));
// The search's reads (D2): stand-ins, so opening the search never calls out of the test.
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
// The results' first page, asked at the search's press (D-103, MINOR-7 of r1): a stand-in, never the network.
const { fetchSearchResults } = vi.hoisted(() => ({ fetchSearchResults: vi.fn() }));
vi.mock('$modules/search-doctors/api/marketplace/search-source', () => ({ fetchSearchResults }));
// The device's position («Κοντά μου»): a stand-in, never the browser's.
const { resolveDeviceLocation } = vi.hoisted(() => ({ resolveDeviceLocation: vi.fn() }));
vi.mock('$shared/lib/location', async (importOriginal) => ({
	...(await importOriginal<typeof import('$shared/lib/location')>()),
	resolveDeviceLocation
}));

const doctor = (id: string, overrides: Partial<DoctorCard> = {}): DoctorCard => ({
	id,
	doctorSlug: `dr-${id}`,
	name: `Γιατρός ${id}`,
	specialty: 'Καρδιολόγος',
	area: 'Αθήνα',
	availabilityLabel: 'Σήμερα · 17:30',
	fee: { kind: 'login', label: 'Συνδεθείτε για κόστος' },
	ratingLabel: '4,8',
	imageUrl: null,
	...overrides
});

const athensCriteria = {
	availability: 'next7Days',
	what: '',
	where: 'Αθήνα',
	whatSelection: null,
	whereSelection: { kind: 'location' as const, label: 'Αθήνα', slug: 'athina' }
};

// U-32.1: what `fetchHomeSection` answers — the facts a row's card and link are built from (`doctor('1')` and
// `athensCriteria` are what `card('1')` and `athensLink` show; the server builds the streamed rows from the same).
const NOW = Date.parse('2026-10-24T12:00:00+03:00');
const card = (
	id: string,
	overrides: Partial<SearchDoctorsCardFacts> = {}
): SearchDoctorsCardFacts => ({
	id,
	doctorSlug: `dr-${id}`,
	name: `Γιατρός ${id}`,
	professionalName: 'Καρδιολόγος',
	imageUrl: null,
	office: { city: 'Αθήνα', street: null, streetNumber: null, distanceKm: null },
	point: null,
	description: null,
	availability: {
		nextAvailableAt: '2026-10-24T17:30:00+03:00',
		hasToday: true,
		hasNext3Days: true
	},
	rating: 4.8,
	reviewCount: 12,
	pricingVisible: false,
	primaryServicePrice: null,
	readAt: NOW,
	...overrides
});
const athensLink: SearchDoctorsSectionLink = {
	availability: 'next7Days',
	what: null,
	where: { kind: 'location', label: 'Αθήνα', slug: 'athina' }
};

const ok = (doctors: DoctorCard[], criteria = athensCriteria): HomeRowResult => ({
	status: 'ok',
	doctors,
	criteria
});

const ids: SectionId[] = ['popular-athens', 'popular-psychologists', 'internal-medicine-gp'];

function homeData(results: (HomeRowResult | Promise<HomeRowResult>)[]): HomePageData {
	return {
		categories: [{ id: 'all' }, { id: 'dermatology' }, { id: 'cardiology' }],
		sections: ids.map((id, index) => ({
			id,
			result: Promise.resolve(results[index] ?? ok([]))
		})),
		serverNow: Date.now()
	};
}

const rows = () => screen.queryAllByTestId('home-row');
const rowsBox = () => document.querySelector('[data-slot="home-rows"]') as HTMLElement;

afterEach(() => {
	fetchHomeSection.mockReset();
	resolveCategoryScope.mockReset();
	getFacets.mockReset();
	getDoctorSuggestions.mockReset();
	getLocationSuggestions.mockReset();
	resolveDeviceLocation.mockReset();
	fetchSearchResults.mockReset();
	forgetDeviceLocation();
});

beforeEach(() => {
	fetchSearchResults.mockResolvedValue({
		total: 0,
		totalIsLowerBound: false,
		items: [],
		nextCursor: null,
		hasNextPage: false
	});
	getFacets.mockResolvedValue({
		pricingVisible: false,
		appliedFilters: {},
		facets: {
			paymentOptions: [],
			services: [],
			genders: [],
			speakLanguages: [],
			priceRange: null,
			specialties: [{ value: 'prof-cardio', label: 'Καρδιολόγος', count: 3 }]
		}
	});
	getDoctorSuggestions.mockResolvedValue({ items: [], language: 'el' });
	getLocationSuggestions.mockResolvedValue({ items: [], language: 'el' });
});

describe('DiscoveryHome (the web’s home, screen 2)', () => {
	// The superseded `search-header.svelte` drew a sliders glyph in a 32 circle inside the phone's pill.
	it('U-16.4: the phone’s pill is the search alone (one glyph, no filter control); from 744 the big SearchBar', async () => {
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		const trigger = screen.getByTestId('home-search-trigger');
		expect(trigger.querySelectorAll('svg')).toHaveLength(1);
		expect(trigger.querySelector('.size-control-xs')).toBeNull();
		expect(trigger.closest('[data-slot="search-trigger"]')).toHaveClass('tablet:hidden');
		const top = document.querySelector('[data-slot="home-top"]') as HTMLElement;
		expect(top).toHaveClass('sticky', 'top-0', 'tablet:static');
		expect(screen.getByTestId('home-search-bar')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="home-search"]')).toHaveClass(
			'hidden',
			'tablet:block'
		);
		expect(screen.queryByRole('button', { name: /φίλτρ/iu })).not.toBeInTheDocument();
		// Rewritten for U-21/U-23.2: D1's pill opened the results page until the search landed (no dead end, U-20);
		// it now opens the search window.
		await user().click(trigger);
		expect(goto).not.toHaveBeenCalled();
		expect(screen.getByRole('dialog', { name: 'Αναζήτηση Γιατρού' })).toBeInTheDocument();
	});

	it('U-21/U-23.2: the phone’s pill opens the window grown out of it (its rect), «Τι;» open; a search goes to /doctors with the application’s names', async () => {
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		const trigger = screen.getByTestId('home-search-trigger');
		vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(new DOMRect(16, 14, 343, 56));
		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		await user().click(trigger);
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		const sheet = screen.getByTestId('search-criteria-sheet');
		expect(sheet.classList).toContain('starting:modal-zoom-from');
		expect(
			within(screen.getByTestId('search-criteria-card-what')).getByRole('heading', { name: 'Τι;' })
		).toBeInTheDocument();
		await user().click(await screen.findByTestId('search-criteria-option-prof-cardio'));
		await user().click(screen.getByTestId('search-criteria-submit'));
		expect(goto).toHaveBeenCalledTimes(1);
		const href = vi.mocked(goto).mock.calls[0][0] as string;
		const url = new URL(href, 'https://edoctor.test');
		expect(url.pathname).toBe('/doctors');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			what: 'Καρδιολόγος',
			whatKind: 'professional',
			whatLabel: 'Καρδιολόγος',
			whatId: 'prof-cardio'
		});
		await waitFor(() => expect(screen.queryByTestId('search-criteria-sheet')).toBeNull());
	});

	it('D-103 (MINOR-7 of r1): the home’s «Αναζήτηση» asks the results’ first page AT THE PRESS — the scope of the address it goes to, the route still on its way', async () => {
		vi.mocked(goto).mockImplementationOnce(() => new Promise(() => {}));
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		await user().click(screen.getByTestId('home-search-trigger'));
		await user().click(await screen.findByTestId('search-criteria-option-prof-cardio'));
		expect(fetchSearchResults).not.toHaveBeenCalled();
		await user().click(screen.getByTestId('search-criteria-submit'));
		const href = vi.mocked(goto).mock.calls[0][0] as string;
		expect(fetchSearchResults).toHaveBeenCalledTimes(1);
		const [, scope, lang, request] = fetchSearchResults.mock.calls[0];
		const params = new URLSearchParams(href.slice(href.indexOf('?') + 1));
		expect(scope).toEqual(
			buildSearchDoctorsScope(readSearchDoctorsCriteria(params), readSearchDoctorsFilters(params))
		);
		expect(scope.what).toMatchObject({ kind: 'professional', professionalId: 'prof-cardio' });
		expect(lang).toBe('el');
		expect(request).toEqual({ cursor: undefined, limit: 5 });
	});

	it('S-07.3 (κανόνας 11, web): «Κοντά μου» searches with the position kept in the tab’s memory — the address carries no coordinates', async () => {
		resolveDeviceLocation.mockResolvedValue({
			status: 'granted',
			coords: { latitude: 37.943, longitude: 23.647 }
		});
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		await user().click(screen.getByTestId('home-search-trigger'));
		await user().click(screen.getByTestId('search-criteria-card-where'));
		await user().click(await screen.findByTestId('search-criteria-option-current-location'));
		await waitFor(() =>
			expect(
				within(screen.getByTestId('search-criteria-card-availability')).getByRole('heading', {
					name: 'Πότε;'
				})
			).toBeInTheDocument()
		);
		await user().click(screen.getByTestId('search-criteria-submit'));
		const href = vi.mocked(goto).mock.calls[0][0] as string;
		const url = new URL(href, 'https://edoctor.test');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			where: 'current-location',
			whereKind: 'current-location',
			whereLabel: 'Κοντά μου'
		});
		expect(href).not.toMatch(/whereLat|whereLng|37\.943|23\.647/u);
		// The results page of this visit finds the position in memory (no storage, no cookie).
		expect(readFreshDeviceLocation()).toEqual({ latitude: 37.943, longitude: 23.647 });
		expect(localStorage.length + sessionStorage.length).toBe(0);
	});

	it('U-23.2: dropped from the bar’s pill, the big bar opens on «Τι» with its panel; the pill then writes the choices', async () => {
		const dock = new SearchDock();
		render(Harness, { props: { data: homeData([ok([doctor('1')])]), dock } });
		const pill = document.createElement('button');
		document.body.append(pill);
		dock.drop(pill);
		await waitFor(() =>
			expect(screen.getByTestId('home-search-bar-what-input')).toBeInTheDocument()
		);
		expect(screen.getByTestId('home-search-bar-panel')).toBeInTheDocument();
		await waitFor(() => expect(screen.getByTestId('home-search-bar-what-input')).toHaveFocus());
		expect(dock.summary).toEqual({ what: undefined, where: undefined, when: undefined });
		await user().click(await screen.findByTestId('search-criteria-option-prof-cardio'));
		await waitFor(() => expect(dock.summary.what).toBe('Καρδιολόγος'));
		pill.remove();
	});

	// Live r1 (2): the r0 pill was the application's card pill, 68 high with 16 words (py-5, `text-body-lg`).
	it('U-16.4/U-20: the phone’s pill is the wave record’s — 56 high with its rim, the glyph and 14/600 words in the middle', () => {
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		const trigger = screen.getByTestId('home-search-trigger');
		expect(trigger).toHaveClass(
			'min-h-control-lg',
			'rounded-full',
			'border',
			'border-foreground/6'
		);
		expect(trigger).not.toHaveClass('py-5', 'shadow-floating');
		const words = trigger.querySelector('[data-slot="search-trigger-words"]') as HTMLElement;
		expect(words).toHaveClass('justify-center', 'gap-2.5');
		expect(within(words).getByText('Ξεκινήστε αναζήτηση γιατρού')).toHaveClass(
			'text-body-sm',
			'font-semibold',
			'text-foreground'
		);
		expect(trigger.querySelector('.text-body-lg')).toBeNull();
	});

	// MAJOR-1 (r1): an element that already exists has no `@starting-style`; the drop is the theme's keyframe.
	it('U-12/U-16.7: the drop is the theme’s `search-drop` keyframe — from 20 above and clear, 0.25 s on the standard curve', () => {
		const css = readFileSync(join(process.cwd(), 'src/routes/layout.css'), 'utf8');
		expect(css).toMatch(
			/--animate-search-drop:\s*search-drop var\(--transition-duration-standard\) var\(--ease-standard\);/u
		);
		expect(css).toMatch(
			/@keyframes search-drop \{\s*from \{\s*translate: 0 calc\(var\(--spacing\) \* -5\);\s*opacity: 0;/u
		);
	});

	it('U-20: the card is ONE link to the profile, the heart its own button (a guest signs in), four lines', async () => {
		const maria = doctor('1', {
			name: 'Μαρία Αλεξίου',
			badgeLabel: 'Επιλογή ασθενών',
			availabilityLabel: 'Πέμ 29 Οκτ · 10:00',
			ratingLabel: 'Νέο'
		});
		render(Harness, { props: { data: homeData([ok([maria])]) } });
		const card = await screen.findByTestId('home-doctor-card');
		const links = within(card).getAllByRole('link');
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveAccessibleName('Προφίλ γιατρού Μαρία Αλεξίου');
		expect(links[0]).toHaveAttribute('href', '/doctors/dr-1');
		const heart = within(card).getByRole('button', { name: 'Αποθήκευσε γιατρό Μαρία Αλεξίου' });
		expect(links[0]).not.toContainElement(heart);
		expect(heart.querySelector('[data-slot="favorite-button-outline"]')).not.toBeNull();
		await user().click(heart);
		expect(goto).toHaveBeenCalledWith('/login');
		expect(within(card).getByText('Επιλογή ασθενών')).toBeInTheDocument();
		const words = [...card.querySelectorAll('p')].map((line) =>
			line.textContent?.replace(/\s+/gu, ' ').trim()
		);
		expect(words).toEqual([
			'Μαρία Αλεξίου',
			'Καρδιολόγος · Αθήνα',
			'Πέμ 29 Οκτ · 10:00',
			'Συνδεθείτε για κόστος · ★ Νέο'
		]);
		expect(card.querySelector('[data-slot="home-doctor-card-availability"]')).toHaveClass(
			'text-primary-text'
		);
		for (const line of card.querySelectorAll('p')) expect(line).toHaveClass('line-clamp-2');
		// Live r1 (3, 7): «★ Νέο» never breaks (a no-break space), and only the ★ wears the `rating` colour.
		const rating = card.querySelector('[data-slot="home-doctor-card-rating"]') as HTMLElement;
		expect(rating).toHaveClass('whitespace-nowrap');
		expect(rating.textContent).toBe('★\u00a0Νέο');
		const star = card.querySelector('[data-slot="home-doctor-card-star"]') as HTMLElement;
		expect(star).toHaveTextContent('★');
		expect(star).toHaveClass('text-rating');
		expect(within(rating).getByText('Νέο')).toHaveClass('text-foreground');
		expect(within(rating).getByText('Νέο')).not.toHaveClass('text-rating');
		expect(card.querySelector('[data-slot="media-placeholder"]')).not.toBeNull();
	});

	it('U-27.4 (app = web): «🔒 Συνδεθείτε για κόστος» on a home card opens the sign-in page — never the doctor’s profile', async () => {
		const maria = doctor('1', { name: 'Μαρία Αλεξίου' });
		render(Harness, { props: { data: homeData([ok([maria])]) } });
		const card = await screen.findByTestId('home-doctor-card');
		const link = within(card).getByRole('link', { name: 'Προφίλ γιατρού Μαρία Αλεξίου' });
		const followed = vi.fn((event: Event) => event.preventDefault());
		link.addEventListener('click', followed);
		const action = within(card).getByTestId('home-doctor-card-sign-in');
		expect(action).toHaveAccessibleName('Συνδεθείτε για κόστος');
		expect(link).not.toContainElement(action);
		await user().click(action);
		expect(goto).toHaveBeenCalledWith('/login');
		expect(goto).toHaveBeenCalledTimes(1);
		expect(followed).not.toHaveBeenCalled();
	});

	it('U-20: a row is its title with the «→» to its results beside it — no subtitle; ‹ › from 744; the cards by the zone', async () => {
		render(Harness, { props: { data: homeData([ok([doctor('1'), doctor('2')])]) } });
		const [row] = await waitFor(() => {
			expect(rows()).toHaveLength(1);
			return rows();
		});
		const title = within(row).getByRole('heading', {
			level: 2,
			name: 'Δημοφιλείς γιατροί στην Αθήνα'
		});
		const titleRow = title.closest('[data-slot="section-title-row"]') as HTMLElement;
		const arrow = within(titleRow).getByRole('link', { name: 'Δείτε όλους' });
		const url = new URL(arrow.getAttribute('href') ?? '', 'http://localhost');
		expect(url.pathname).toBe('/doctors');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			availability: 'next7Days',
			where: 'Αθήνα',
			whereKind: 'location',
			whereLabel: 'Αθήνα',
			whereSlug: 'athina'
		});
		expect(row.querySelector('[data-slot="section-subtitle"]')).toBeNull();
		expect(row.querySelector('[data-slot="rail-controls"]')).toHaveClass('hidden', 'tablet:flex');
		expect(row.querySelector('[data-slot="rail-items"]')).toHaveClass('*:w-4/9', 'desktop:*:w-1/7');
	});

	it('U-20: only rows with doctors show — an empty section is left out while another has doctors', async () => {
		render(Harness, { props: { data: homeData([ok([]), ok([]), ok([doctor('3')])]) } });
		await waitFor(() => expect(rows()).toHaveLength(1));
		expect(within(rows()[0]).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Παθολόγοι & Γενικοί Ιατροί'
		);
		expect(screen.queryByTestId('home-error')).not.toBeInTheDocument();
		expect(screen.queryByTestId('home-empty')).not.toBeInTheDocument();
	});

	// MINOR-6 (r1): the r0 web left a failed section out while another had doctors; the application shows the error.
	it('U-20 (app = web): ONE failed section is the error, never a row left out; «Δοκιμή ξανά» asks only the failed one again', async () => {
		fetchHomeSection.mockImplementation(
			async (_client: unknown, config: { id: SectionId }): Promise<SearchDoctorsSection> => ({
				id: config.id,
				items: [card(`again-${config.id}`)],
				link: athensLink
			})
		);
		render(Harness, {
			props: { data: homeData([ok([doctor('1')]), { status: 'error' }, ok([])]) }
		});
		const error = await screen.findByTestId('home-error');
		expect(rows()).toHaveLength(0);
		await user().click(within(error).getByRole('button', { name: 'Δοκιμή ξανά' }));
		expect(fetchHomeSection).toHaveBeenCalledOnce();
		expect(fetchHomeSection.mock.calls[0][1]).toMatchObject({ id: 'popular-psychologists' });
		expect(fetchHomeSection.mock.calls[0][2]).toEqual({});
		await waitFor(() => expect(rows()).toHaveLength(2));
		expect(screen.queryByTestId('home-error')).not.toBeInTheDocument();
		expect(within(rows()[0]).getByRole('link', { name: /Γιατρός 1/u })).toBeInTheDocument();
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('U-20 (app = web): what follows the rows (the articles) shows only once they neither load nor fail', async () => {
		const after = createRawSnippet(() => ({
			render: () => '<section data-testid="after">Άρθρα</section>'
		}));
		const pending = new Promise<HomeRowResult>(() => {});
		const waiting = render(Harness, { props: { data: homeData([pending, ok([])]), after } });
		expect(screen.queryByTestId('after')).not.toBeInTheDocument();
		waiting.unmount();
		const failed = render(Harness, {
			props: { data: homeData([{ status: 'error' }, ok([doctor('1')])]), after }
		});
		await screen.findByTestId('home-error');
		expect(screen.queryByTestId('after')).not.toBeInTheDocument();
		failed.unmount();
		render(Harness, { props: { data: homeData([ok([doctor('1')]), ok([]), ok([])]), after } });
		expect(await screen.findByTestId('after')).toBeInTheDocument();
		expect(rowsBox()).not.toContainElement(screen.getByTestId('after'));
	});

	it('U-20: while a row loads, its skeleton stands in the rows only (the search and the categories are there at once)', () => {
		const pending = new Promise<HomeRowResult>(() => {});
		render(Harness, { props: { data: homeData([pending, pending, pending]) } });
		expect(rowsBox().querySelectorAll('[data-slot="home-row-skeleton"]')).toHaveLength(3);
		expect(screen.getByTestId('home-search-trigger')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Δερματολόγος' })).toBeInTheDocument();
	});

	it('U-20: no doctors at all is the empty state — its words and «Όλοι οι γιατροί» to the results', async () => {
		render(Harness, { props: { data: homeData([ok([]), ok([]), ok([])]) } });
		const empty = await screen.findByTestId('home-empty');
		expect(empty).toHaveTextContent('Δεν υπάρχουν ακόμη γιατροί σε αυτή την κατηγορία');
		expect(empty).toHaveTextContent('Δοκιμάστε άλλη κατηγορία ή δείτε όλους τους γιατρούς.');
		expect(within(empty).getByRole('link', { name: 'Όλοι οι γιατροί' })).toHaveAttribute(
			'href',
			'/doctors'
		);
	});

	it('U-20: a failure is the error state; «Δοκιμή ξανά» asks the failed sections again, in the browser', async () => {
		fetchHomeSection.mockRejectedValue(new Error('offline'));
		render(Harness, {
			props: { data: homeData([{ status: 'error' }, { status: 'error' }, ok([])]) }
		});
		const error = await screen.findByTestId('home-error');
		expect(error).toHaveTextContent('Δεν μπορέσαμε να φορτώσουμε τους γιατρούς');
		expect(error).toHaveTextContent('Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.');
		// MINOR-4 (r2): the application's and the prototype's «no connection» glyph.
		expect(error.querySelector('[data-icon="cloud-offline-outline"]')).not.toBeNull();
		await user().click(within(error).getByRole('button', { name: 'Δοκιμή ξανά' }));
		// NIT-1 (r2): the error stays until the answer, never rows of skeletons in between.
		expect(screen.getByTestId('home-error')).toBeInTheDocument();
		await waitFor(() => expect(fetchHomeSection).toHaveBeenCalledTimes(2));
		expect(fetchHomeSection.mock.calls.map((call) => call[1].id)).toEqual([
			'popular-athens',
			'popular-psychologists'
		]);
		expect(await screen.findByTestId('home-error')).toBeInTheDocument();
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('U-20: a category changes the rows in place (out, then in), only its rows with doctors', async () => {
		resolveCategoryScope.mockResolvedValue({ professionalIds: ['derm'] });
		fetchHomeSection.mockImplementation(
			async (_client: unknown, config: { id: SectionId }): Promise<SearchDoctorsSection> => ({
				id: config.id,
				items:
					config.id === 'popular-athens' ? [card('d1', { professionalName: 'Δερματολόγος' })] : [],
				link: athensLink
			})
		);
		render(Harness, { props: { data: homeData([ok([doctor('1')]), ok([doctor('2')])]) } });
		await waitFor(() => expect(rows()).toHaveLength(2));
		await user().click(screen.getByRole('button', { name: 'Δερματολόγος' }));
		expect(screen.getByRole('button', { name: 'Δερματολόγος' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(rowsBox()).toHaveClass(
			'transition-opacity',
			'duration-standard',
			'data-[leaving=true]:opacity-0'
		);
		await waitFor(() => expect(rows()).toHaveLength(1));
		expect(rowsBox()).toHaveAttribute('data-leaving', 'false');
		expect(within(rows()[0]).getByRole('link', { name: /Γιατρός d1/u })).toBeInTheDocument();
		expect(resolveCategoryScope).toHaveBeenCalledWith(expect.anything(), 'dermatology', 'el');
	});

	// D-103 (r1, from the application's review NIT-3): the new category is asked at the press, alongside the 250 ms
	// fade — never after it; the rows change once both are done (its rows, or the skeleton while they are on the way).
	it('U-20 (D-103): the new category’s query starts at the press, alongside the fade; the rows change when both are done', async () => {
		const rowsOnly = (node: Element) => node.getAttribute('data-slot') === 'home-rows';
		let fading = holdTransitions(rowsOnly);
		let release: (() => void) | undefined;
		resolveCategoryScope.mockImplementation(async (_client: unknown, categoryId: string) => ({
			professionalIds: [categoryId]
		}));
		fetchHomeSection.mockImplementation(
			async (
				_client: unknown,
				config: { id: SectionId },
				scope: { professionalIds?: string[] }
			): Promise<SearchDoctorsSection> => {
				const category = scope.professionalIds?.[0];
				if (category === 'dermatology') await new Promise<void>((resolve) => (release = resolve));
				return {
					id: config.id,
					items: [card(`${category}-${config.id}`)],
					link: athensLink
				};
			}
		);
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		await waitFor(() => expect(rows()).toHaveLength(1));

		// «Όλοι» ⇒ Καρδιολόγος: the query and its rows land while the old rows are still fading out.
		await user().click(screen.getByRole('button', { name: 'Καρδιολόγος' }));
		expect(rowsBox()).toHaveAttribute('data-leaving', 'true');
		await waitFor(() => expect(fetchHomeSection).toHaveBeenCalledTimes(3), { timeout: 200 });
		expect(resolveCategoryScope).toHaveBeenCalledWith(expect.anything(), 'cardiology', 'el');
		expect(rowsBox()).toHaveAttribute('data-leaving', 'true');
		expect(within(rowsBox()).getByRole('link', { name: /Γιατρός 1/u })).toBeInTheDocument();
		fading.end(rowsBox());
		await waitFor(() => expect(rows()).toHaveLength(3));
		expect(within(rowsBox()).queryByRole('link', { name: /Γιατρός 1/u })).not.toBeInTheDocument();

		// Καρδιολόγος ⇒ Δερματολόγος: asked at the press; while fading the rows stay the old ones (no skeleton
		// mid-fade); after the fade the skeleton, since the data is not there yet; then its rows.
		fading = holdTransitions(rowsOnly);
		await user().click(screen.getByRole('button', { name: 'Δερματολόγος' }));
		await waitFor(
			() =>
				expect(resolveCategoryScope).toHaveBeenCalledWith(expect.anything(), 'dermatology', 'el'),
			{ timeout: 200 }
		);
		await waitFor(() => expect(release).toBeDefined(), { timeout: 200 });
		expect(rowsBox()).toHaveAttribute('data-leaving', 'true');
		expect(rows()).toHaveLength(3);
		expect(rowsBox().querySelector('[data-slot="home-row-skeleton"]')).toBeNull();
		fading.end(rowsBox());
		await waitFor(() =>
			expect(rowsBox().querySelectorAll('[data-slot="home-row-skeleton"]')).toHaveLength(3)
		);
		expect(screen.queryAllByRole('link', { name: /Γιατρός cardiology-/u })).toHaveLength(0);
		release?.();
	});

	it('U-20: a category without doctors is the empty state; «Όλοι οι γιατροί» goes back to every row', async () => {
		resolveCategoryScope.mockResolvedValue({ professionalIds: ['derm'] });
		fetchHomeSection.mockImplementation(async (_c: unknown, config: { id: SectionId }) => ({
			id: config.id,
			items: [],
			link: null
		}));
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		await waitFor(() => expect(rows()).toHaveLength(1));
		await user().click(screen.getByRole('button', { name: 'Δερματολόγος' }));
		const empty = await screen.findByTestId('home-empty');
		await user().click(within(empty).getByRole('button', { name: 'Όλοι οι γιατροί' }));
		await waitFor(() => expect(rows()).toHaveLength(1));
		expect(screen.getByRole('button', { name: 'Όλοι' })).toHaveAttribute('aria-pressed', 'true');
	});

	it('U-20: a category whose rows fail is the error state; «Δοκιμή ξανά» asks only the failed rows again', async () => {
		resolveCategoryScope.mockResolvedValue({ professionalIds: ['derm'] });
		fetchHomeSection.mockRejectedValue(new Error('offline'));
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		await waitFor(() => expect(rows()).toHaveLength(1));
		await user().click(screen.getByRole('button', { name: 'Δερματολόγος' }));
		const error = await screen.findByTestId('home-error');
		const calls = fetchHomeSection.mock.calls.length;
		const scopeCalls = resolveCategoryScope.mock.calls.length;
		await user().click(within(error).getByRole('button', { name: 'Δοκιμή ξανά' }));
		await waitFor(() => expect(fetchHomeSection.mock.calls.length).toBe(calls + 3));
		expect(resolveCategoryScope.mock.calls.length).toBe(scopeCalls);
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	// MAJOR-2 (r1): the r0 web kept the previous category's rows under the new chip when its scope failed, and its
	// «Δοκιμή ξανά» fetched every row with no scope at all (every doctor under «Δερματολόγος»).
	it('U-20 (app = web): a category whose scope fails shows the error, never another category’s rows; «Δοκιμή ξανά» asks the scope first', async () => {
		resolveCategoryScope.mockImplementation(async (_client: unknown, categoryId: string) => {
			if (categoryId === 'dermatology') throw new Error('suggestions down');
			return { professionalIds: ['card'] };
		});
		fetchHomeSection.mockImplementation(
			async (
				_client: unknown,
				config: { id: SectionId },
				scope: { professionalIds?: string[] }
			): Promise<SearchDoctorsSection> => ({
				id: config.id,
				items: [card(`${scope.professionalIds?.[0] ?? 'NO-SCOPE'}-${config.id}`)],
				link: athensLink
			})
		);
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		await waitFor(() => expect(rows()).toHaveLength(1));
		await user().click(screen.getByRole('button', { name: 'Καρδιολόγος' }));
		await waitFor(() =>
			expect(screen.getAllByRole('link', { name: /Γιατρός card-/u })).toHaveLength(3)
		);
		await user().click(screen.getByRole('button', { name: 'Δερματολόγος' }));
		const error = await screen.findByTestId('home-error');
		expect(screen.queryAllByRole('link', { name: /Γιατρός card-/u })).toHaveLength(0);
		expect(rows()).toHaveLength(0);
		const sectionCalls = fetchHomeSection.mock.calls.length;
		await user().click(within(error).getByRole('button', { name: 'Δοκιμή ξανά' }));
		await waitFor(() =>
			expect(
				resolveCategoryScope.mock.calls.filter((call) => call[1] === 'dermatology')
			).toHaveLength(2)
		);
		expect(fetchHomeSection.mock.calls.length).toBe(sectionCalls);
		for (const call of fetchHomeSection.mock.calls)
			expect(call[2]).toEqual({ professionalIds: ['card'] });
		expect(screen.queryAllByRole('link', { name: /NO-SCOPE/u })).toHaveLength(0);
	});

	// MAJOR-1 (r2): offline, a read is «paused» — r1 counted it as nothing: (α) «Δεν υπάρχουν ακόμη γιατροί» with the
	// articles under it, (β) a skeleton without end. The application reports it with the errors ('unavailable').
	it('U-20 (app = web): a category asked while offline is the error with «Δοκιμή ξανά» — never «Δεν υπάρχουν ακόμη γιατροί», never an endless skeleton', async () => {
		resolveCategoryScope.mockImplementation(async (_client: unknown, categoryId: string) => ({
			professionalIds: [categoryId]
		}));
		fetchHomeSection.mockImplementation(
			async (
				_client: unknown,
				config: { id: SectionId },
				scope: { professionalIds?: string[] }
			): Promise<SearchDoctorsSection> => ({
				id: config.id,
				items: [card(`${scope.professionalIds?.[0]}-${config.id}`)],
				link: athensLink
			})
		);
		const after = createRawSnippet(() => ({
			render: () => '<section data-testid="after">Άρθρα</section>'
		}));
		render(Harness, { props: { data: homeData([ok([doctor('1')])]), after } });
		await waitFor(() => expect(rows()).toHaveLength(1));
		try {
			// (α) «Όλοι» ⇒ Καρδιολόγος offline: the scope is paused, the rows were never loaded.
			onlineManager.setOnline(false);
			await user().click(screen.getByRole('button', { name: 'Καρδιολόγος' }));
			const error = await screen.findByTestId('home-error');
			expect(screen.queryByTestId('home-empty')).not.toBeInTheDocument();
			expect(screen.queryByTestId('after')).not.toBeInTheDocument();
			expect(resolveCategoryScope).not.toHaveBeenCalled();
			await user().click(within(error).getByRole('button', { name: 'Δοκιμή ξανά' }));
			expect(screen.getByTestId('home-error')).toBeInTheDocument();
			// Back online, the paused reads go on by themselves: the rows.
			onlineManager.setOnline(true);
			await waitFor(() => expect(rows()).toHaveLength(3));
			expect(screen.queryByTestId('home-error')).not.toBeInTheDocument();

			// (β) Καρδιολόγος with rows ⇒ offline ⇒ Δερματολόγος: the error, not a skeleton standing in.
			onlineManager.setOnline(false);
			await user().click(screen.getByRole('button', { name: 'Δερματολόγος' }));
			expect(await screen.findByTestId('home-error')).toBeInTheDocument();
			expect(rowsBox().querySelector('[data-slot="home-row-skeleton"]')).toBeNull();
			expect(screen.queryByTestId('home-empty')).not.toBeInTheDocument();
			onlineManager.setOnline(true);
			await waitFor(() =>
				expect(screen.getAllByRole('link', { name: /Γιατρός dermatology-/u })).toHaveLength(3)
			);
		} finally {
			onlineManager.setOnline(true);
		}
	});

	it('U-20 (app = web): while a new category loads, the rows show their skeleton — never the previous category’s cards', async () => {
		let release: (() => void) | undefined;
		resolveCategoryScope.mockImplementation(async (_client: unknown, categoryId: string) => ({
			professionalIds: [categoryId]
		}));
		fetchHomeSection.mockImplementation(
			async (
				_client: unknown,
				config: { id: SectionId },
				scope: { professionalIds?: string[] }
			): Promise<SearchDoctorsSection> => {
				if (scope.professionalIds?.[0] === 'dermatology') {
					await new Promise<void>((resolve) => (release = resolve));
				}
				return {
					id: config.id,
					items: [card(`${scope.professionalIds?.[0]}-${config.id}`)],
					link: athensLink
				};
			}
		);
		render(Harness, { props: { data: homeData([ok([doctor('1')])]) } });
		await waitFor(() => expect(rows()).toHaveLength(1));
		await user().click(screen.getByRole('button', { name: 'Καρδιολόγος' }));
		await waitFor(() => expect(rows()).toHaveLength(3));
		await user().click(screen.getByRole('button', { name: 'Δερματολόγος' }));
		await waitFor(() =>
			expect(rowsBox().querySelectorAll('[data-slot="home-row-skeleton"]')).toHaveLength(3)
		);
		expect(screen.queryAllByRole('link', { name: /Γιατρός cardiology-/u })).toHaveLength(0);
		release?.();
	});

	it('U-16.7: the page registers its search; dropped from the pill it is fixed under the bar over the dimmed page, Escape lifts it', async () => {
		const dock = new SearchDock();
		const view = render(Harness, { props: { data: homeData([ok([doctor('1')])]), dock } });
		expect(dock.available).toBe(true);
		const bar = document.querySelector('[data-slot="home-search-bar"]') as HTMLElement;
		expect(bar).toHaveAttribute('data-dropped', 'false');
		const pill = document.createElement('button');
		document.body.append(pill);
		dock.drop(pill);
		await waitFor(() => expect(bar).toHaveAttribute('data-dropped', 'true'));
		// MAJOR-1 (r1): the bar already exists, so the r0 `starting:` never played; the theme's keyframe moves it in.
		expect(bar).toHaveClass('fixed', 'top-bar-top', 'animate-search-drop');
		expect([...bar.classList].some((name) => name.startsWith('starting:'))).toBe(false);
		const scrim = document.querySelector('[data-slot="home-search-scrim"]') as HTMLElement;
		expect(scrim).toHaveClass('fixed', 'inset-0', 'bg-secondary/25');
		await fireEvent.keyDown(document, { key: 'Escape' });
		await waitFor(() => expect(dock.dropped).toBe(false));
		expect(bar).toHaveAttribute('data-dropped', 'false');
		await waitFor(() => expect(pill).toHaveFocus());
		pill.remove();
		view.unmount();
		expect(dock.available).toBe(false);
	});
});

// 🔴 BLOCKER-1 of the architecture audit (U-29.3): the «Όλοι» rows are TanStack Query's, never a copy in runes.
describe('DiscoveryHome · the «Όλοι» rows in TanStack Query (U-29.3)', () => {
	const testClient = () =>
		new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
	const allKey = (id: SectionId) => searchDoctorsQueryKeys.homeSection(id, 'el', {});

	it('U-29.3: each «Όλοι» row is ONE query on the key of its `fetchHomeSection` (the empty category scope), the streamed answer its data', async () => {
		const client = testClient();
		render(Harness, {
			props: { data: homeData([ok([doctor('1')]), { status: 'error' }, ok([])]), client }
		});
		await screen.findByTestId('home-error');
		expect(client.getQueryData(allKey('popular-athens'))).toEqual({
			id: 'popular-athens',
			doctors: [doctor('1')],
			criteria: athensCriteria
		});
		expect(client.getQueryState(allKey('popular-psychologists'))?.status).toBe('error');
		expect(client.getQueryData(allKey('internal-medicine-gp'))).toEqual({
			id: 'internal-medicine-gp',
			doctors: [],
			criteria: athensCriteria
		});
		// «Δοκιμή ξανά» refetches that same query: its answer lands on the same key.
		fetchHomeSection.mockResolvedValue({
			id: 'popular-psychologists',
			items: [card('again')],
			link: athensLink
		});
		await user().click(screen.getByRole('button', { name: 'Δοκιμή ξανά' }));
		await waitFor(() =>
			expect(client.getQueryData(allKey('popular-psychologists'))).toMatchObject({
				doctors: [doctor('again')]
			})
		);
		expect(fetchHomeSection).toHaveBeenCalledOnce();
	});

	it('U-29.3 (negative): a new page load never shows the previous one’s cards — its rows wait for their own answers', async () => {
		const view = render(Harness, { props: { data: homeData([ok([doctor('old')])]) } });
		await waitFor(() => expect(rows()).toHaveLength(1));
		let land: ((result: HomeRowResult) => void) | undefined;
		const next = new Promise<HomeRowResult>((resolve) => (land = resolve));
		await view.rerender({ data: homeData([next, ok([]), ok([])]) });
		await waitFor(() =>
			expect(rowsBox().querySelectorAll('[data-slot="home-row-skeleton"]')).toHaveLength(1)
		);
		expect(screen.queryByRole('link', { name: /Γιατρός old/u })).not.toBeInTheDocument();
		land?.(ok([doctor('new')]));
		await waitFor(() => expect(screen.getByRole('link', { name: /Γιατρός new/u })).toBeVisible());
		expect(screen.queryByRole('link', { name: /Γιατρός old/u })).not.toBeInTheDocument();
		expect(fetchHomeSection).not.toHaveBeenCalled();
	});

	it('U-29.3 (negative): cards an earlier visit left in the cache never stand in for this load’s answers', () => {
		const client = testClient();
		for (const id of ids) {
			client.setQueryData(allKey(id), { id, doctors: [doctor(`cached-${id}`)], criteria: null });
		}
		const pending = new Promise<HomeRowResult>(() => {});
		render(Harness, { props: { data: homeData([pending, pending, pending]), client } });
		expect(rowsBox().querySelectorAll('[data-slot="home-row-skeleton"]')).toHaveLength(3);
		expect(screen.queryAllByRole('link', { name: /Γιατρός cached-/u })).toHaveLength(0);
		for (const id of ids) expect(client.getQueryData(allKey(id))).toBeUndefined();
	});

	it('U-29.3 (D-103, negative): the streamed rows ask nothing of their own — not on mount, nor on focus or reconnect', async () => {
		render(Harness, { props: { data: homeData([ok([doctor('1')]), { status: 'error' }]) } });
		await screen.findByTestId('home-error');
		focusManager.setFocused(false);
		focusManager.setFocused(true);
		onlineManager.setOnline(false);
		onlineManager.setOnline(true);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(fetchHomeSection).not.toHaveBeenCalled();
		expect(screen.getByTestId('home-error')).toBeInTheDocument();
		focusManager.setFocused(undefined);
	});
});

function user() {
	return userEvent.setup({ delay: null });
}
