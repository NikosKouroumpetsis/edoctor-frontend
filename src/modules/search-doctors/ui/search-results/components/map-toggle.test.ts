import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MapToggle from './map-toggle.svelte';

const props = {
	mapShown: false,
	desktopMap: 'split' as const,
	showMapLabel: 'Εμφάνιση χάρτη',
	showListLabel: 'Εμφάνιση λίστας',
	onclick: vi.fn()
};

// U-32.3 (NIT-7 of U-29): the floating switch's distance from the bottom edge is a name of its own, not a control's size.
describe('search-results::components::map-toggle', () => {
	it('U-32.3: the 744 switch floats `bottom-map-switch-bottom` (32) over the bottom edge, in the middle, from 744', () => {
		render(MapToggle, { props });
		const box = screen.getByTestId('results-map-toggle').parentElement as HTMLElement;
		expect(box).toHaveClass(
			'fixed',
			'bottom-map-switch-bottom',
			'left-1/2',
			'hidden',
			'tablet:block'
		);
		expect(box).toHaveClass('laptop:hidden');
	});

	it('U-32.3 (negative): no control size places it — never `bottom-control-xs`, whatever the state of the map', () => {
		for (const desktopMap of ['split', 'expanded', 'hidden'] as const) {
			for (const mapShown of [false, true]) {
				const view = render(MapToggle, { props: { ...props, mapShown, desktopMap } });
				const box = view.getByTestId('results-map-toggle').parentElement as HTMLElement;
				expect([...box.classList].filter((name) => /control-/u.test(name))).toEqual([]);
				expect(box).toHaveClass('bottom-map-switch-bottom');
				view.unmount();
			}
		}
	});
});
