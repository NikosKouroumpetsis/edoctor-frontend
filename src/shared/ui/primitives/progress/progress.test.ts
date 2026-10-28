import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Progress from './progress.svelte';

describe('Progress', () => {
	it('exposes the current value through ARIA', () => {
		render(Progress, { props: { value: 40 } });
		const bar = screen.getByRole('progressbar');
		expect(bar).toHaveAttribute('aria-valuenow', '40');
		expect(bar).toHaveAttribute('aria-valuemax', '100');
		expect(bar).toHaveAttribute('data-state', 'loading');
	});

	it('clamps out-of-range values and marks completion', () => {
		render(Progress, { props: { value: 150 } });
		const bar = screen.getByRole('progressbar');
		expect(bar).toHaveAttribute('aria-valuenow', '100');
		expect(bar).toHaveAttribute('data-state', 'complete');
	});

	// U-07.1 replaces the web's `sm | default (h-2) | lg (h-3)` this test pinned with the application's `sm | md`,
	// and R2-1 drops the `null` value (an «indeterminate» bar drawn as an empty one; the application has none).
	it('U-07.1: the application’s thicknesses — md (h-2.5) by default, sm (h-1.5)', () => {
		const def = render(Progress, { props: { value: 40 } });
		expect(def.getByRole('progressbar')).toHaveClass('h-2.5');
		expect(def.getByRole('progressbar')).not.toHaveClass('h-2');
		def.unmount();

		const sm = render(Progress, { props: { value: 40, size: 'sm' } });
		expect(sm.getByRole('progressbar')).toHaveClass('h-1.5');
	});

	it('U-02.2 (K5.9): the application’s tones — primary by default, accent for the reviews’ bars — with its round end', () => {
		const def = render(Progress, { props: { value: 40 } });
		const indicator = () => document.querySelector('[data-slot="progress-indicator"]');
		expect(indicator()).toHaveClass('bg-primary', 'rounded-full');
		def.unmount();
		render(Progress, { props: { value: 0.5, max: 1, size: 'sm', tone: 'accent' } });
		expect(indicator()).toHaveClass('bg-accent', 'rounded-full');
		expect(indicator()).not.toHaveClass('bg-primary');
		expect((indicator() as HTMLElement).style.transform).toBe('translateX(-50%)');
	});
});
