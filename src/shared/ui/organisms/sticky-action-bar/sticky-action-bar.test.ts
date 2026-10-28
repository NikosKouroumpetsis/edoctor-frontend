import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './sticky-action-bar.harness.svelte';

describe('StickyActionBar', () => {
	it('U-03.1 (K2.7): pinned to the bottom edge below 950, the card of the aside from 950, with room kept at the page end', () => {
		render(Harness);
		const bar = screen.getByTestId('bar');
		expect(bar).toHaveClass(
			'fixed',
			'inset-x-0',
			'bottom-0',
			'border-t',
			'border-border/20',
			'bg-card'
		);
		expect(bar).toHaveClass(
			'split:static',
			'split:rounded-xl',
			'split:border',
			'split:border-border/60',
			'split:shadow-soft'
		);
		const row = bar.querySelector('[data-slot="sticky-action-bar-row"]');
		expect(row).toHaveClass(
			'mx-auto',
			'max-w-content',
			'flex-wrap',
			'gap-4',
			'px-6',
			'pt-4',
			'pb-safe-area-sticky',
			'tablet:pb-6',
			'split:p-card'
		);
		const room = document.querySelector('[data-slot="sticky-action-bar-room"]');
		expect(room).toHaveClass('min-h-bar-booking', 'split:hidden');
		expect(room).toHaveAttribute('aria-hidden', 'true');
	});

	it('U-03.1 (K2.7): summary, price and the next slot in a shrinking column; the accent pill CTA keeps its width', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(Harness, { props: { cta: { label: 'Κράτηση', onclick } } });
		const column = document.querySelector('[data-slot="sticky-action-bar-summary"]');
		expect(column).toHaveClass('min-w-2/5', 'flex-1', 'gap-0.5');
		expect(screen.getByText('Επίσκεψη στο ιατρείο')).toHaveClass(
			'truncate',
			'text-body-sm',
			'text-muted-foreground'
		);
		expect(screen.getByText('40 €')).toBeInTheDocument();
		expect(screen.getByText('Επόμενη: Τρι 10:00')).toHaveClass('truncate', 'text-foreground/80');
		const cta = screen.getByRole('button', { name: 'Κράτηση' });
		expect(cta).toHaveAttribute('data-tone', 'accent');
		expect(cta).toHaveClass(
			'rounded-full',
			'border-0',
			'ml-auto',
			'min-w-cta-w',
			'tablet:min-w-cta-w-lg',
			'px-cta-inline',
			'py-4',
			'split:w-full'
		);
		const label = cta.firstElementChild;
		expect(label).toHaveClass(
			'text-body-lg',
			'max-tablet:leading-tight',
			'tablet:text-title-sm',
			'font-semibold'
		);
		// MINOR-1: a bare `leading-tight` would outlive the tablet's role (18/1.25 instead of the application's 18/1.45).
		expect(label?.className.split(/\s+/)).not.toContain('leading-tight');
		await user.click(cta);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.1 (K2.7): a notice replaces the supporting line (three lines) and refuses the call to action', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(Harness, {
			props: { notice: 'Οι κρατήσεις είναι κλειστές.', cta: { label: 'Κράτηση', onclick } }
		});
		expect(screen.getByText('Οι κρατήσεις είναι κλειστές.')).toHaveClass('line-clamp-3');
		expect(screen.queryByText('Επόμενη: Τρι 10:00')).not.toBeInTheDocument();
		const cta = screen.getByRole('button', { name: 'Κράτηση' });
		expect(cta).toBeDisabled();
		await user.click(cta);
		expect(onclick).not.toHaveBeenCalled();
	});

	it('U-03.1 (K2.7): loading shows the skeleton lines and pill, no button; a link CTA when the caller gives an href', () => {
		const view = render(Harness, { props: { loading: true } });
		const column = document.querySelector('[data-slot="sticky-action-bar-summary"]');
		expect(column).toHaveAttribute('aria-busy', 'true');
		const lines = column?.querySelectorAll('[data-slot="skeleton"]');
		expect([...(lines ?? [])].map((line) => line.className)).toEqual([
			expect.stringContaining('h-4 w-1/2 rounded-full'),
			expect.stringContaining('h-5 w-2/3 rounded-full'),
			expect.stringContaining('h-4 w-5/6 rounded-full')
		]);
		expect(document.querySelector('[data-slot="sticky-action-bar-cta-loading"]')).toHaveClass(
			'h-control-md',
			'w-cta-w',
			'tablet:h-control-lg',
			'tablet:w-cta-w-lg'
		);
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
		view.unmount();
		render(Harness, { props: { cta: { label: 'Κράτηση', href: '/el/booking' } } });
		expect(screen.getByRole('link', { name: 'Κράτηση' })).toHaveAttribute('href', '/el/booking');
	});
});
