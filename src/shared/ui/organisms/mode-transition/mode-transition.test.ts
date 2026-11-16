import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ModeTransition from './mode-transition.svelte';

describe('ModeTransition (wave 5.1 · screen 64)', () => {
	it('nothing while closed; open: the whole screen, its phrase said politely', () => {
		const closed = render(ModeTransition, {
			props: { open: false, label: 'Μετάβαση', testId: 'go' }
		});
		expect(screen.queryByTestId('go')).toBeNull();
		closed.unmount();
		render(ModeTransition, { props: { open: true, label: 'Μετάβαση', testId: 'go' } });
		const layer = screen.getByTestId('go');
		expect(layer).toHaveAttribute('role', 'status');
		expect(layer).toHaveAttribute('aria-live', 'polite');
		expect(layer.className).toMatch(/\bfixed\b/u);
		expect(layer.className).toMatch(/\binset-0\b/u);
		expect(screen.getByText('Μετάβαση')).toBeInTheDocument();
	});

	it('U-12 · U-100: CSS motion that always plays, on the page’s own surface — no motion setting, no tint', () => {
		render(ModeTransition, { props: { open: true, label: 'Μετάβαση', testId: 'go' } });
		const layer = screen.getByTestId('go');
		expect(layer.className).toContain('bg-card');
		expect(layer.className).not.toMatch(/bg-(primary|accent|danger|warning|success)/u);
		expect(layer.outerHTML).toContain('animate-mode-run');
		expect(layer.outerHTML).toContain('animate-mode-in-late');
		expect(layer.outerHTML).not.toMatch(/motion-(reduce|safe):/u);
	});
});
