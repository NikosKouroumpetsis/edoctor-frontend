import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { ResolvedPathname } from '$app/types';
import LegalDirectory from './index.svelte';

const rows = [
	{ key: 'terms-of-use', label: 'Όροι χρήσης', href: '/legal/terms-of-use' as ResolvedPathname },
	{
		key: 'privacy-policy',
		label: 'Πολιτική απορρήτου',
		href: '/legal/privacy-policy' as ResolvedPathname
	},
	{
		key: 'delete-account',
		label: 'Διαγραφή λογαριασμού',
		href: '/account-deletion' as ResolvedPathname
	}
];

describe('legal::ui::directory', () => {
	it('U-59.3 Ε2 / MINOR-7 of r1: «Νομικά» is a page of its own — ONE h1, a row per text (each a whole link), its OG', () => {
		render(LegalDirectory, {
			props: {
				rows,
				locale: 'el',
				backHref: '/',
				canonicalUrl: 'https://www.example.org/legal',
				alternateUrls: {
					el: 'https://www.example.org/legal',
					en: 'https://www.example.org/en/legal'
				}
			}
		});
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByRole('heading', { level: 1, name: 'Νομικά' })).toBeInTheDocument();
		expect(
			screen.getAllByTestId('legal-directory-row').map((row) => row.getAttribute('href'))
		).toEqual(['/legal/terms-of-use', '/legal/privacy-policy', '/account-deletion']);
		expect(document.head.querySelector('meta[property="og:url"]')).toHaveAttribute(
			'content',
			'https://www.example.org/legal'
		);
		expect(document.head.querySelector('meta[property="og:title"]')).toBeInTheDocument();
	});
});
