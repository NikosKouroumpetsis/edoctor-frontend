import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import ReviewToolbar from './review-toolbar.svelte';

const props = {
	count: '184 κριτικές',
	sortOptions: [
		{ value: 'newest', label: 'Πιο πρόσφατες' },
		{ value: 'oldest', label: 'Παλαιότερες' }
	],
	sortValue: 'newest',
	onSortChange: vi.fn(),
	sortLabel: 'Ταξινόμηση',
	searchLabel: 'Αναζήτηση',
	searchCloseLabel: 'Κλείσιμο αναζήτησης',
	maxLength: 100,
	testId: 'bar'
};

describe('ReviewToolbar (U-66.1 Π6)', () => {
	it('a press opens the field and gives it the focus; Escape closes it first, and the press takes it back', async () => {
		render(ReviewToolbar, { props });
		await fireEvent.click(screen.getByTestId('bar-search'));
		await tick();
		const input = screen.getByTestId('bar-input') as HTMLInputElement;
		expect(document.activeElement).toBe(input);
		expect(screen.getByTestId('bar')).toHaveAttribute('data-searching');
		const notPrevented = await fireEvent.keyDown(input, { key: 'Escape' });
		expect(notPrevented).toBe(false);
		await tick();
		expect(screen.getByTestId('bar')).not.toHaveAttribute('data-searching');
		expect(document.activeElement).toBe(screen.getByTestId('bar-search'));
	});

	it('U-65.6: the field takes at most its limit', () => {
		render(ReviewToolbar, { props });
		expect(screen.getByTestId('bar-input')).toHaveAttribute('maxlength', '100');
	});

	it('U-81.2: below 744 the order is the application’s sheet of options', async () => {
		render(ReviewToolbar, { props });
		await fireEvent.click(screen.getByTestId('bar-sort-phone'));
		await tick();
		await fireEvent.click(await screen.findByTestId('bar-sort-option-oldest'));
		expect(props.onSortChange).toHaveBeenCalledWith('oldest');
	});
});
