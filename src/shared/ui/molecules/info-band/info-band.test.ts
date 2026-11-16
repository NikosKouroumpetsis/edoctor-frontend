import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import InfoBand from './info-band.svelte';

describe('InfoBand (D-W51-37: the 51’s and the 68’s band of terms, shared)', () => {
	it('its name, the first line bold and the others muted, on the faint fill', () => {
		render(InfoBand, { props: { title: 'Όροι', lines: ['Πρώτη', 'Δεύτερη'], testId: 'band' } });
		const band = screen.getByTestId('band');
		expect(band.className).toContain('bg-foreground/5');
		expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Όροι');
		expect(screen.getByText('Πρώτη').className).toContain('font-semibold');
		expect(screen.getByText('Δεύτερη').className).toContain('text-muted-foreground');
	});

	it('(negative, U-65.6) words are text, never HTML', () => {
		render(InfoBand, { props: { title: 'x', lines: ['<b>y</b>'], testId: 'band' } });
		expect(screen.getByTestId('band').querySelector('b')).toBeNull();
	});
});
