import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import FilterButton from './filter-button.svelte';

describe('FilterButton', () => {
	it('U-24.2 (app = web): the circle is 40 in its 48 box — the whole 1 hairline of the `border` token (§7.3, #d7e0ea), never the 60 % of an outlined icon button; no badge while nothing is set', () => {
		render(FilterButton, { props: { label: 'Φίλτρα', 'aria-label': 'Φίλτρα', testId: 'filters' } });
		const button = screen.getByRole('button', { name: 'Φίλτρα' });
		expect(button).toHaveAttribute('data-testid', 'filters');
		expect(button).toHaveAttribute('data-shape', 'circle');
		expect(button).toHaveAttribute('data-state', 'idle');
		expect(button).toHaveClass('size-touch');
		const shape = button.querySelector('[data-slot="icon-button-shape"]');
		expect(shape).toHaveClass('size-control-sm', 'rounded-full', 'border', 'border-border');
		expect(shape).not.toHaveClass('border-border/60');
		expect(shape).not.toHaveClass('border-2');
		expect(button.querySelector('[data-icon="options-outline"]')).toHaveClass('icon-md');
		expect(button.querySelector('[data-slot="icon-button-count"]')).toBeNull();
	});

	it('U-24.2 (negative, app = web): with filters (count > 0) the circle wears the 2 dark ring and the dark count badge — the hairline is gone', () => {
		render(FilterButton, {
			props: { label: 'Φίλτρα', count: 2, 'aria-label': 'Φίλτρα, 2 ενεργά φίλτρα' }
		});
		const button = screen.getByRole('button', { name: 'Φίλτρα, 2 ενεργά φίλτρα' });
		expect(button).toHaveAttribute('data-state', 'active');
		const shape = button.querySelector('[data-slot="icon-button-shape"]');
		expect(shape).toHaveClass('border-2', 'border-foreground');
		expect(shape).not.toHaveClass('border-border');
		expect(button.querySelector('[data-slot="icon-button-count"]')).toHaveTextContent('2');
	});

	it('U-24.2: the pill (from 744) is «⚙ Φίλτρα» 40 high in its 48 box, the hairline idle and the inset ring + badge active', async () => {
		const { rerender } = render(FilterButton, {
			props: { shape: 'pill', label: 'Φίλτρα', 'aria-label': 'Φίλτρα' }
		});
		const button = screen.getByRole('button', { name: 'Φίλτρα' });
		expect(button).toHaveClass('min-h-touch', 'min-w-touch');
		expect(button).toHaveAttribute('data-state', 'idle');
		const pill = button.querySelector('[data-slot="filter-button-pill"]');
		expect(pill).toHaveClass('min-h-control-sm', 'rounded-full', 'border', 'border-border', 'px-4');
		expect(pill).not.toHaveClass('ring-1');
		expect(button).toHaveTextContent('Φίλτρα');
		expect(button.querySelector('[data-slot="filter-button-count"]')).toBeNull();

		await rerender({ shape: 'pill', label: 'Φίλτρα', count: 3, 'aria-label': 'Φίλτρα, 3' });
		expect(button).toHaveAttribute('data-state', 'active');
		expect(pill).toHaveClass('border-foreground', 'ring-1', 'ring-inset', 'ring-foreground');
		expect(button.querySelector('[data-slot="filter-button-count"]')).toHaveTextContent('3');
	});

	it('U-24.2 (negative): a count of 0 is no filter — no ring and no badge in either shape', () => {
		render(FilterButton, {
			props: { shape: 'pill', label: 'Φίλτρα', count: 0, 'aria-label': 'Φίλτρα' }
		});
		const pill = screen.getByRole('button').querySelector('[data-slot="filter-button-pill"]');
		expect(pill).not.toHaveClass('ring-1', 'border-foreground');
		expect(screen.queryByText('0')).toBeNull();
	});

	it('hands the press to the caller, and keeps the theme tokens only', async () => {
		const onclick = vi.fn();
		const { container } = render(FilterButton, {
			props: { shape: 'pill', label: 'Φίλτρα', count: 1, 'aria-label': 'Φίλτρα', onclick }
		});
		await userEvent.setup({ delay: null }).click(screen.getByRole('button'));
		expect(onclick).toHaveBeenCalledOnce();
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
