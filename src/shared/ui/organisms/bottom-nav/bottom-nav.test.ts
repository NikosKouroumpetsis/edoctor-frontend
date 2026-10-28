import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BottomNav from './bottom-nav.svelte';
import { sampleBottomNavItems } from './bottom-nav.sample';

describe('BottomNav', () => {
	it('U-03.8: renders the caller’s tabs, the current one filled in primary, the others muted', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'Πλοήγηση' } });
		const nav = screen.getByRole('navigation', { name: 'Πλοήγηση' });
		expect(nav).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'border-t', 'bg-card');
		const current = screen.getByRole('link', { name: 'Αναζήτηση' });
		expect(current).toHaveAttribute('aria-current', 'page');
		expect(current).toHaveClass('text-primary', 'min-h-touch', 'min-w-touch');
		expect(current.querySelector('[data-icon="search"]')).not.toBeNull();
		const rest = screen.getByRole('button', { name: 'Αγαπημένα' });
		expect(rest).toHaveClass('text-muted-foreground', 'focus-visible:ring-3');
		expect(rest.querySelector('[data-icon="heart-outline"]')).not.toBeNull();
		expect(screen.getByText('Προφίλ')).toHaveClass('text-label-md');
	});

	it('U-03.8: hides from the laptop zone by default (1128, as before) and from the zone the caller names', () => {
		const view = render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		expect(screen.getByRole('navigation')).toHaveClass('laptop:hidden');
		view.unmount();
		render(BottomNav, {
			props: { items: sampleBottomNavItems, 'aria-label': 'n', hideFrom: 'tablet' }
		});
		expect(screen.getByRole('navigation')).toHaveClass('tablet:hidden');
		expect(screen.getByRole('navigation')).not.toHaveClass('laptop:hidden');
	});

	it('U-03.8: a tab without an href is a button the caller wires', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		const items = [{ key: 'x', label: 'Μηνύματα', icon: 'chatbubble-outline' as const, onclick }];
		render(BottomNav, { props: { items, 'aria-label': 'n' } });
		await user.click(screen.getByRole('button', { name: 'Μηνύματα' }));
		expect(onclick).toHaveBeenCalledOnce();
	});
});
