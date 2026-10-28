import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SkeletonSection from './skeleton-section.svelte';

// U-12.1: the skeleton breathes whatever the motion setting (R2's `motion-reduce:animate-none` is gone).
const ATOM = ['animate-skeleton', 'overflow-hidden', 'bg-muted/95'];
const sorted = (element: Element) => [...element.classList].sort();

describe('SkeletonSection', () => {
	it('U-03.1 (K6.4): three rail cards by default and the count it is given, each named by the caller, announcing nothing', async () => {
		const view = render(SkeletonSection, { props: { cardTestId: 'cell', testId: 'section' } });
		expect(screen.getAllByTestId('cell')).toHaveLength(3);
		await view.rerender({ cardCount: 5, cardTestId: 'cell', testId: 'section' });
		expect(screen.getAllByTestId('cell')).toHaveLength(5);
		const section = screen.getByTestId('section');
		expect(section).toHaveAttribute('aria-hidden', 'true');
		expect(section).not.toHaveAttribute('aria-busy');
		expect(section).toHaveTextContent(/^$/);
	});

	it('U-03.1 (zones): its cards are rail cards, a step larger from the tablet, by CSS alone', () => {
		render(SkeletonSection, { props: { cardTestId: 'cell' } });
		for (const cell of screen.getAllByTestId('cell'))
			expect(cell).toHaveClass('w-card-rail-w', 'tablet:w-card-rail-w-lg', 'shrink-0');
	});

	it('U-02.2: draws the section as the home did — the two title lines beside the round control, over the row of cards', () => {
		render(SkeletonSection, { props: { cardTestId: 'cell', testId: 'section' } });
		const section = screen.getByTestId('section');
		expect(sorted(section)).toEqual(['flex', 'flex-col', 'gap-3.5'].sort());
		const [header, rail] = section.children;
		expect(sorted(header)).toEqual(
			['flex', 'flex-row', 'items-start', 'justify-between', 'gap-4'].sort()
		);
		const [titles, control] = header.children;
		expect(sorted(titles)).toEqual(['flex', 'flex-col', 'flex-1', 'gap-2'].sort());
		expect([...titles.children].map(sorted)).toEqual([
			[...ATOM, 'h-control-xs', 'w-3/4', 'rounded-full'].sort(),
			[...ATOM, 'h-5', 'w-3/5', 'rounded-full'].sort()
		]);
		expect(sorted(control)).toEqual([...ATOM, 'mt-0.5', 'size-control-sm', 'rounded-full'].sort());
		// The application's sideways row with no scroll bar: cut at its own edge, nothing to scroll to.
		expect(sorted(rail)).toEqual(['overflow-hidden']);
		expect(sorted(rail.children[0])).toEqual(['flex', 'flex-row', 'gap-3', 'pb-1'].sort());
		expect(rail.children[0].children).toHaveLength(3);
	});

	it('U-03.1 (negative, light/dark): no id the caller did not give, only theme tokens', () => {
		const { container } = render(SkeletonSection);
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
		expect(container.innerHTML).not.toMatch(/\b(split|laptop|desktop|wide):/);
	});
});
