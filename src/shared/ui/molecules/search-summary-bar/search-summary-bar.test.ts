import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SearchSummaryBar from './search-summary-bar.svelte';

const base = {
	title: 'Καρδιολόγος',
	subtitle: 'Αττική · Επόμενες 3 ημέρες',
	backLabel: 'Πίσω',
	openLabel: 'Αλλαγή αναζήτησης',
	filtersLabel: 'Φίλτρα, 2 επιλεγμένα',
	testId: 'search-doctors-results-nav-bar',
	testIdPrefix: 'search-doctors-results'
};

describe('SearchSummaryBar', () => {
	it('U-03.1 (K4.2, M-32, from the application): «←», the two-line pill in flex-1 and the filter button, 12 apart; `testId` on the bar, `testIdPrefix` on its controls', () => {
		render(SearchSummaryBar, {
			props: { ...base, filterCount: 2, onBack: () => {}, onOpenSearch: () => {} }
		});
		const bar = screen.getByTestId('search-doctors-results-nav-bar');
		expect(bar).toHaveClass('flex', 'flex-row', 'items-center', 'gap-3');
		const [back, pill, filter] = screen.getAllByRole('button');
		expect(back).toHaveAccessibleName('Πίσω');
		expect(back).toHaveAttribute('data-testid', 'search-doctors-results-back');
		expect(back.querySelector('[data-icon="arrow-back"]')).toHaveClass('icon-lg');
		expect(pill).toHaveAccessibleName('Αλλαγή αναζήτησης');
		expect(pill).toHaveAttribute('data-testid', 'search-doctors-results-pill');
		expect(pill).toHaveClass('px-5', 'py-3');
		expect(pill.closest('[data-slot="search-trigger"]')?.parentElement).toHaveClass('flex-1');
		expect(pill.closest('[data-slot="search-trigger"]')).not.toHaveClass('tablet:hidden');
		expect(filter).toHaveAccessibleName('Φίλτρα, 2 επιλεγμένα');
		expect(filter).toHaveAttribute('data-testid', 'search-doctors-results-filter');
		expect(filter.querySelector('[data-icon="options-outline"]')).not.toBeNull();
		expect(filter.querySelector('[data-slot="icon-button-count"]')).toHaveTextContent('2');
	});

	it('U-03.1 (K4.2): back, the pill and the filters act; the pill and the filters hand over their rect for the zoom', async () => {
		const user = userEvent.setup({ delay: null });
		const onBack = vi.fn();
		const onOpenSearch = vi.fn();
		const onOpenFilters = vi.fn();
		render(SearchSummaryBar, { props: { ...base, onBack, onOpenSearch, onOpenFilters } });
		const [back, pill, filter] = screen.getAllByRole('button');
		pill.getBoundingClientRect = () => ({ left: 72, top: 16, width: 231, height: 64 }) as DOMRect;
		filter.getBoundingClientRect = () => ({ left: 311, top: 24, width: 48, height: 48 }) as DOMRect;
		await user.click(back);
		await user.click(pill);
		await user.click(filter);
		expect(onBack).toHaveBeenCalledOnce();
		expect(onOpenSearch).toHaveBeenCalledWith({ height: 64, width: 231, x: 72, y: 16 });
		expect(onOpenFilters).toHaveBeenCalledWith({ height: 48, width: 48, x: 311, y: 24 });
	});

	it('U-03.1 (negative): no applied filter ⇒ no ring and no badge; without `onOpenFilters` the press does nothing', async () => {
		const { container } = render(SearchSummaryBar, {
			props: {
				...base,
				testId: undefined,
				testIdPrefix: undefined,
				onBack: () => {},
				onOpenSearch: () => {}
			}
		});
		const filter = screen.getAllByRole('button')[2];
		expect(filter.querySelector('[data-slot="icon-button-count"]')).toBeNull();
		expect(filter.querySelector('[data-slot="icon-button-shape"]')).not.toHaveClass('border-2');
		await userEvent.setup({ delay: null }).click(filter);
		expect(container.querySelector('[data-testid]')).toBeNull();
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const { container } = render(SearchSummaryBar, {
			props: { ...base, filterCount: 3, onBack: () => {}, onOpenSearch: () => {} }
		});
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
