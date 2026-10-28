import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SkeletonRail from './skeleton-rail.svelte';

const sorted = (element: Element) => [...element.classList].sort();
// U-12.1: the skeleton breathes whatever the motion setting (R2's `motion-reduce:animate-none` is gone).
const ATOM = ['animate-skeleton', 'overflow-hidden', 'bg-muted/95'];

describe('SkeletonRail', () => {
	it('U-02.2 (K6.4): six round tiles over their label lines by default, class for class with the home’s rail', () => {
		render(SkeletonRail, { props: { testId: 'rail' } });
		const root = screen.getByTestId('rail');
		// The application's `flex-row gap-5 px-1 py-2`, cut at its own edge as the application's screen cuts it.
		expect(sorted(root)).toEqual(
			['flex', 'flex-row', 'gap-5', 'overflow-hidden', 'px-1', 'py-2'].sort()
		);
		expect(root.children).toHaveLength(6);
		for (const tile of root.children) {
			expect(sorted(tile)).toEqual(
				['flex', 'shrink-0', 'flex-col', 'items-center', 'gap-2'].sort()
			);
			expect(sorted(tile.children[0])).toEqual([...ATOM, 'size-tile', 'rounded-full'].sort());
			expect(sorted(tile.children[1])).toEqual([...ATOM, 'h-4', 'w-full', 'rounded-full'].sort());
		}
	});

	it('U-03.1 (a11y): the count it is given, decorative, announcing nothing; no id the caller did not give', () => {
		const { container } = render(SkeletonRail, { props: { count: 3 } });
		const root = container.querySelector('[data-slot="skeleton-rail"]') as HTMLElement;
		expect(root.children).toHaveLength(3);
		expect(root).toHaveAttribute('aria-hidden', 'true');
		expect(root).not.toHaveAttribute('aria-busy');
		expect(root).toHaveTextContent(/^$/);
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
	});

	it('U-03.1 (zones, light/dark): the same at every width, only theme tokens', () => {
		const { container } = render(SkeletonRail);
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
