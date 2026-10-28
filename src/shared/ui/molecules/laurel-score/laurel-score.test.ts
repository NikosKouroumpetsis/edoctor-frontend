import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import LaurelScore from './laurel-score.svelte';

const laurels = (root: Element) => [
	root.querySelector('[data-slot="laurel-wreath-left"]') as SVGElement,
	root.querySelector('[data-slot="laurel-wreath-right"]') as SVGElement
];

describe('LaurelScore', () => {
	it('U-03.1 (K3.4, M-05 στ): normal — two 24 laurels in the text colour, stroke 1.5, around a 20 semibold label', () => {
		const { container } = render(LaurelScore, { props: { label: 'Επιλογή ασθενών' } });
		const root = container.querySelector('[data-slot="laurel-score"]') as HTMLElement;
		expect(root).toHaveClass(
			'flex',
			'max-w-full',
			'flex-row',
			'items-center',
			'justify-center',
			'gap-1',
			'px-1'
		);
		expect(screen.getByText('Επιλογή ασθενών')).toHaveClass(
			'text-center',
			'text-title-lg',
			'leading-flat',
			'font-semibold',
			'text-foreground'
		);
		for (const laurel of laurels(root)) {
			expect(laurel).toHaveClass('icon-lg', 'text-foreground');
			expect(laurel).toHaveAttribute('aria-hidden', 'true');
			expect(laurel.querySelector('path')).toHaveAttribute('stroke-width', '1.5');
		}
	});

	it('U-03.1 (K3.4): large — 32 laurels 10 apart and a 22 label; filled wears the rating colour with the 1.8 stroke', () => {
		const { container } = render(LaurelScore, {
			props: { label: 'Επιλογή ασθενών', size: 'large', filled: true }
		});
		const root = container.querySelector('[data-slot="laurel-score"]') as HTMLElement;
		expect(root).toHaveClass('gap-2.5', 'px-1');
		expect(screen.getByText('Επιλογή ασθενών')).toHaveClass('text-heading-sm', 'font-semibold');
		for (const laurel of laurels(root)) {
			expect(laurel).toHaveClass('icon-xl', 'text-rating');
			expect(laurel).not.toHaveClass('text-foreground');
			expect(laurel.querySelector('path')).toHaveAttribute('stroke-width', '1.8');
		}
	});

	it('U-03.1 (K3.4, M-05 ε): score — the reviews’ big score (48 semibold) between 32 rating laurels', () => {
		const { container } = render(LaurelScore, {
			props: { label: '4,9', size: 'score', filled: true }
		});
		const root = container.querySelector('[data-slot="laurel-score"]') as HTMLElement;
		expect(root).toHaveClass('flex-row', 'items-center', 'justify-center', 'gap-2.5');
		expect(root).not.toHaveClass('px-1');
		expect(screen.getByText('4,9')).toHaveClass(
			'text-display-xl',
			'font-semibold',
			'text-foreground'
		);
		for (const laurel of laurels(root)) expect(laurel).toHaveClass('icon-xl', 'text-rating');
	});
});
