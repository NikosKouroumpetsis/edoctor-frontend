import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { onlineManager } from '@tanstack/svelte-query';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { DeviceLocationResult } from '$shared/lib/location';
import {
	searchResultsHref,
	type SearchDoctorsCriteria
} from '$modules/search-doctors/lib/search-criteria';
import { forgetDeviceLocation, rememberDeviceLocation } from '$shared/state/device-location';
import type { CriteriaState } from '../hooks/use-state.svelte';
import Harness from './search-criteria.harness.svelte';

const { getFacets, getDoctorSuggestions, getLocationSuggestions, resolveDeviceLocation } =
	vi.hoisted(() => ({
		getFacets: vi.fn(),
		getDoctorSuggestions: vi.fn(),
		getLocationSuggestions: vi.fn(),
		resolveDeviceLocation: vi.fn()
	}));
// No call leaves the test: the search's three reads and the device's position are stand-ins.
vi.mock('$modules/search-doctors/api/marketplace/endpoints', async (importOriginal) => ({
	...(await importOriginal<typeof import('$modules/search-doctors/api/marketplace/endpoints')>()),
	getFacets,
	getDoctorSuggestions,
	getLocationSuggestions
}));
vi.mock('$shared/lib/location', async (importOriginal) => ({
	...(await importOriginal<typeof import('$shared/lib/location')>()),
	resolveDeviceLocation
}));

// The words as read: every run of spaces (`\s` takes the no-break ones of the dates too) one space.
const text = (element: Element | null) => (element?.textContent ?? '').replace(/\s+/gu, ' ').trim();

const facets = (specialties: unknown) => ({
	pricingVisible: false,
	appliedFilters: {},
	facets: {
		paymentOptions: [],
		services: [],
		genders: [],
		speakLanguages: [],
		priceRange: null,
		specialties
	}
});
const popular = [
	{ value: 'prof-cardio', label: 'Καρδιολόγος', count: 12 },
	{ value: 'prof-paido', label: 'Παιδίατρος', count: 9 },
	{ value: 'prof-dent', label: 'Οδοντίατρος', count: 4 }
];
const suggestionItems = [
	{ type: 'professional', id: 'prof-cardio', slug: 'kardiologos', label: 'Καρδιολόγος' },
	{ type: 'professional', id: 'prof-surgeon', slug: 'kardiochirourgos', label: 'Καρδιοχειρουργός' },
	{ type: 'service', id: 'svc-echo', slug: 'yperichos-kardias', label: 'Υπέρηχος καρδιάς' },
	{
		type: 'doctor',
		id: 'doc-1',
		slug: 'dr-eleni-karra',
		label: 'Ελένη Καρρά',
		supportingLabel: 'Δερματολόγος · Κηφισιά'
	}
];
const place = (slug: string, type: string, label: string, regionalUnit: string | null) => ({
	slug,
	type,
	label,
	displayName: label,
	context: null,
	hierarchy: { region: 'Αττική', regionalUnit, municipality: null },
	latitude: 37.94,
	longitude: 23.64
});
const piraeusUnit = place(
	'server-piraeus-unit',
	'REGIONAL_UNIT',
	'Περιφερειακή Ενότητα Πειραιά',
	null
);
const centralAthens = place(
	'server-central-athens',
	'REGIONAL_UNIT',
	'Κεντρικός Τομέας Αθηνών',
	null
);
// The server's hidden full name (S-03.2 / S-17): never the row's words.
const piraeusTown = {
	...place('server-piraeus', 'MUNICIPALITY', 'Πειραιάς', 'Περιφερειακή Ενότητα Πειραιά'),
	displayName: 'Πειραιάς, Δήμος Πειραιά, Αττική'
};

function answerLocations(query: string) {
	if (query === 'Περιφερειακή Ενότητα Πειραιά') return { items: [piraeusUnit], language: 'el' };
	if (query === 'Κεντρικός Τομέας Αθηνών') return { items: [centralAthens], language: 'el' };
	if (query.startsWith('Πειρ')) return { items: [piraeusTown, piraeusUnit], language: 'el' };
	if (query.startsWith('Αττ'))
		return { items: [place('attiki', 'REGION', 'Αττική', null)], language: 'el' };
	return { items: [], language: 'el' };
}

// 28/10/2026, 12:00 in Athens (a Wednesday): the wave record's dates.
const OCT_28 = Date.UTC(2026, 9, 28, 10, 0);
const DEC_30 = Date.UTC(2026, 11, 30, 10, 0);

type Props = {
	now?: () => number;
	onSubmit?: (criteria: SearchDoctorsCriteria) => void;
	onSelectDoctor?: (option: unknown) => void;
	locale?: 'el' | 'en';
};

/** The search opened on the phone's window (the pill's press), its state handed to the test. */
function renderSearch(props: Props = {}, surface: 'sheet' | 'bar' | null = 'sheet') {
	let state!: CriteriaState;
	const view = render(QueryHarness, {
		props: {
			component: Harness,
			props: { now: () => OCT_28, ...props, onReady: (ready: CriteriaState) => (state = ready) }
		}
	});
	if (surface) {
		state.open(surface);
		flushSync();
	}
	return { ...view, state };
}

const sheet = () => screen.getByTestId('search-criteria-sheet');
const card = (field: string) => screen.getByTestId(`search-criteria-card-${field}`);
const user = () => userEvent.setup({ delay: null });

beforeEach(() => {
	getFacets.mockResolvedValue(facets(popular));
	getDoctorSuggestions.mockResolvedValue({ items: suggestionItems, language: 'el' });
	getLocationSuggestions.mockImplementation(async ({ query }: { query: string }) =>
		answerLocations(query)
	);
	resolveDeviceLocation.mockResolvedValue({ status: 'unavailable' });
});

afterEach(() => {
	onlineManager.setOnline(true);
	getFacets.mockReset();
	getDoctorSuggestions.mockReset();
	getLocationSuggestions.mockReset();
	resolveDeviceLocation.mockReset();
	// The position of the visit is module state of the tab: no test leaves one for the next.
	forgetDeviceLocation();
});

describe('search criteria — the phone’s window (U-21 / U-23.2)', () => {
	it('U-21/U-23.2: only «×» on top (no «Αναζήτηση» title); three cards — «Τι;» open with its big title, «Πού» and «Πότε» closed on «Προσθέστε …»', () => {
		renderSearch();
		const dialog = screen.getByRole('dialog', { name: 'Αναζήτηση Γιατρού' });
		expect(dialog).toBe(sheet());
		expect(within(dialog).queryByRole('heading', { name: 'Αναζήτηση Γιατρού' })).toBeNull();
		const close = within(dialog).getByRole('button', { name: 'Κλείσιμο αναζήτησης' });
		expect(close).toHaveAttribute('data-testid', 'search-criteria-close');
		// U-23.2: the page shows through, blurred (the prototype's rgba(241,245,249,.94) + blur 18).
		expect(dialog).toHaveClass('bg-background/94', 'backdrop-blur-search');
		expect(dialog).not.toHaveClass('bg-background');
		const what = within(card('what')).getByRole('heading', { level: 2, name: 'Τι;' });
		expect(what).toHaveClass('text-heading-md', 'font-bold');
		expect(card('where').tagName).toBe('BUTTON');
		expect(text(card('where'))).toBe('Πού Προσθέστε περιοχή');
		expect(within(card('where')).getByText('Πού')).toHaveClass('text-muted-foreground');
		expect(within(card('where')).getByText('Προσθέστε περιοχή')).toHaveClass('font-semibold');
		expect(within(card('availability')).getByText('Πότε')).toBeInTheDocument();
		expect(within(card('availability')).getByText('Προσθέστε ημερομηνίες')).toBeInTheDocument();
		for (const field of ['what', 'where', 'availability'])
			expect(card(field)).toHaveClass('rounded-xl', 'bg-card');
	});

	it('U-21/U-23.1: at the bottom «Διαγραφή όλων» underlined on the left, «Αναζήτηση» the accent pill with the lens', () => {
		renderSearch();
		const clear = screen.getByTestId('search-criteria-clear-all');
		expect(clear).toHaveAccessibleName('Διαγραφή όλων');
		expect(clear.firstElementChild).toHaveClass('underline');
		const submit = screen.getByTestId('search-criteria-submit');
		expect(submit).toHaveAccessibleName('Αναζήτηση');
		expect(submit).toHaveClass('rounded-full', 'bg-accent');
		expect(submit).not.toHaveClass('rounded-md');
		expect(submit.querySelector('[data-icon="search"]')).not.toBeNull();
	});

	it('U-23.2: the «Τι» field reads «Ειδικότητα, υπηρεσία ή γιατρός» (56, rim, corner 12); its list scrolls INSIDE the card and fades at its edge', async () => {
		renderSearch();
		const field = within(card('what')).getByRole('button', {
			name: 'Ειδικότητα, υπηρεσία ή γιατρός'
		});
		const box = field.closest('[data-slot="search-field"]') as HTMLElement;
		expect(box).toHaveAttribute('data-variant', 'launcher');
		expect(box).toHaveClass('min-h-row', 'rounded-md', 'border');
		const list = await within(card('what')).findByTestId('search-criteria-what-recommended');
		const scroller = list.closest('.overflow-y-auto') as HTMLElement;
		expect(card('what')).toContainElement(scroller);
		expect(scroller).toHaveClass('min-h-0', 'edge-fade-bottom');
	});

	it('D-103: the popular specialties are asked the moment the search opens — never after its motion', () => {
		renderSearch();
		expect(getFacets).toHaveBeenCalledTimes(1);
		expect(getFacets).toHaveBeenCalledWith('el', expect.anything());
	});

	/**
	 * 🔴 The ready «Πού» rows (S-18.8: Πειραιάς, Κεντρικός Τομέας…) are asked when the search OPENS (D2 app review r1,
	 * MINOR-2; the application's HEAD and today's): with «Τι» open, on the phone's window and on the bar from 744, so
	 * «Πού» reads them from the cache. Documented negative: before D3 they were asked only when «Πού» opened.
	 */
	it.each(['sheet', 'bar'] as const)(
		'D-103 / U-23.2 (app = web): the ready «Πού» rows are asked when the search opens, while «Τι» is open (%s)',
		async (surface) => {
			const { state } = renderSearch({}, surface);
			expect(state.expandedField).toBe('what');
			await waitFor(() =>
				expect(getLocationSuggestions).toHaveBeenCalledWith(
					{ query: 'Περιφερειακή Ενότητα Πειραιά', lang: 'el' },
					expect.anything()
				)
			);
			expect(getLocationSuggestions).toHaveBeenCalledWith(
				{ query: 'Κεντρικός Τομέας Αθηνών', lang: 'el' },
				expect.anything()
			);
		}
	);

	it('D-103 (negative): a search that is not open asks none of the ready «Πού» rows', async () => {
		renderSearch({}, null);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(getLocationSuggestions).not.toHaveBeenCalled();
	});

	it('U-23.2: a pick in «Τι» opens «Πού», a pick there opens «Πότε», which stays open on its ✓', async () => {
		const { state } = renderSearch();
		await user().click(await screen.findByTestId('search-criteria-option-prof-cardio'));
		expect(state.criteria.what).toBe('Καρδιολόγος');
		await waitFor(() =>
			expect(within(card('where')).getByRole('heading', { name: 'Πού;' })).toBeInTheDocument()
		);
		expect(text(card('what'))).toBe('Τι Καρδιολόγος');
		await user().click(screen.getByTestId('search-criteria-option-attiki'));
		await waitFor(() =>
			expect(
				within(card('availability')).getByRole('heading', { name: 'Πότε;' })
			).toBeInTheDocument()
		);
		expect(text(card('where'))).toBe('Πού Αττική');
		await user().click(screen.getByTestId('search-criteria-option-next3Days'));
		expect(
			within(card('availability')).getByRole('heading', { name: 'Πότε;' })
		).toBeInTheDocument();
		expect(screen.getByTestId('search-criteria-option-next3Days')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	// MAJOR-1 (r1): the pressed card's button gives way to the card; the focus never falls to the page under the window.
	const launcherOf = (field: string) =>
		card(field).querySelector('[data-slot="search-field-launcher"]') as HTMLElement;

	it('U-23.2 (a): Enter on the closed «Πού» opens it with the focus inside it — `document.activeElement` never the body', async () => {
		renderSearch();
		await screen.findByTestId('search-criteria-what-recommended');
		card('where').focus();
		expect(card('where')).toHaveFocus();
		await user().keyboard('{Enter}');
		await waitFor(() => expect(launcherOf('where')).toHaveFocus());
		expect(card('where')).toContainElement(document.activeElement as HTMLElement);
		expect(document.activeElement).not.toBe(document.body);
		// And on to «Πότε» by keyboard: its first row takes the focus (it has no field).
		card('availability').focus();
		await user().keyboard('{Enter}');
		await waitFor(() =>
			expect(card('availability')).toContainElement(document.activeElement as HTMLElement)
		);
		expect(document.activeElement).toHaveAttribute('data-testid', 'search-criteria-option-today');
	});

	it('U-23.2 (b): Enter on a recommended specialty of «Τι» puts the focus on the field of the «Πού» it opens — never the body', async () => {
		renderSearch();
		const row = await screen.findByTestId('search-criteria-option-prof-cardio');
		row.focus();
		await user().keyboard('{Enter}');
		await waitFor(() => expect(launcherOf('where')).toHaveFocus());
		expect(document.activeElement).not.toBe(document.body);
		// A pick of «Πού» by keyboard moves it on to «Πότε», still inside the window.
		const attiki = within(card('where')).getByTestId('search-criteria-option-attiki');
		attiki.focus();
		await user().keyboard('{Enter}');
		await waitFor(() =>
			expect(card('availability')).toContainElement(document.activeElement as HTMLElement)
		);
		expect(document.activeElement).not.toBe(document.body);
	});

	it('U-23.2 (negative): a focus still on a live control is left where it is — «Διαγραφή όλων» keeps it', async () => {
		renderSearch();
		await user().click(await screen.findByTestId('search-criteria-option-prof-cardio'));
		await waitFor(() => expect(launcherOf('where')).toHaveFocus());
		const clear = screen.getByTestId('search-criteria-clear-all');
		clear.focus();
		await user().keyboard('{Enter}');
		await waitFor(() =>
			expect(within(card('what')).getByRole('heading', { name: 'Τι;' })).toBeInTheDocument()
		);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(clear).toHaveFocus();
	});

	it('U-21 (app = web): «Αναζήτηση» sends the criteria; the address carries exactly the application’s names', async () => {
		const onSubmit = vi.fn();
		renderSearch({ onSubmit });
		await user().click(await screen.findByTestId('search-criteria-option-prof-cardio'));
		await user().click(screen.getByTestId('search-criteria-option-attiki'));
		await user().click(screen.getByTestId('search-criteria-option-next3Days'));
		await user().click(screen.getByTestId('search-criteria-submit'));
		expect(onSubmit).toHaveBeenCalledTimes(1);
		const criteria = onSubmit.mock.calls[0][0] as SearchDoctorsCriteria;
		const href = searchResultsHref('/doctors', criteria);
		const params = new URL(href, 'https://edoctor.test').searchParams;
		expect([...params.keys()].sort()).toEqual(
			[
				'availability',
				'what',
				'where',
				'whatKind',
				'whatId',
				'whatLabel',
				'whereKind',
				'whereLabel'
			].sort()
		);
		expect(params.get('whatKind')).toBe('professional');
		expect(params.get('whatId')).toBe('prof-cardio');
		expect(params.get('where')).toBe('attiki');
		expect(params.get('whereKind')).toBe('text');
		expect(params.get('availability')).toBe('next3Days');
	});

	it('U-23.2: «Διαγραφή όλων» empties every card and opens «Τι»', async () => {
		const { state } = renderSearch();
		await user().click(await screen.findByTestId('search-criteria-option-prof-cardio'));
		await user().click(screen.getByTestId('search-criteria-clear-all'));
		expect(state.criteria.what).toBe('');
		await waitFor(() =>
			expect(within(card('what')).getByRole('heading', { name: 'Τι;' })).toBeInTheDocument()
		);
	});

	it('U-21: «×» and Escape close the window; Escape on the typing page closes only the page', async () => {
		const { state } = renderSearch();
		await user().click(
			within(card('what')).getByRole('button', { name: 'Ειδικότητα, υπηρεσία ή γιατρός' })
		);
		expect(state.activeSearchPanel).toBe('what');
		await user().keyboard('{Escape}');
		expect(state.activeSearchPanel).toBeNull();
		expect(state.surface).toBe('sheet');
		// Back on the card, the focus is on its field again (never on the page under the window).
		await waitFor(() =>
			expect(
				within(card('what')).getByRole('button', { name: 'Ειδικότητα, υπηρεσία ή γιατρός' })
			).toHaveFocus()
		);
		await user().keyboard('{Escape}');
		expect(state.surface).toBeNull();
		state.open('sheet');
		flushSync();
		await user().click(screen.getByTestId('search-criteria-close'));
		expect(state.surface).toBeNull();
	});
});

describe('search criteria — «Τι;» (the application’s `CriteriaWhatResults`)', () => {
	describe('empty query (popular specialties)', () => {
		it('shows the recommended header and a loading placeholder while pending', () => {
			getFacets.mockImplementation(() => new Promise(() => {}));
			renderSearch();
			expect(within(card('what')).getByText('Προτεινόμενες ειδικότητες')).toBeInTheDocument();
			expect(within(card('what')).getByTestId('search-criteria-what-loading')).toBeInTheDocument();
		});

		it('renders popular specialties on success', async () => {
			renderSearch();
			const list = await screen.findByTestId('search-criteria-what-recommended');
			expect(within(list).getByText('Προτεινόμενες ειδικότητες')).toBeInTheDocument();
			expect(
				within(list)
					.getAllByRole('button')
					.map((row) => row.getAttribute('data-testid'))
			).toEqual([
				'search-criteria-option-prof-cardio',
				'search-criteria-option-prof-paido',
				'search-criteria-option-prof-dent'
			]);
		});

		it('falls back to the static default suggestions on error', async () => {
			getFacets.mockRejectedValue(new Error('down'));
			renderSearch();
			const list = await screen.findByTestId('search-criteria-what-recommended');
			expect(within(list).getByText('Παθολόγος')).toBeInTheDocument();
			expect(within(list).getByText('Παιδίατρος')).toBeInTheDocument();
			expect(within(list).getByText('Οδοντίατρος')).toBeInTheDocument();
			expect(screen.queryByTestId('search-criteria-what-error')).toBeNull();
		});

		it('falls back to the static default suggestions when the bucket is absent', async () => {
			getFacets.mockResolvedValue(facets(undefined));
			renderSearch();
			const list = await screen.findByTestId('search-criteria-what-recommended');
			expect(
				within(list).getByTestId('search-criteria-option-internal-medicine')
			).toBeInTheDocument();
		});

		it('U-21 (§6.2): each specialty its own glyph in the 56 tile, the 15 name and «Ειδικότητα» under it', async () => {
			renderSearch();
			const row = await screen.findByTestId('search-criteria-option-prof-cardio');
			expect(row).toHaveClass('min-h-row-lg', 'px-4');
			const tile = row.querySelector('[data-slot="option-row-tile"]') as HTMLElement;
			expect(tile).toHaveClass('size-tile', 'rounded-md');
			expect(tile.querySelector('[data-icon="fitness-outline"]')).not.toBeNull();
			expect(
				screen
					.getByTestId('search-criteria-option-prof-paido')
					.querySelector('[data-icon="happy-outline"]')
			).not.toBeNull();
			expect(
				screen
					.getByTestId('search-criteria-option-prof-dent')
					.querySelector('[data-icon="tooth-outline"]')
			).not.toBeNull();
			expect(within(row).getByText('Καρδιολόγος')).toHaveClass('text-body-md');
			expect(within(row).getByText('Ειδικότητα')).toHaveClass(
				'text-body-sm',
				'text-muted-foreground'
			);
		});
	});

	describe('typeahead (query >= 3 chars)', () => {
		async function typeWhat(words: string) {
			await user().click(
				within(card('what')).getByRole('button', { name: 'Ειδικότητα, υπηρεσία ή γιατρός' })
			);
			await user().type(screen.getByTestId('search-criteria-what-input'), words);
		}

		it('shows the loading placeholder while pending', async () => {
			getDoctorSuggestions.mockImplementation(() => new Promise(() => {}));
			renderSearch();
			await typeWhat('καρ');
			expect(await screen.findByTestId('search-criteria-what-loading')).toBeInTheDocument();
		});

		it('shows an error with a working retry', async () => {
			getDoctorSuggestions.mockRejectedValueOnce(new Error('down'));
			renderSearch();
			await typeWhat('καρ');
			const error = await screen.findByTestId('search-criteria-what-error');
			expect(error).toHaveTextContent('Δεν ήταν δυνατή η φόρτωση προτάσεων.');
			await user().click(screen.getByTestId('search-criteria-what-retry'));
			expect(await screen.findByTestId('search-criteria-what-results')).toBeInTheDocument();
			expect(getDoctorSuggestions).toHaveBeenCalledTimes(2);
		});

		it('shows the no-results state when the grouped result is empty', async () => {
			getDoctorSuggestions.mockResolvedValue({ items: [], language: 'el' });
			renderSearch();
			await typeWhat('ξξξ');
			expect(await screen.findByTestId('search-criteria-what-empty')).toHaveTextContent(
				'Δεν βρέθηκαν αποτελέσματα'
			);
		});

		it('renders grouped category headers and rows on success', async () => {
			renderSearch();
			await typeWhat('καρ');
			const results = await screen.findByTestId('search-criteria-what-results');
			const headers = [...results.querySelectorAll('[data-slot="suggestion-group-header"]')];
			expect(headers.map((header) => header.textContent?.trim())).toEqual([
				'Ειδικότητες',
				'Υπηρεσίες',
				'Γιατροί'
			]);
			// U-21 (§6.2): the group words 12/600 muted.
			expect(headers[0].querySelector('span')).toHaveClass(
				'text-label-md',
				'font-semibold',
				'text-muted-foreground'
			);
			expect(within(results).getAllByRole('option')).toHaveLength(4);
		});

		it('forwards a tapped specialty option to onSelect', async () => {
			const { state } = renderSearch();
			await typeWhat('καρ');
			// Until the typing pauses the page shows the recommended rows (the same id); the typeahead's comes next.
			const results = await screen.findByTestId('search-criteria-what-results');
			await user().click(within(results).getByTestId('search-criteria-option-prof-cardio'));
			expect(state.criteria.whatSelection).toEqual({
				kind: 'professional',
				label: 'Καρδιολόγος',
				id: 'prof-cardio',
				slug: 'kardiologos'
			});
			expect(state.activeSearchPanel).toBeNull();
		});

		it('forwards a tapped doctor option to onSelect', async () => {
			const onSelectDoctor = vi.fn();
			const { state } = renderSearch({ onSelectDoctor });
			await typeWhat('καρ');
			// A doctor's row is known by its slug (the application's `stableValue`).
			await user().click(await screen.findByTestId('search-criteria-option-dr-eleni-karra'));
			expect(onSelectDoctor).toHaveBeenCalledWith(
				expect.objectContaining({ kind: 'doctor', slug: 'dr-eleni-karra' })
			);
			expect(state.criteria.whatSelection).toBeNull();
		});

		it('U-21/U-23.2: the typing page — «‹», the field with its bold rim and «×»; the typed letters bold at the start of a word', async () => {
			renderSearch();
			await typeWhat('καρ');
			const page = screen.getByTestId('search-criteria-typing-page');
			const box = screen
				.getByTestId('search-criteria-what-input')
				.closest('[data-slot="search-field"]') as HTMLElement;
			expect(box).toHaveAttribute('data-variant', 'active');
			expect(box).toHaveClass('border-2', 'border-foreground');
			expect(within(page).getByRole('button', { name: 'Πίσω' })).toBeInTheDocument();
			expect(within(page).getByRole('button', { name: 'Καθαρισμός πεδίου' })).toBeInTheDocument();
			const service = await screen.findByTestId('search-criteria-option-yperichos-kardias');
			const bold = service.querySelector('[data-slot="highlight-text-match"]');
			expect(bold?.textContent).toBe('καρ');
			expect(service.querySelector('[data-icon="document-text-outline"]')).not.toBeNull();
			expect(
				screen
					.getByTestId('search-criteria-option-dr-eleni-karra')
					.querySelector('[data-icon="person-outline"]')
			).not.toBeNull();
		});

		it('U-21 (app = web): the typeahead asks once the typing pauses (the application’s 500 ms), never per letter', async () => {
			renderSearch();
			await typeWhat('καρδ');
			expect(getDoctorSuggestions).not.toHaveBeenCalled();
			await waitFor(() => expect(getDoctorSuggestions).toHaveBeenCalledTimes(1), { timeout: 1500 });
			expect(getDoctorSuggestions).toHaveBeenCalledWith(
				expect.objectContaining({
					query: 'καρδ',
					lang: 'el',
					types: ['professional', 'service', 'doctor'],
					limitPerType: 4
				}),
				expect.anything()
			);
		});

		it('U-21 (app = web, offline): a typeahead asked without a network is the error with «Δοκιμάστε ξανά» — never «no results»', async () => {
			onlineManager.setOnline(false);
			renderSearch();
			await typeWhat('καρ');
			expect(await screen.findByTestId('search-criteria-what-error')).toBeInTheDocument();
			expect(screen.queryByTestId('search-criteria-what-empty')).toBeNull();
			expect(getDoctorSuggestions).not.toHaveBeenCalled();
		});
	});
});

describe('search criteria — «Πού;» (the application’s `CriteriaWhereResults`)', () => {
	function openWhere(state: CriteriaState) {
		state.updateExpandedField('where');
		flushSync();
	}

	describe('empty/short query (ready rows)', () => {
		it('S-11.2: shows the recommended header with «Near me» first, then Attica and the found regional units', async () => {
			const { state } = renderSearch({ locale: 'en' });
			openWhere(state);
			const list = await screen.findByTestId('search-criteria-where-recommended');
			expect(within(list).getByText('Recommended areas')).toBeInTheDocument();
			await waitFor(() =>
				expect(
					within(list)
						.getAllByRole('button')
						.map((row) => row.getAttribute('data-testid'))
				).toEqual([
					'search-criteria-option-current-location',
					'search-criteria-option-attiki',
					'search-criteria-option-server-piraeus-unit',
					'search-criteria-option-server-central-athens'
				])
			);
			expect(within(list).getByText('Near me')).toBeInTheDocument();
			// The application's negative: never the old «My location» words.
			expect(within(list).queryByText('My location')).toBeNull();
		});

		it('S-18.8: ready regional-unit rows look up the exact Greek name and stay hidden when the server has no exact match', async () => {
			getLocationSuggestions.mockImplementation(async ({ query }: { query: string }) =>
				query === 'Περιφερειακή Ενότητα Πειραιά'
					? { items: [{ ...piraeusUnit, label: 'Περιφερειακή Ενότητα Πειραιά Β' }], language: 'el' }
					: answerLocations(query)
			);
			const { state } = renderSearch();
			openWhere(state);
			await screen.findByTestId('search-criteria-option-server-central-athens');
			expect(getLocationSuggestions).toHaveBeenCalledWith(
				{ query: 'Περιφερειακή Ενότητα Πειραιά', lang: 'el' },
				expect.anything()
			);
			expect(screen.queryByTestId('search-criteria-option-server-piraeus-unit')).toBeNull();
		});

		it('S-18.8: a ready regional unit the server does not find is not shown', async () => {
			getLocationSuggestions.mockImplementation(async ({ query }: { query: string }) =>
				query === 'Κεντρικός Τομέας Αθηνών' ? { items: [], language: 'el' } : answerLocations(query)
			);
			const { state } = renderSearch();
			openWhere(state);
			await screen.findByTestId('search-criteria-option-server-piraeus-unit');
			expect(screen.queryByTestId('search-criteria-option-server-central-athens')).toBeNull();
		});

		it('S-18.8: tapping a regional-unit ready row commits that regional unit, never a plain region', async () => {
			const { state } = renderSearch();
			openWhere(state);
			await user().click(await screen.findByTestId('search-criteria-option-server-piraeus-unit'));
			expect(state.criteria.whereSelection).toEqual({
				kind: 'location',
				label: 'Περιφερειακή Ενότητα Πειραιά',
				slug: 'server-piraeus-unit',
				locationType: 'REGIONAL_UNIT'
			});
		});

		it('S-18.8: ready rows are Κοντά μου, Αττική, Περιφερειακή Ενότητα Πειραιά, Κεντρικός Τομέας Αθηνών — no Αθήνα', async () => {
			const { state } = renderSearch();
			openWhere(state);
			const list = await screen.findByTestId('search-criteria-where-recommended');
			expect(within(list).getByText('Προτεινόμενες περιοχές')).toBeInTheDocument();
			await screen.findByTestId('search-criteria-option-server-central-athens');
			// The application's order, row for row, and its negatives.
			expect(
				within(list)
					.getAllByRole('button')
					.map((row) => row.getAttribute('data-testid'))
			).toEqual([
				'search-criteria-option-current-location',
				'search-criteria-option-attiki',
				'search-criteria-option-server-piraeus-unit',
				'search-criteria-option-server-central-athens'
			]);
			expect(within(list).getByText('Κοντά μου')).toBeInTheDocument();
			expect(within(list).getByText('Περιφερειακή Ενότητα Πειραιά')).toBeInTheDocument();
			expect(within(list).getByText('Κεντρικός Τομέας Αθηνών')).toBeInTheDocument();
			expect(within(list).getAllByText('Αττική')).toHaveLength(3);
			expect(screen.queryByTestId('search-criteria-option-athens')).toBeNull();
			expect(within(list).queryByText('Αθήνα')).toBeNull();
			expect(within(list).queryByText('Η τοποθεσία μου')).toBeNull();
		});

		it('S-19.1: the ready «Αττική» row stays exactly as today', async () => {
			const { state } = renderSearch();
			openWhere(state);
			const row = await screen.findByTestId('search-criteria-option-attiki');
			expect(within(row).getByText('Αττική')).toBeInTheDocument();
			expect(within(row).getByText('Περιφέρεια')).toBeInTheDocument();
			await user().click(row);
			expect(state.criteria.where).toBe('attiki');
			expect(state.criteria.whereSelection).toBeNull();
		});

		it('U-21/U-23.2: «Κοντά μου» is first, the blue arrow on the blue tile, «Τρέχουσα τοποθεσία» under it; the areas wear the pin', async () => {
			const { state } = renderSearch();
			openWhere(state);
			const near = await screen.findByTestId('search-criteria-option-current-location');
			const tile = near.querySelector('[data-slot="option-row-tile"]') as HTMLElement;
			expect(tile).toHaveAttribute('data-tone', 'primary');
			expect(tile).toHaveClass('bg-primary/10');
			expect(tile.querySelector('[data-icon="navigate-outline"]')).toHaveClass('text-primary');
			expect(within(near).getByText('Τρέχουσα τοποθεσία')).toBeInTheDocument();
			const attiki = screen.getByTestId('search-criteria-option-attiki');
			expect(attiki.querySelector('[data-icon="location-outline"]')).not.toBeNull();
			expect(attiki.querySelector('[data-slot="option-row-tile"]')).toHaveAttribute(
				'data-tone',
				'neutral'
			);
		});

		it('shows a pending spinner on the current-location row and disables every row while resolving', async () => {
			resolveDeviceLocation.mockImplementation(() => new Promise<DeviceLocationResult>(() => {}));
			const { state } = renderSearch();
			openWhere(state);
			await screen.findByTestId('search-criteria-option-server-piraeus-unit');
			await user().click(screen.getByTestId('search-criteria-option-current-location'));
			const near = screen.getByTestId('search-criteria-option-current-location');
			expect(near).toHaveAttribute('aria-busy', 'true');
			expect(
				within(near).getByTestId('search-criteria-option-current-location-busy')
			).toBeInTheDocument();
			expect(screen.getByTestId('search-criteria-option-attiki')).toBeDisabled();
			expect(screen.getByTestId('search-criteria-option-server-piraeus-unit')).toBeDisabled();
		});

		// Rewritten for the web (a page cannot open the browser's settings): the refusal's message, no action.
		it('renders the permission-denied error with a working open-settings action — web: a page cannot open the browser’s settings, no action', async () => {
			resolveDeviceLocation.mockResolvedValue({ status: 'denied', canAskAgain: false });
			const { state } = renderSearch();
			openWhere(state);
			await user().click(await screen.findByTestId('search-criteria-option-current-location'));
			const error = await screen.findByTestId('search-criteria-location-error');
			expect(error).toHaveTextContent(
				'Δεν δώσατε πρόσβαση στην τοποθεσία. Παρακαλώ ενεργοποιήστε την πρόσβαση.'
			);
			expect(error).toHaveAttribute('role', 'alert');
			expect(within(error).queryByRole('button')).toBeNull();
		});

		it('forwards a tapped static region to onSelect', async () => {
			const { state } = renderSearch();
			openWhere(state);
			await user().click(await screen.findByTestId('search-criteria-option-attiki'));
			expect(state.criteria.where).toBe('attiki');
		});
	});

	describe('typeahead (query >= 3 chars)', () => {
		async function typeWhere(state: CriteriaState, words: string) {
			openWhere(state);
			await user().click(within(card('where')).getByRole('button', { name: 'Αναζήτηση περιοχής' }));
			await user().type(screen.getByTestId('search-criteria-where-input'), words);
		}

		// The application's `use-location-suggestions-query` guard: the position of the visit (`lib/device-location`)
		// reaches the «Πού» typeahead through the state, and leaves it when it is forgotten.
		it('folds the stored device coordinates into the request and the query key', async () => {
			rememberDeviceLocation({ latitude: 37.98, longitude: 23.72 });
			const { state } = renderSearch();
			await typeWhere(state, 'Πειρ');
			await waitFor(() =>
				expect(getLocationSuggestions).toHaveBeenCalledWith(
					{ query: 'Πειρ', lang: 'el', lat: 37.98, lng: 23.72 },
					expect.anything()
				)
			);
			// Negative: forgotten, the next request carries no position.
			forgetDeviceLocation();
			await user().type(screen.getByTestId('search-criteria-where-input'), 'α');
			await waitFor(() =>
				expect(getLocationSuggestions.mock.calls.at(-1)?.[0].query).toBe('Πειρα')
			);
			const last = getLocationSuggestions.mock.calls.at(-1)?.[0];
			expect(last.lat).toBeUndefined();
			expect(last.lng).toBeUndefined();
		});

		it('shows the loading placeholder while pending', async () => {
			const { state } = renderSearch();
			getLocationSuggestions.mockImplementation(async ({ query }: { query: string }) =>
				query.startsWith('Πειρ') ? new Promise(() => {}) : answerLocations(query)
			);
			await typeWhere(state, 'Πειρ');
			expect(await screen.findByTestId('search-criteria-where-loading')).toBeInTheDocument();
		});

		it('shows an error with a working retry', async () => {
			let fail = true;
			getLocationSuggestions.mockImplementation(async ({ query }: { query: string }) => {
				if (query.startsWith('Πειρ') && fail) {
					fail = false;
					throw new Error('down');
				}
				return answerLocations(query);
			});
			const { state } = renderSearch();
			await typeWhere(state, 'Πειρ');
			const error = await screen.findByTestId('search-criteria-where-error');
			expect(error).toHaveTextContent('Δεν ήταν δυνατή η φόρτωση περιοχών.');
			await user().click(screen.getByTestId('search-criteria-where-retry'));
			expect(await screen.findByTestId('search-criteria-where-results')).toBeInTheDocument();
		});

		it('shows the no-results state when the flat list is empty', async () => {
			const { state } = renderSearch();
			await typeWhere(state, 'ξξξ');
			expect(await screen.findByTestId('search-criteria-where-empty')).toHaveTextContent(
				'Δεν βρέθηκαν αποτελέσματα'
			);
		});

		it('renders a flat relevance-ordered list with breadcrumbs and no group headers', async () => {
			const { state } = renderSearch();
			await typeWhere(state, 'Πειρ');
			const results = await screen.findByTestId('search-criteria-where-results');
			expect(
				within(results)
					.getAllByRole('option')
					.map((row) => row.getAttribute('data-testid'))
			).toEqual([
				'search-criteria-option-server-piraeus',
				'search-criteria-option-server-piraeus-unit'
			]);
			expect(results.querySelector('[data-slot="suggestion-group-header"]')).toBeNull();
			// S-03.2 / S-28: the name big, «Π.Ε., Περιφέρεια» small.
			const town = screen.getByTestId('search-criteria-option-server-piraeus');
			expect(within(town).getByText('Περιφερειακή Ενότητα Πειραιά, Αττική')).toBeInTheDocument();
			// S-03.2 / S-17 (the application's negative): never the server's old full name.
			expect(within(results).queryByText('Πειραιάς, Δήμος Πειραιά, Αττική')).toBeNull();
			expect(town).not.toHaveTextContent('Δήμος Πειραιά');
		});

		it('S-19.3 / S-23: the list shows only rows returned by the server (no app-made rows): «Αττ» ⇒ [Αττική]', async () => {
			const { state } = renderSearch();
			await typeWhere(state, 'Αττ');
			const results = await screen.findByTestId('search-criteria-where-results');
			expect(
				within(results)
					.getAllByRole('option')
					.map((row) => row.getAttribute('data-testid'))
			).toEqual(['search-criteria-option-attiki']);
			expect(screen.queryByTestId('search-criteria-option-current-location')).toBeNull();
		});

		it('forwards a tapped location row to onSelectLocation', async () => {
			const { state } = renderSearch();
			await typeWhere(state, 'Πειρ');
			await user().click(await screen.findByTestId('search-criteria-option-server-piraeus'));
			expect(state.criteria.whereSelection).toEqual({
				kind: 'location',
				label: 'Πειραιάς',
				slug: 'server-piraeus',
				locationType: 'MUNICIPALITY'
			});
			expect(state.expandedField).toBe('availability');
		});
	});
});

describe('search criteria — «Πότε;» (U-22)', () => {
	function openWhen(state: CriteriaState) {
		state.updateExpandedField('availability');
		flushSync();
	}
	const rowsOf = () => [
		...screen
			.getByTestId('search-criteria-when-options')
			.querySelectorAll('[data-slot="option-row"]')
	];

	it('U-22: the application’s line that explains, then Σήμερα · Επόμενες 3 ημέρες · Επόμενες 7 ημέρες · Οποτεδήποτε with the calendar and their dates (28/10/2026)', () => {
		const { state } = renderSearch({ now: () => OCT_28 });
		openWhen(state);
		const list = screen.getByTestId('search-criteria-when-options');
		expect(
			within(list).getByText('Το «Επόμενες 3 ημέρες» σημαίνει σήμερα, αύριο και μεθαύριο.')
		).toBeInTheDocument();
		expect(rowsOf().map((row) => row.getAttribute('aria-label'))).toEqual([
			'Σήμερα',
			'Επόμενες 3 ημέρες',
			'Επόμενες 7 ημέρες',
			'Οποτεδήποτε'
		]);
		expect(rowsOf().map((row) => text(row.querySelector('[id$="-supporting"]')))).toEqual([
			'Τετ 28 Οκτ',
			'28 – 30 Οκτ',
			'28 Οκτ – 3 Νοε',
			'Όλες οι ημέρες'
		]);
		for (const row of rowsOf())
			expect(row.querySelector('[data-icon="calendar-outline"]')).not.toBeNull();
	});

	it('U-22: across a year’s end the dates follow the backend’s windows (30/12/2026)', () => {
		const { state } = renderSearch({ now: () => DEC_30 });
		openWhen(state);
		expect(rowsOf().map((row) => text(row.querySelector('[id$="-supporting"]')))).toEqual([
			'Τετ 30 Δεκ',
			'30 Δεκ – 1 Ιαν',
			'30 Δεκ – 5 Ιαν',
			'Όλες οι ημέρες'
		]);
	});

	it('U-22 (negative): no row is chosen until one is pressed; the chosen one is the primary tint, the card tile and the blue ✓', async () => {
		const { state } = renderSearch();
		openWhen(state);
		expect(rowsOf().filter((row) => row.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
		expect(text(card('availability'))).not.toContain('Επόμενες 3 ημέρες ✓');
		await user().click(screen.getByTestId('search-criteria-option-next7Days'));
		const chosen = screen.getByTestId('search-criteria-option-next7Days');
		expect(chosen).toHaveAttribute('aria-pressed', 'true');
		expect(chosen).toHaveClass('bg-primary/10');
		expect(chosen.querySelector('[data-slot="option-row-tile"]')).toHaveClass('bg-card');
		expect(chosen.querySelector('[data-icon="checkmark"]')).toHaveClass('text-primary');
		expect(rowsOf().filter((row) => row.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
	});
});

describe('search criteria — the bar from 744 (U-23.2, §6.4)', () => {
	const bar = () => screen.getByTestId('criteria-bar');

	it('U-23.2: the closed bar says «Προσθήκη διαθεσιμότητας»; «Τι» opens typed in the bar, its panel the listbox of the same rows; Enter picks and «Πού» opens', async () => {
		const { state } = renderSearch({}, null);
		expect(within(bar()).getByText('Προσθήκη διαθεσιμότητας')).toBeInTheDocument();
		await user().click(screen.getByTestId('criteria-bar-what'));
		expect(state.surface).toBe('bar');
		const input = screen.getByTestId('criteria-bar-what-input');
		const panel = screen.getByTestId('criteria-bar-panel');
		const list = await within(panel).findByTestId('search-criteria-what-recommended');
		expect(within(list).getByRole('listbox', { name: 'Τι;' })).toHaveAttribute(
			'id',
			input.getAttribute('aria-controls')
		);
		await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(3));
		await user().keyboard('{ArrowDown}{Enter}');
		expect(state.criteria.what).toBe('Καρδιολόγος');
		await waitFor(() => expect(screen.getByTestId('criteria-bar-where-input')).toBeInTheDocument());
		expect(state.expandedField).toBe('where');
	});

	it('U-23.2: typed in the bar, the panel lists the typeahead in groups; the field keeps the choice’s words when it opens again', async () => {
		const { state } = renderSearch({}, null);
		await user().click(screen.getByTestId('criteria-bar-what'));
		await user().type(screen.getByTestId('criteria-bar-what-input'), 'καρ');
		expect(await screen.findByTestId('search-criteria-what-results')).toBeInTheDocument();
		await user().click(screen.getByTestId('search-criteria-option-prof-cardio'));
		expect(state.expandedField).toBe('where');
		await user().click(screen.getByTestId('criteria-bar-what'));
		expect(screen.getByTestId('criteria-bar-what-input')).toHaveValue('Καρδιολόγος');
	});

	it('U-23.2: «Πότε» opens its panel from the bar’s right edge with the line and the four rows; «Τι» and «Πού» from the left', async () => {
		renderSearch({ now: () => OCT_28 }, null);
		await user().click(screen.getByTestId('criteria-bar-where'));
		expect(screen.getByTestId('criteria-bar-panel')).toHaveAttribute('data-align', 'start');
		await user().click(screen.getByTestId('criteria-bar-availability'));
		const panel = screen.getByTestId('criteria-bar-panel');
		expect(panel).toHaveAttribute('data-align', 'end');
		expect(panel).toHaveClass('tablet:w-search-panel-w', 'tablet:rounded-panel');
		const rows = within(panel)
			.getAllByRole('button')
			.filter((row) => row.dataset.slot === 'option-row');
		expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
			'Σήμερα',
			'Επόμενες 3 ημέρες',
			'Επόμενες 7 ημέρες',
			'Οποτεδήποτε'
		]);
		await user().click(within(panel).getByTestId('search-criteria-option-today'));
		expect(
			within(screen.getByTestId('criteria-bar-availability')).getByText('Σήμερα')
		).toBeInTheDocument();
	});

	it('U-23.2: the search button searches what the bar holds', async () => {
		const onSubmit = vi.fn();
		const { state } = renderSearch({ onSubmit }, null);
		state.open('bar', 'availability');
		flushSync();
		await user().click(screen.getByTestId('search-criteria-option-all'));
		await user().click(screen.getByTestId('criteria-bar-submit'));
		expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ availability: 'all' }));
	});
});
