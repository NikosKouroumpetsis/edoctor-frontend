import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Harness from './sticky-top-bar.harness.svelte';

describe('StickyTopBar', () => {
	it('U-03.1 (K2.6): pinned over the page; the card surface (hairline below) fades in by the caller’s opacity', () => {
		render(Harness, { props: { backgroundOpacity: 0.4 } });
		const bar = screen.getByTestId('bar');
		expect(bar).toHaveClass('fixed', 'inset-x-0', 'top-0', 'z-20');
		const surface = bar.querySelector<HTMLElement>('[data-slot="sticky-top-bar-surface"]');
		expect(surface).toHaveClass('absolute', 'inset-0', 'border-b', 'border-border/60', 'bg-card');
		expect(surface).toHaveAttribute('aria-hidden', 'true');
		expect(surface?.style.opacity).toBe('0.4');
	});

	it('U-03.1 (K2.6): opaque by default; the row pads 16 → 24 from the tablet and is capped at content there', () => {
		const view = render(Harness);
		const bar = screen.getByTestId('bar');
		expect(
			bar.querySelector<HTMLElement>('[data-slot="sticky-top-bar-surface"]')?.style.opacity
		).toBe('1');
		const row = bar.querySelector('[data-slot="sticky-top-bar-row"]');
		expect(row).toHaveClass(
			'mx-auto',
			'justify-between',
			'px-4',
			'pt-2.5',
			'pb-2.5',
			'tablet:px-6',
			'tablet:pb-3',
			'tablet:max-w-content'
		);
		expect(bar.querySelector('[data-slot="sticky-top-bar-trailing"]')).toHaveClass(
			'gap-2',
			'pointer-events-auto'
		);
		// NIT-1: the application's `box-none` — the bar lets presses through, its buttons take them.
		expect(bar).toHaveClass('pointer-events-none');
		expect(bar.querySelector('[data-slot="sticky-top-bar-leading"]')).toHaveClass(
			'pointer-events-auto'
		);
		expect(bar.querySelector('[data-slot="sticky-top-bar-row"]')).not.toHaveClass(
			'pointer-events-auto'
		);
		expect(screen.getAllByRole('button')).toHaveLength(3);
		for (const button of screen.getAllByRole('button'))
			expect(button).toHaveAttribute('data-appearance', 'scrim');
		view.unmount();
		render(Harness, { props: { width: 'listing' } });
		expect(document.querySelector('[data-slot="sticky-top-bar-row"]')).toHaveClass(
			'tablet:max-w-listing'
		);
	});
});
