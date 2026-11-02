import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BottomNav from './bottom-nav.svelte';
import { sampleBottomNavItems } from './bottom-nav.sample';

describe('BottomNav', () => {
	// Rewrites the first U-03.8 guard (a full-width bar on the lower edge, the current tab in primary, the rest
	// muted): U-16.10/U-17.1 take flower-application's glass capsule.
	it('U-16.10/U-17.1: the glass capsule — 280 in the middle, 16 over the safe area, 4 inside, white 50 % blurred 7 under a 65 % rim', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'Πλοήγηση' } });
		const nav = screen.getByRole('navigation', { name: 'Πλοήγηση' });
		expect(nav).toHaveClass(
			'fixed',
			'bottom-safe-area',
			'left-1/2',
			'-translate-x-1/2',
			'w-tab-capsule-w',
			'rounded-full',
			'p-1',
			'bg-card/50',
			'border-card/65',
			'backdrop-blur-glass',
			'backdrop-saturate-180',
			'shadow-overlay'
		);
		expect(nav).not.toHaveClass('inset-x-0', 'bottom-0', 'border-t', 'bg-card');
	});

	it('U-16.10: the current tab sits in the 7 % bubble in primary text, the others in the text colour; 24 glyph over a 12/600 word', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		const current = screen.getByRole('link', { name: 'Εξερευνήστε' });
		expect(current).toHaveAttribute('aria-current', 'page');
		expect(current).toHaveClass(
			'bg-foreground/7',
			'text-primary-text',
			'rounded-full',
			'min-h-touch',
			'flex-1'
		);
		expect(current.querySelector('[data-icon="search"]')).toHaveClass('icon-lg');
		const rest = screen.getByRole('button', { name: 'Αγαπημένα' });
		expect(rest).toHaveClass('text-foreground', 'focus-visible:ring-3');
		expect(rest).not.toHaveClass('bg-foreground/7', 'text-muted-foreground');
		expect(rest.querySelector('[data-icon="heart-outline"]')).not.toBeNull();
		expect(screen.getByText('Προφίλ')).toHaveClass('text-label-md', 'font-semibold');
	});

	it('U-26.1: the web keeps three tabs — «Εξερευνήστε · Αγαπημένα · Προφίλ»', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		const tabs = document.querySelectorAll('[data-slot="bottom-nav-tab"]');
		expect([...tabs].map((tab) => tab.textContent?.trim())).toEqual([
			'Εξερευνήστε',
			'Αγαπημένα',
			'Προφίλ'
		]);
	});

	// Rewrites the U-03.8 zone guard (hidden from the laptop by default): U-16.3 hands the frame to the top bar at 744.
	it('U-16.3: hides from 744 by default (the top bar takes over there) and from the zone the caller names', () => {
		const view = render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		expect(screen.getByRole('navigation')).toHaveClass('tablet:hidden');
		expect(screen.getByRole('navigation')).not.toHaveClass('laptop:hidden');
		view.unmount();
		render(BottomNav, {
			props: { items: sampleBottomNavItems, 'aria-label': 'n', hideFrom: 'laptop' }
		});
		expect(screen.getByRole('navigation')).toHaveClass('laptop:hidden');
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
