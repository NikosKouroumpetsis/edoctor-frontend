import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FactRow from './fact-row.svelte';

describe('FactRow (D-W51-37: one fact of a card, shared by the 51 and the 68)', () => {
	it('its label, its values each on a line, a muted hint, the line above it', () => {
		render(FactRow, {
			props: { row: 'when', label: 'Ημέρα', values: ['Δευτέρα', '11:00'], hint: 'Σημείωση' }
		});
		const row = document.querySelector('[data-slot="fact-row"][data-row="when"]') as HTMLElement;
		expect(row.className).toContain('border-t');
		expect([...row.querySelectorAll('p')].map((node) => node.textContent?.trim())).toEqual([
			'Ημέρα',
			'Δευτέρα',
			'11:00',
			'Σημείωση'
		]);
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('an amount large; a phone and a paired phone call; the other pairs are text', () => {
		render(FactRow, {
			props: {
				row: 'x',
				label: 'Κόστος',
				values: ['45 €'],
				emphasis: true,
				phone: { label: '210 321 0101', dial: '+302103210101' },
				phoneTestId: 'phone',
				pairs: [
					{ id: 'mobile', label: 'Κινητό', value: '+30 697', dial: '+30697' },
					{ id: 'email', label: 'Email', value: 'a@b.gr' }
				]
			}
		});
		expect(screen.getByText('45 €').className).toContain('text-body-lg');
		expect(screen.getByTestId('phone')).toHaveAttribute('href', 'tel:+302103210101');
		expect(screen.getByRole('link', { name: '+30 697' })).toHaveAttribute('href', 'tel:+30697');
		expect(screen.getByText('a@b.gr').closest('a')).toBeNull();
		expect(document.querySelector('[data-pair="email"] dt')).toHaveTextContent('Email');
	});

	it('the amounts and their total; the change as a link to its screen', () => {
		render(FactRow, {
			props: {
				row: 'price',
				label: 'Κόστος',
				breakdown: { lines: [{ label: 'Α', amount: '1 €' }], totalLabel: 'Σύνολο', total: '1 €' },
				change: { label: 'Αλλαγή', ariaLabel: 'Αλλαγή: Κόστος', href: '/x', step: 'price' }
			}
		});
		expect(screen.getByText('Σύνολο')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Αλλαγή: Κόστος' })).toHaveAttribute(
			'data-step',
			'price'
		);
	});

	it('D-W51-52: the muted notes of what the fact is now, under the values and before the hint', () => {
		render(FactRow, {
			props: {
				row: 'price',
				label: 'Κόστος',
				values: ['70 €'],
				emphasis: true,
				notes: ['Τελική τιμή που ορίσατε.'],
				hint: 'Ο ασθενής βλέπει την τιμή ως ενδεικτική.'
			}
		});
		const row = document.querySelector('[data-slot="fact-row"]') as HTMLElement;
		expect([...row.querySelectorAll('p')].map((node) => node.textContent?.trim())).toEqual([
			'Κόστος',
			'70 €',
			'Τελική τιμή που ορίσατε.',
			'Ο ασθενής βλέπει την τιμή ως ενδεικτική.'
		]);
		expect(row.querySelector('[data-slot="fact-row-note"]')?.className).toContain(
			'text-muted-foreground'
		);
	});

	it('(negative, U-65.6) every word is a text node, never HTML', () => {
		render(FactRow, {
			props: {
				row: 'x',
				label: '<i>a</i>',
				values: ['<b>b</b>'],
				pairs: [{ id: 'p', label: 'c', value: '<script>x</script>' }]
			}
		});
		const row = document.querySelector('[data-slot="fact-row"]') as HTMLElement;
		expect(row.querySelector('b, i, script')).toBeNull();
		expect(row).toHaveTextContent('<b>b</b>');
	});

	it('screen 73 (`.w-none2`): `muted` draws what was never given in the muted colour, at the values’ size', () => {
		render(FactRow, {
			props: { row: 'amka', label: 'ΑΜΚΑ', values: ['Δεν έχει δοθεί'], muted: true }
		});
		const value = [...document.querySelectorAll('[data-slot="fact-row"] p')].at(-1) as HTMLElement;
		expect(value).toHaveTextContent('Δεν έχει δοθεί');
		expect(value.className).toContain('text-muted-foreground');
		expect(value.className).toContain('text-body-sm');
		expect(value.className).not.toMatch(/\btext-foreground\b/u);
	});
});
