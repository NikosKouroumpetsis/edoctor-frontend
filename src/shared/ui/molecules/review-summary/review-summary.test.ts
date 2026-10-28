import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ReviewSummary from './review-summary.svelte';
import type { ReviewSummaryProps } from './index';

describe('ReviewSummary', () => {
	it('U-02.2 (K5.9): centred — the score between filled laurels, the title, the caller’s count (M-14)', () => {
		render(ReviewSummary, {
			props: {
				score: '4,9',
				title: 'Κορυφαία επιλογή',
				count: '124 αξιολογήσεις',
				testId: 'summary',
				testIdPrefix: 'reviews'
			}
		});
		expect(screen.getByTestId('summary')).toHaveClass('flex', 'flex-col', 'items-center', 'gap-3');
		const laurels = screen.getByText('4,9').closest('[data-slot="laurel-score"]');
		expect(laurels).toHaveAttribute('data-size', 'score');
		expect(laurels).toHaveAttribute('data-filled', 'true');
		expect(screen.getByText('Κορυφαία επιλογή')).toHaveClass(
			'text-heading-sm',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByTestId('reviews-count')).toHaveClass(
			'text-body-sm',
			'text-muted-foreground'
		);
		expect(screen.queryByTestId('reviews-description')).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('U-02.2: a description instead of the count is centred; the link is the underlined text button', async () => {
		const user = userEvent.setup({ delay: null });
		const onLink = vi.fn();
		render(ReviewSummary, {
			props: {
				score: '4,9',
				title: 'Κορυφαία επιλογή',
				description: 'Από επιβεβαιωμένες επισκέψεις',
				linkLabel: 'Πώς λειτουργούν οι κριτικές',
				onLink,
				testIdPrefix: 'reviews'
			}
		});
		expect(screen.getByTestId('reviews-description')).toHaveClass(
			'text-center',
			'text-body-sm',
			'text-muted-foreground'
		);
		const link = screen.getByRole('button', { name: 'Πώς λειτουργούν οι κριτικές' });
		expect(link).toHaveClass('min-h-touch', 'min-w-touch');
		expect(screen.getByText('Πώς λειτουργούν οι κριτικές')).toHaveClass(
			'underline',
			'font-semibold'
		);
		await user.click(link);
		expect(onLink).toHaveBeenCalledOnce();
	});

	it('U-03.1 (web idiom): the link may lead to a page; a label needs its action', () => {
		render(ReviewSummary, {
			props: { score: '4,9', title: 'α', linkLabel: 'Πώς λειτουργούν', linkHref: '/el/reviews' }
		});
		expect(screen.getByRole('link', { name: 'Πώς λειτουργούν' })).toHaveAttribute(
			'href',
			'/el/reviews'
		);
		// @ts-expect-error a link label without its action
		const props: ReviewSummaryProps = { score: '4,9', title: 'α', linkLabel: 'β' };
		expect(props.score).toBe('4,9');
	});

	it('U-03.1 (zones, light/dark): the same summary at every width and only theme tokens', () => {
		const { container } = render(ReviewSummary, {
			props: { score: '4,9', title: 'α', count: 'β' }
		});
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
