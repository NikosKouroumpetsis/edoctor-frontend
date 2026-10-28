import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import RatingDistribution from './rating-distribution.svelte';
import type { RatingDistributionProps } from './index';

const BUCKETS = [
	{ star: 5, share: 0.82, count: 102 },
	{ star: 4, share: 0.12, count: 15 },
	{ star: 3, share: 0.04, count: 5 },
	{ star: 2, share: 0.01, count: 1 },
	{ star: 1, share: 0.01, count: 1 }
];
const CATEGORIES = [
	{ icon: 'sparkles-outline' as const, id: 'clean', score: '9,8', title: 'Καθαριότητα' },
	{ icon: 'time-outline' as const, id: 'time', score: '9,4', title: 'Συνέπεια' }
];
const BASE = {
	title: 'Συνολική βαθμολογία',
	buckets: BUCKETS,
	categories: CATEGORIES,
	testId: 'ratings',
	testIdPrefix: 'rating',
	categoriesLabel: 'Κατηγορίες'
};

describe('RatingDistribution', () => {
	it('U-02.2 (K5.9): the band — one accent bar per star beside its star and count, printed as given (M-16)', () => {
		render(RatingDistribution, { props: BASE });
		expect(screen.getByTestId('ratings')).toHaveClass(
			'flex',
			'flex-row',
			'items-stretch',
			'bg-muted/40',
			'py-4'
		);
		expect(screen.getByText('Συνολική βαθμολογία')).toHaveClass(
			'text-body-sm',
			'font-semibold',
			'text-muted-foreground'
		);
		expect(screen.getByText('Συνολική βαθμολογία').parentElement).toHaveClass(
			'flex',
			'w-ratings-col',
			'shrink-0',
			'flex-col',
			'gap-3'
		);
		const five = screen.getByTestId('rating-bar-5');
		expect(five).toHaveClass('flex', 'flex-row', 'items-center', 'gap-2');
		expect(five.parentElement).toHaveClass('flex', 'flex-col', 'gap-1.5');
		expect(five.firstElementChild).toHaveTextContent('5');
		expect(five.firstElementChild).toHaveClass(
			'w-3',
			'text-right',
			'text-body-sm',
			'text-muted-foreground'
		);
		const bar = five.querySelector('[role="progressbar"]');
		expect(bar).toHaveAttribute('aria-valuenow', '0.82');
		expect(bar).toHaveAttribute('aria-valuemax', '1');
		expect(screen.getByRole('progressbar', { name: '5' })).toBe(bar);
		expect(bar).toHaveClass('h-1.5', 'bg-muted', 'rounded-full');
		expect(bar?.querySelector('[data-slot="progress-indicator"]')).toHaveClass(
			'bg-accent',
			'rounded-full'
		);
		expect(bar?.parentElement).toHaveClass('flex-1');
		expect(screen.getByTestId('rating-bar-count-5')).toHaveTextContent('102');
		expect(screen.getByTestId('rating-bar-count-5')).toHaveClass(
			'min-w-6',
			'truncate',
			'text-right',
			'text-body-sm',
			'text-muted-foreground'
		);
	});

	it('U-02.2: the categories scroll as columns, each behind a hairline, its title, score and lg glyph', () => {
		render(RatingDistribution, { props: { ...BASE, categoriesLabel: 'Κατηγορίες' } });
		const scroller = screen.getByTestId('rating-categories');
		expect(scroller).toHaveClass('min-w-0', 'flex-1', 'overflow-x-auto');
		expect(scroller.firstElementChild).toHaveClass(
			'flex',
			'w-max',
			'flex-row',
			'items-stretch',
			'pr-3'
		);
		expect(screen.getAllByTestId('rating-category-separator')).toHaveLength(2);
		const separator = screen.getAllByTestId('rating-category-separator')[0];
		expect(separator).toHaveClass('w-px', 'self-stretch', 'bg-border/60');
		expect(separator.parentElement).toHaveClass(
			'flex',
			'items-center',
			'justify-center',
			'self-stretch',
			'px-4'
		);
		const clean = screen.getByTestId('rating-category-clean');
		expect(clean).toHaveClass('flex', 'w-ratings-col-sm', 'shrink-0', 'flex-col', 'gap-1');
		expect(screen.getByText('Καθαριότητα')).toHaveClass(
			'text-body-sm',
			'font-semibold',
			'text-muted-foreground'
		);
		expect(screen.getByText('9,8')).toHaveClass('text-body-md', 'font-semibold', 'text-foreground');
		const glyph = clean.querySelector('[data-icon="sparkles-outline"]');
		expect(glyph).toHaveClass('icon-lg', 'text-foreground');
		expect(glyph?.parentElement).toHaveClass('pt-3');
	});

	it('U-03.1 (a11y, NIT-1): the scrolling row takes the keyboard’s focus as a group the caller MUST name', () => {
		render(RatingDistribution, { props: BASE });
		const group = screen.getByRole('group', { name: 'Κατηγορίες' });
		expect(group).toBe(screen.getByTestId('rating-categories'));
		expect(group).toHaveAttribute('tabindex', '0');
		expect(group).toHaveClass('focus-visible:ring-3');
		// @ts-expect-error a focusable row without a name
		const props: RatingDistributionProps = { title: 'α', buckets: BUCKETS, categories: CATEGORIES };
		expect(props.title).toBe('α');
	});

	it('U-03.1 (zones): the bleed escapes the caller’s padding — the modal’s 24, or the zone gutter 24 · 32 · 48', () => {
		const none = render(RatingDistribution, { props: BASE });
		expect(screen.getByTestId('ratings').className).not.toMatch(/-mx-|px-gutter/);
		none.unmount();
		const modal = render(RatingDistribution, { props: { ...BASE, bleed: 'gutter-sm' } });
		expect(screen.getByTestId('ratings')).toHaveClass('-mx-gutter-sm', 'px-gutter-sm');
		expect(screen.getByTestId('ratings').className).not.toMatch(/split:/);
		modal.unmount();
		render(RatingDistribution, { props: { ...BASE, bleed: 'zone' } });
		expect(screen.getByTestId('ratings')).toHaveClass(
			'-mx-gutter-sm',
			'px-gutter-sm',
			'split:-mx-gutter-md',
			'split:px-gutter-md',
			'desktop:-mx-gutter-lg',
			'desktop:px-gutter-lg'
		);
	});

	it('U-02.2 (negative): without categories no scrolling row; no ids without a prefix; only theme tokens', () => {
		const { container } = render(RatingDistribution, {
			props: { title: 'α', buckets: BUCKETS, categories: [], categoriesLabel: 'Κατηγορίες' }
		});
		expect(container.querySelector('[data-slot="rating-distribution-categories"]')).toBeNull();
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
