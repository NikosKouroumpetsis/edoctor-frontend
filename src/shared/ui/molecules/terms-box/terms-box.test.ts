import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import TermsBox from './terms-box.svelte';

describe('TermsBox (D-W51-62: the 53’s «Προθεσμία ακύρωσης» and the 71’s «Τώρα», shared)', () => {
	it('its name as a muted heading, each row its strong words and the muted ones, a thin line between rows', () => {
		render(TermsBox, {
			props: {
				title: 'Τώρα',
				lines: [
					{ title: '«Ολοκληρώθηκε»', body: 'Γράφτηκε αυτόματα.' },
					{ title: 'Διορθώνεται ως Δευτέρα', body: '48 ώρες μετά.' }
				],
				testId: 'box',
				class: 'mb-4'
			}
		});
		const box = screen.getByTestId('box');
		expect(box).toHaveAttribute('data-slot', 'terms-box');
		expect(box.className).toContain('bg-foreground/5');
		expect(box.className).toContain('mb-4');
		expect(within(box).getByRole('heading', { level: 3 })).toHaveTextContent('Τώρα');
		const rows = box.querySelectorAll('[data-slot="terms-box-line"]');
		expect(rows).toHaveLength(2);
		expect(rows[0].className).not.toContain('border-t');
		expect(rows[1].className).toContain('border-t');
		expect(screen.getByText('«Ολοκληρώθηκε»').className).toContain('font-semibold');
		expect(screen.getByText('48 ώρες μετά.').className).toContain('text-muted-foreground');
	});

	it('(negative, U-65.6) words are text, never HTML', () => {
		render(TermsBox, {
			props: {
				title: '<i>x</i>',
				lines: [{ title: '<b>y</b>', body: '<img src=x>' }],
				testId: 'box'
			}
		});
		expect(screen.getByTestId('box').querySelector('b, i, img')).toBeNull();
		expect(screen.getByText('<b>y</b>')).toBeInTheDocument();
	});
});
