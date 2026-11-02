import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import { LinkRows } from './index';

describe('LinkRows (MINOR-5 of r1)', () => {
	it('U-59.1 Π6 / U-62.1 Π5: a list named by its title, each row ONE link with its muted line and its own language', () => {
		render(LinkRows, {
			props: {
				title: 'Άλλα νομικά κείμενα',
				rows: [
					{
						key: 'terms',
						label: 'Όροι χρήσης',
						href: '/legal/terms-of-use',
						icon: 'document-text-outline'
					},
					{
						key: 'faq',
						label: 'Πώς μπορώ να διαγράψω το λογαριασμό μου;',
						eyebrow: 'Συχνές ερωτήσεις',
						href: '/help#delete-account',
						lang: 'el'
					}
				]
			}
		});
		const list = screen.getByRole('navigation', { name: 'Άλλα νομικά κείμενα' });
		const links = within(list).getAllByRole('link');
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'/legal/terms-of-use',
			'/help#delete-account'
		]);
		expect(links[1]).toHaveAttribute('lang', 'el');
		expect(links[1]).toHaveTextContent('Συχνές ερωτήσεις');
		expect(links[0]).not.toHaveAttribute('lang');
	});
});
