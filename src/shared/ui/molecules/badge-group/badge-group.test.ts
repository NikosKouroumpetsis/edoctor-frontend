import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BadgeGroup from './badge-group.svelte';

const ITEMS = [
	{ id: 'cash', label: 'Μετρητά' },
	{ id: 'card', label: 'Κάρτα' },
	{ id: 'iris', label: 'IRIS' }
];

describe('BadgeGroup', () => {
	it('U-02.2 (K5.11): a semibold title over one small outline badge per item, wrapping (M-28)', () => {
		render(BadgeGroup, {
			props: { title: 'Τρόποι πληρωμής', items: ITEMS, testId: 'payments', testIdPrefix: 'payment' }
		});
		expect(screen.getByTestId('payments')).toHaveClass('flex', 'flex-col', 'gap-3');
		expect(screen.getByText('Τρόποι πληρωμής')).toHaveClass(
			'text-body-md',
			'font-semibold',
			'text-foreground'
		);
		const list = screen.getByRole('list', { name: 'Τρόποι πληρωμής' });
		expect(list).toHaveClass('flex', 'flex-row', 'flex-wrap', 'gap-2');
		expect(screen.getAllByRole('listitem')).toHaveLength(3);
		const badge = screen.getByTestId('payment-card');
		expect(badge).toHaveAttribute('data-slot', 'badge');
		expect(badge).toHaveAttribute('data-tone', 'outline');
		expect(badge).toHaveClass('border-border', 'bg-transparent', 'px-2', 'py-0.5', 'rounded-full');
		expect(screen.getByText('Κάρτα')).toHaveClass(
			'text-label-md',
			'font-semibold',
			'text-foreground'
		);
	});

	it('U-02.2 (negative): one item is one badge; no ids without a prefix; same at every width, theme tokens only', () => {
		const { container } = render(BadgeGroup, { props: { title: 'α', items: ITEMS.slice(0, 1) } });
		expect(screen.getAllByRole('listitem')).toHaveLength(1);
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
