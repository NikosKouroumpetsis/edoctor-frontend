import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import SkeletonLines from './skeleton-lines.svelte';
import { skeletonLineClasses } from './index';

// The `Skeleton` primitive under every line: the application's muted 95 % breathing surface, whatever the motion
// setting (U-12.1: R2's `motion-reduce:animate-none` is gone).
const ATOM = ['animate-skeleton', 'overflow-hidden', 'bg-muted/95'];
const sorted = (element: Element) => [...element.classList].sort();
const lineClasses = (root: HTMLElement) =>
	[...root.querySelectorAll(':scope > [data-slot="skeleton"]')].map(sorted);
const expected = (classes: string) => [...ATOM, ...classes.split(' ')].sort();

describe('SkeletonLines', () => {
	it('U-03.1 (K6.4): one pulsing line per entry, then its children, in a column named by the caller, announcing nothing', () => {
		const after = createRawSnippet(() => ({ render: () => '<span data-testid="after"></span>' }));
		render(SkeletonLines, {
			props: { lines: [{ width: 'w-full' }, { width: 'w-1/2' }], testId: 'lines', children: after }
		});
		const root = screen.getByTestId('lines');
		expect(sorted(root)).toEqual(['flex', 'flex-col', 'gap-2'].sort());
		expect(lineClasses(root)).toEqual([
			expected('h-4 w-full rounded-full'),
			expected('h-4 w-1/2 rounded-full')
		]);
		expect(root.lastElementChild).toBe(screen.getByTestId('after'));
		expect(root).toHaveAttribute('aria-hidden', 'true');
		expect(root).not.toHaveAttribute('aria-busy');
		expect(root).toHaveTextContent(/^$/);
	});

	it('U-02.2: writes the height, the width, the block shape and the group break each line names', () => {
		render(SkeletonLines, {
			props: {
				class: 'flex-1 gap-5',
				testId: 'lines',
				lines: [
					{ height: 'h-6', width: 'w-11/12' },
					{ height: 'h-6', startsGroup: true, width: 'w-1/3' },
					{ height: 'h-control-sm', width: 'w-3/4' },
					{ height: 'h-map-h', shape: 'block', width: 'w-full' },
					{ height: 'h-hero-skeleton', shape: 'block', width: 'w-full' },
					{ height: 'h-3', width: 'w-1/5' }
				]
			}
		});
		const root = screen.getByTestId('lines');
		// The caller's class REPLACES the default gap, as the application's `className = 'gap-2'`.
		expect(sorted(root)).toEqual(['flex', 'flex-col', 'flex-1', 'gap-5'].sort());
		expect(lineClasses(root)).toEqual([
			expected('h-6 w-11/12 rounded-full'),
			expected('mt-4 h-6 w-1/3 rounded-full'),
			expected('h-control-sm w-3/4 rounded-full'),
			expected('h-map-h w-full rounded-xl'),
			expected('h-hero-skeleton w-full rounded-xl'),
			expected('h-3 w-1/5 rounded-full')
		]);
	});

	it('U-02.2: draws the window body as the profile window did (six h-6 lines, the fourth 16 lower)', () => {
		render(SkeletonLines, {
			props: {
				class: 'gap-5',
				testId: 'loading',
				lines: [
					{ height: 'h-6', width: 'w-full' },
					{ height: 'h-6', width: 'w-11/12' },
					{ height: 'h-6', width: 'w-4/5' },
					{ height: 'h-6', startsGroup: true, width: 'w-1/3' },
					{ height: 'h-6', width: 'w-full' },
					{ height: 'h-6', width: 'w-5/6' }
				]
			}
		});
		expect(lineClasses(screen.getByTestId('loading'))).toEqual(
			[
				'h-6 w-full rounded-full',
				'h-6 w-11/12 rounded-full',
				'h-6 w-4/5 rounded-full',
				'mt-4 h-6 w-1/3 rounded-full',
				'h-6 w-full rounded-full',
				'h-6 w-5/6 rounded-full'
			].map(expected)
		);
	});

	it('U-03.1: skeletonLineClasses is the application’s order — group break, height (16 by default), width, shape', () => {
		expect(skeletonLineClasses({ width: 'w-2/3' })).toBe('h-4 w-2/3 rounded-full');
		expect(
			skeletonLineClasses({ height: 'h-map-h', shape: 'block', startsGroup: true, width: 'w-full' })
		).toBe('mt-4 h-map-h w-full rounded-xl');
	});

	it('U-03.1 (zones, light/dark), U-12.1: no zone, only theme tokens, every line breathing whatever the motion setting', () => {
		const { container } = render(SkeletonLines, { props: { lines: [{ width: 'w-full' }] } });
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
		for (const line of container.querySelectorAll('[data-slot="skeleton"]'))
			expect(line).not.toHaveClass('motion-reduce:animate-none');
	});
});
