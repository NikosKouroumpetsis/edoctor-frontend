import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import OptionRowSkeleton from './option-row-skeleton.svelte';

const sorted = (element: Element) => [...element.classList].sort();

describe('OptionRowSkeleton', () => {
	it('U-02.2 (K6.4, D6): three still rows by default in the option row’s shape, class for class with the criteria lists', () => {
		render(OptionRowSkeleton, { props: { testId: 'loading' } });
		const root = screen.getByTestId('loading');
		expect(sorted(root)).toEqual(['flex', 'flex-col', 'gap-1'].sort());
		expect(root.children).toHaveLength(3);
		for (const row of root.children) {
			expect(sorted(row)).toEqual(
				[
					'flex',
					'min-h-row',
					'flex-row',
					'items-center',
					'gap-2.5',
					'rounded-md',
					'px-2',
					'py-2'
				].sort()
			);
			expect(sorted(row.children[0])).toEqual(
				['size-control-sm', 'rounded-md', 'bg-foreground/5'].sort()
			);
			expect(sorted(row.children[1])).toEqual(['h-3', 'flex-1', 'rounded-full', 'bg-muted'].sort());
		}
	});

	it('U-03.1 (a11y, reduced motion): the count it is given, decorative, announcing nothing, never breathing', () => {
		const { container } = render(OptionRowSkeleton, { props: { count: 1 } });
		const root = container.querySelector('[data-slot="option-row-skeleton"]') as HTMLElement;
		expect(root.children).toHaveLength(1);
		expect(root).toHaveAttribute('aria-hidden', 'true');
		expect(root).not.toHaveAttribute('aria-busy');
		expect(root).toHaveTextContent(/^$/);
		expect(container.innerHTML).not.toMatch(/\banimate-/);
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
	});

	it('U-03.1 (zones, light/dark): the same at every width, only theme tokens', () => {
		const { container } = render(OptionRowSkeleton);
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
