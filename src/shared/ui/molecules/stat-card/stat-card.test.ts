import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import StatCard from './stat-card.svelte';

const cells = [
	{ id: 'a', value: '3', label: 'Τομείς', accessibleLabel: '3 τομείς εξειδίκευσης' },
	{ id: 'b', value: '37', label: 'Επισκέψεις' }
];

afterEach(() => vi.restoreAllMocks());

describe('StatCard (U-72.3 Π3)', () => {
	it('a raised list of equal cells, named; a screen reader hears the whole phrase', () => {
		render(StatCard, { props: { cells, label: 'Με μια ματιά', testId: 'stats' } });
		const list = screen.getByRole('list', { name: 'Με μια ματιά' });
		expect(list).toHaveClass('shadow-raised', 'rounded-xl');
		expect(list).toHaveAttribute('data-layout', 'row');
		expect(screen.getByTestId('stats-a')).toHaveClass('flex-1', 'basis-0');
		expect(screen.getByText('3 τομείς εξειδίκευσης')).toHaveClass('sr-only');
		expect(screen.getByTestId('stats-b')).toHaveClass('border-l');
	});

	it('S-26.2: a word wider than its cell stacks every cell, whatever the screen', async () => {
		vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(120);
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(80);
		render(StatCard, { props: { cells, label: 'Με μια ματιά', testId: 'stats' } });
		await waitFor(() =>
			expect(screen.getByTestId('stats')).toHaveAttribute('data-layout', 'stack')
		);
	});
});
