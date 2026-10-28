import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Harness from './responsive-grid.harness.svelte';
import { gridColumnClassesOf } from './index';

describe('ResponsiveGrid', () => {
	it('U-03.1 (K2.2): renders every item as a cell of an equal-width grid list, one column by default', () => {
		render(Harness, { props: { count: 5 } });
		const grid = screen.getByRole('list', { name: 'Ώρες' });
		expect(grid).toHaveClass('grid', 'grid-cols-1', 'gap-grid');
		const cells = within(grid).getAllByRole('listitem');
		expect(cells).toHaveLength(5);
		expect(cells[4]).toHaveTextContent('Κελί 5');
		expect(cells[4].querySelector('[data-index="4"]')).not.toBeNull();
	});

	it('U-03.1 (NIT-8): the list keeps an explicit role="list" (VoiceOver drops it under list-style: none); 4K counts too', () => {
		render(Harness, { props: { columns: { phone: 1, desktop: 4, wide: 6 } } });
		const grid = screen.getByTestId('grid');
		expect(grid.tagName).toBe('UL');
		expect(grid).toHaveAttribute('role', 'list');
		expect(grid).toHaveClass('grid-cols-1', 'desktop:grid-cols-4', 'wide:grid-cols-6');
	});

	it('U-03.1 (K2.2): a count per zone is written in full classes, mobile first (Airbnb’s services 1 / 2 / 3 / 4 / 5)', () => {
		render(Harness, {
			props: { columns: { phone: 1, tablet: 2, split: 3, laptop: 4, desktop: 5 } }
		});
		expect(screen.getByTestId('grid')).toHaveClass(
			'grid-cols-1',
			'tablet:grid-cols-2',
			'split:grid-cols-3',
			'laptop:grid-cols-4',
			'desktop:grid-cols-5'
		);
	});

	it('U-03.1 (K2.2): a zone not named keeps the count below it (no class for it), the phone defaulting to one', () => {
		expect(gridColumnClassesOf({ tablet: 3 })).toBe('grid-cols-1 tablet:grid-cols-3');
		expect(gridColumnClassesOf(4)).toBe('grid-cols-4');
		render(Harness, { props: { columns: 4, gap: 'rail', keyed: false, count: 3 } });
		const grid = screen.getByTestId('grid');
		expect(grid).toHaveClass('grid-cols-4', 'gap-rail');
		expect(grid).not.toHaveClass('gap-grid');
		expect(grid.className).not.toMatch(/(tablet|split|laptop|desktop):/);
		expect(grid.className).not.toMatch(/\[/);
	});
});
