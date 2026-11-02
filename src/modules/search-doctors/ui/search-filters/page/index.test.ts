import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import QueryHarness from '$shared/query/query.harness.svelte';
import {
	defaultSearchDoctorsCriteria,
	readSearchDoctorsCriteria,
	type SearchDoctorsCriteria
} from '$modules/search-doctors/lib/search-criteria';
import {
	defaultSearchDoctorsFilters,
	type SearchDoctorsFilters
} from '$modules/search-doctors/lib/search-filters';
import type { FiltersState } from '../hooks/use-state.svelte';
import Harness from './search-filters.harness.svelte';

const { fetchSearchResults } = vi.hoisted(() => ({ fetchSearchResults: vi.fn() }));
vi.mock('$modules/search-doctors/api/marketplace/search-source', () => ({ fetchSearchResults }));
const { fetchFilterFacets } = vi.hoisted(() => ({ fetchFilterFacets: vi.fn() }));
vi.mock('$modules/search-doctors/api/marketplace/facets-source', () => ({ fetchFilterFacets }));

const cardiology = readSearchDoctorsCriteria(
	new URLSearchParams(
		'what=Καρδιολόγος&whatKind=professional&whatId=p1&whatSlug=kardiologos&whatLabel=Καρδιολόγος'
	)
);

const facetsData = {
	facets: {
		paymentOptions: [
			{ value: 'CASH', label: 'Cash', count: 128 },
			{ value: 'CARD', label: 'Card', count: 64 }
		],
		services: [{ value: 'apli', label: 'Απλή επίσκεψη', count: 30, slug: 'apli' }],
		speakLanguages: [
			{ value: 'SL001', label: 'Ελληνικά', count: 120 },
			{ value: 'SL002', label: 'Αγγλικά', count: 40 }
		],
		amenities: [
			{ value: 'DISABILITY_ACCESS', label: 'DISABILITY_ACCESS', count: 9 },
			{ value: 'PARKING', label: 'PARKING', count: 22 }
		],
		priceRange: { min: 20, max: 120 }
	},
	pricingVisible: true
};

function renderFilters({
	criteria = cardiology,
	initialFilters = defaultSearchDoctorsFilters,
	onSubmit = vi.fn()
}: {
	criteria?: SearchDoctorsCriteria | null;
	initialFilters?: SearchDoctorsFilters;
	onSubmit?: (filters: SearchDoctorsFilters) => void;
} = {}) {
	let state!: FiltersState;
	render(QueryHarness, {
		props: {
			component: Harness,
			props: {
				criteria,
				initialFilters,
				onSubmit,
				onReady: (ready: FiltersState) => (state = ready)
			}
		}
	});
	return { state, onSubmit };
}

const open = (state: FiltersState) => {
	state.show();
	flushSync();
	return screen.getByTestId('search-filter-modal');
};
const user = () => userEvent.setup({ delay: null });

beforeEach(() => {
	fetchFilterFacets.mockResolvedValue(facetsData);
	fetchSearchResults.mockResolvedValue({
		total: 17,
		totalIsLowerBound: false,
		items: [],
		nextCursor: null,
		hasNextPage: false
	});
});

afterEach(() => {
	fetchFilterFacets.mockReset();
	fetchSearchResults.mockReset();
});

describe('search-doctors::ui::search-filters', () => {
	it('D-103: nothing is read while the window is closed; its facets and live count are asked the moment it opens', async () => {
		const { state } = renderFilters();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(fetchFilterFacets).not.toHaveBeenCalled();
		expect(fetchSearchResults).not.toHaveBeenCalled();
		open(state);
		await waitFor(() => expect(fetchFilterFacets).toHaveBeenCalledOnce());
		expect(fetchSearchResults).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ filters: expect.objectContaining({ sortBy: 'popularity' }) }),
			'el',
			{ limit: 1 },
			expect.anything()
		);
		// The facets are scoped by the criteria alone (the application's `defaultSearchDoctorsFilters`).
		expect(fetchFilterFacets.mock.calls[0][1].filters).toMatchObject({
			gender: 'ANY',
			paymentOptions: []
		});
	});

	it('U-24.3: the application’s sections, in its order and words — «Ταξινόμηση» first, no «Επιλεγμένα»', async () => {
		const { state } = renderFilters();
		const dialog = open(state);
		await within(dialog).findByTestId('search-filter-price');
		const titles = [...dialog.querySelectorAll('[data-slot="section"]')].map(
			(section) =>
				section.querySelector('h2,h3')?.textContent?.trim() ??
				section.textContent?.trim().slice(0, 21)
		);
		expect(titles).toEqual([
			'Ταξινόμηση',
			'Φύλο επαγγελματία',
			'Τρόποι πληρωμής',
			'Γλώσσα επικοινωνίας',
			'Υπηρεσίες ειδικότητας',
			'Εύρος τιμών',
			'Πρόσβαση ιατρείου'
		]);
		expect(within(dialog).queryByText('Επιλεγμένα')).toBeNull();
		expect(within(dialog).getByText('Τιμή απλής επίσκεψης')).toBeInTheDocument();
		expect(within(dialog).getByText('Ελάχιστη')).toBeInTheDocument();
		expect(within(dialog).getByText('Μέγιστη')).toBeInTheDocument();
		// No «Απόσταση» without a geo «Πού».
		expect(within(dialog).queryByText('Απόσταση')).toBeNull();
	});

	it('U-24.3 (MINOR-3 of r1): «Ταξινόμηση» is ONE heading, and it names the sort cards’ radio group', async () => {
		const { state } = renderFilters();
		const dialog = open(state);
		expect(within(dialog).getAllByText('Ταξινόμηση')).toHaveLength(1);
		const heading = within(dialog).getByRole('heading', { name: 'Ταξινόμηση' });
		const group = within(dialog).getByRole('radiogroup', { name: 'Ταξινόμηση' });
		expect(group).toHaveAttribute('aria-labelledby', heading.id);
		expect(heading.id).not.toBe('');
	});

	it('U-24.3 (negative, MINOR-3 of r1): no second «Ταξινόμηση» drawn over the cards (no `p` question in `search-filter-sort`)', async () => {
		const { state } = renderFilters();
		const dialog = open(state);
		const sort = within(dialog).getByTestId('search-filter-sort');
		expect(
			[...sort.querySelectorAll('p')].filter((node) => node.textContent?.trim() === 'Ταξινόμηση')
		).toHaveLength(0);
		expect(within(sort).queryByText('Ταξινόμηση')).toBeNull();
	});

	it('U-28.3: the sort cards are the kit’s smaller `sm` ones with the 20 glyph — the words and their order as before', async () => {
		const { state } = renderFilters();
		const dialog = open(state);
		const sort = within(dialog).getByTestId('search-filter-sort');
		const cards = within(sort).getAllByRole('radio');
		expect(
			cards.map((node) => node.querySelector('[data-icon]')?.getAttribute('data-icon'))
		).toEqual(['sparkles-outline', 'star-outline']);
		for (const node of cards) {
			expect(node).toHaveClass('px-4', 'py-3', 'min-h-touch');
			expect(node).not.toHaveClass('p-6');
			expect(node.querySelector('[data-icon]')).toHaveClass('icon-md');
			expect(node.querySelector('[data-icon]')).not.toHaveClass('icon-lg');
		}
		expect(cards.map((node) => node.querySelector('.font-semibold')?.textContent)).toEqual([
			'Προτεινόμενα',
			'Αξιολόγηση'
		]);
		expect(cards[0].parentElement).toHaveClass('gap-2');
	});

	it('S-32.10 (MINOR-9.3 of r1): the live count waits 350 ms of quiet — three presses inside it, nothing at 349 ms, ONE read at 350 ms', async () => {
		const { state } = renderFilters();
		const dialog = open(state);
		const cash = await within(dialog).findByTestId('search-filter-payment-CASH');
		await waitFor(() => expect(fetchSearchResults).toHaveBeenCalledTimes(1));
		vi.useFakeTimers();
		try {
			fetchSearchResults.mockClear();
			await fireEvent.click(cash);
			await vi.advanceTimersByTimeAsync(100);
			await fireEvent.click(within(dialog).getByTestId('search-filter-payment-CARD'));
			await vi.advanceTimersByTimeAsync(100);
			await fireEvent.click(within(dialog).getByTestId('search-filter-language-SL002'));
			await vi.advanceTimersByTimeAsync(349);
			expect(fetchSearchResults).not.toHaveBeenCalled();
			await vi.advanceTimersByTimeAsync(1);
			expect(fetchSearchResults).toHaveBeenCalledTimes(1);
			expect(fetchSearchResults.mock.calls[0][1].filters).toMatchObject({
				paymentOptions: ['CASH', 'CARD'],
				speakLanguageCodes: ['SL002']
			});
			expect(fetchSearchResults.mock.calls[0][3]).toEqual({ limit: 1 });
		} finally {
			vi.useRealTimers();
		}
	});

	it('U-24.3: the window is Airbnb’s frame (a sheet below 744, the 568 / 32 window from 744) and its footer ONE dark line', async () => {
		const { state } = renderFilters();
		const dialog = open(state);
		expect(dialog).toHaveAttribute('data-shape', 'sheet');
		expect(dialog).toHaveClass(
			'tablet:max-w-dialog',
			'tablet:rounded-panel',
			'tablet:max-h-window'
		);
		const apply = within(dialog).getByTestId('search-filter-apply');
		await waitFor(() => expect(apply).toHaveTextContent('Εμφάνιση 17 γιατρών'));
		expect(apply).toHaveClass('bg-secondary', 'rounded-full');
		expect(dialog.querySelector('[data-slot="action-bar-row"]')).toHaveClass('flex-nowrap');
		const clear = within(dialog).getByTestId('search-filter-clear');
		expect(clear).toBeDisabled();
		expect(clear).toHaveTextContent('Εκκαθάριση όλων');
	});

	it('U-24.3 / S-32.10: a choice re-counts after the quiet window and «Εμφάνιση» applies the draft; «Εκκαθάριση όλων» empties it', async () => {
		const onSubmit = vi.fn();
		const { state } = renderFilters({ onSubmit });
		const dialog = open(state);
		const cash = await within(dialog).findByTestId('search-filter-payment-CASH');
		expect(cash).toHaveTextContent('128');
		await user().click(cash);
		await user().click(within(dialog).getByTestId('search-filter-language-SL002'));
		expect(state.draft).toMatchObject({ paymentOptions: ['CASH'], speakLanguageCode: 'SL002' });
		await waitFor(() =>
			expect(fetchSearchResults).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({
					filters: expect.objectContaining({
						paymentOptions: ['CASH'],
						speakLanguageCodes: ['SL002']
					})
				}),
				'el',
				{ limit: 1 },
				expect.anything()
			)
		);
		expect(within(dialog).getByTestId('search-filter-clear')).toBeEnabled();
		await user().click(within(dialog).getByTestId('search-filter-apply'));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ paymentOptions: ['CASH'], speakLanguageCode: 'SL002' })
		);
		expect(state.open).toBe(false);

		open(state);
		await user().click(
			within(screen.getByTestId('search-filter-modal')).getByTestId('search-filter-clear')
		);
		expect(state.draft).toEqual(defaultSearchDoctorsFilters);
	});

	it('S-34.6 / S-31.7: «Κανένα αποτέλεσμα» at 0, refused; «N+» on a lower bound', async () => {
		fetchSearchResults.mockResolvedValue({
			total: 0,
			totalIsLowerBound: false,
			items: [],
			nextCursor: null,
			hasNextPage: false
		});
		const { state } = renderFilters();
		const dialog = open(state);
		const apply = within(dialog).getByTestId('search-filter-apply');
		await waitFor(() => expect(apply).toHaveTextContent('Κανένα αποτέλεσμα'));
		expect(apply).toBeDisabled();
	});

	it('S-32.2 (web, negative): «Κοντά μου» still without a position reads nothing — never the default Αττική', async () => {
		const { state } = renderFilters({ criteria: null });
		const dialog = open(state);
		await new Promise((resolve) => setTimeout(resolve, 400));
		expect(fetchFilterFacets).not.toHaveBeenCalled();
		expect(fetchSearchResults).not.toHaveBeenCalled();
		expect(within(dialog).getByTestId('search-filter-apply')).toHaveTextContent(
			'Εμφάνιση αποτελεσμάτων'
		);
	});

	it('U-24.3: «Απόσταση» is offered with a geo «Πού», and the price only with the pricing gate', async () => {
		fetchFilterFacets.mockResolvedValue({ ...facetsData, pricingVisible: false });
		const geo: SearchDoctorsCriteria = {
			...defaultSearchDoctorsCriteria,
			where: 'Κοντά μου',
			whereSelection: {
				kind: 'current-location',
				label: 'Κοντά μου',
				latitude: 37.9,
				longitude: 23.6
			}
		};
		const { state } = renderFilters({ criteria: geo });
		const dialog = open(state);
		expect(within(dialog).getByText('Απόσταση')).toBeInTheDocument();
		await waitFor(() => expect(fetchFilterFacets).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(within(dialog).queryByTestId('search-filter-price')).toBeNull();
		// No chosen specialty, no services.
		expect(within(dialog).queryByTestId('search-filter-services')).toBeNull();
	});
});
