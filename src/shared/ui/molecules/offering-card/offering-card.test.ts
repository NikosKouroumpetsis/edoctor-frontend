import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Harness from './offering-card.harness.svelte';

const BLOCKS = [
	{ id: 'duration', label: 'Διάρκεια', body: '30 λεπτά', testId: 'block-duration' },
	{ id: 'includes', label: 'Περιλαμβάνει', body: 'Εξέταση και συνταγή' }
];

describe('OfferingCard', () => {
	it('U-02.2 (K5.10): the title beside a soft pill (caption over the caller’s price), then each block (M-26)', () => {
		render(Harness, { props: { blocks: BLOCKS } });
		expect(screen.getByTestId('offer')).toHaveClass(
			'flex',
			'flex-col',
			'gap-2.5',
			'rounded-lg',
			'bg-card',
			'px-4',
			'py-4'
		);
		const title = screen.getByText('Πρώτη συνάντηση');
		expect(title).toHaveClass('flex-1', 'text-title-sm', 'font-semibold', 'text-foreground');
		expect(title.parentElement).toHaveClass(
			'flex',
			'flex-row',
			'items-start',
			'justify-between',
			'gap-4'
		);
		const pill = screen.getByTestId('price');
		expect(pill).toHaveClass(
			'flex',
			'max-w-2/5',
			'min-w-price-min-w',
			'flex-col',
			'items-end',
			'rounded-lg',
			'bg-foreground/5',
			'px-3',
			'py-2'
		);
		expect(screen.getByText('Από')).toHaveClass(
			'text-label-md',
			'font-semibold',
			'text-muted-foreground'
		);
		expect(pill).toHaveTextContent('40 €');
		expect(screen.getByText('40 €').closest('[data-slot="price-label"]')).not.toBeNull();
		const block = screen.getByTestId('block-duration');
		expect(block).toHaveClass('flex', 'flex-col', 'gap-1.5');
		expect(block.parentElement).toHaveClass('flex', 'flex-col', 'gap-2.5');
		expect(screen.getByText('Διάρκεια')).toHaveClass(
			'text-label-md',
			'font-semibold',
			'text-muted-foreground'
		);
		expect(screen.getByText('30 λεπτά')).toHaveClass('text-body-sm', 'text-foreground/88');
		expect(screen.getByText('Εξέταση και συνταγή')).toBeInTheDocument();
	});

	it('U-02.2 (negative): no blocks draw no block area; only theme tokens at every width (zones, light/dark)', () => {
		const { container } = render(Harness);
		expect(screen.getByTestId('offer').children).toHaveLength(1);
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
