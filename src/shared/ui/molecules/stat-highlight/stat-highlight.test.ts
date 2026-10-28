import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatHighlight from './stat-highlight.svelte';

describe('StatHighlight', () => {
	it('U-02.2 (K5.11): one big number over its title and a muted body, centred (M-30)', () => {
		render(StatHighlight, {
			props: { value: '12', title: 'Δημοσιεύσεις', body: 'Άρθρα για την υγεία', testId: 'articles' }
		});
		expect(screen.getByTestId('articles')).toHaveClass('flex', 'flex-col', 'items-center', 'gap-2');
		expect(screen.getByText('12')).toHaveClass(
			'text-display-xl',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByText('Δημοσιεύσεις')).toHaveClass(
			'text-heading-md',
			'leading-tight',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByText('Άρθρα για την υγεία')).toHaveClass(
			'px-5',
			'text-center',
			'text-body-sm',
			'text-muted-foreground'
		);
	});

	it('U-02.2 (negative): no body, no line; the same at every width and theme tokens only', () => {
		const { container } = render(StatHighlight, { props: { value: '3', title: 'Άρθρα' } });
		expect(screen.getByText('Άρθρα').parentElement?.children).toHaveLength(2);
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
