import { afterEach, describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen, within } from '@testing-library/svelte';
import { page } from '$app/state';
import SiteFrame from './index.svelte';

const children = createRawSnippet(() => ({ render: () => '<main><h1>Σελίδα</h1></main>' }));

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

afterEach(() => {
	visit('/');
});

describe('SiteFrame (eDoctor frame on the generic shell)', () => {
	it('renders the page inside the header, footer and bottom bar of the Greek site', () => {
		render(SiteFrame, { children });

		expect(screen.getByRole('heading', { level: 1, name: 'Σελίδα' })).toBeInTheDocument();
		expect(screen.getByRole('navigation', { name: 'Κύρια πλοήγηση' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Σύνδεση' })).toHaveAttribute('href', '/login');
		expect(screen.getByRole('link', { name: 'Διαγραφή λογαριασμού' })).toHaveAttribute(
			'href',
			'/account-deletion'
		);
		expect(screen.getAllByRole('button', { name: 'Σκούρο θέμα' }).length).toBeGreaterThan(0);
	});

	it('links the English pages under /en and names the parts in English', () => {
		visit('/en/doctors');
		render(SiteFrame, { children });

		expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
		const doctors = screen.getAllByRole('link', { name: 'Doctors' });
		expect(doctors.length).toBeGreaterThan(0);
		for (const link of doctors) expect(link).toHaveAttribute('href', '/en/doctors');
		expect(screen.getByRole('link', { name: 'Delete account' })).toHaveAttribute(
			'href',
			'/en/account-deletion'
		);
		expect(screen.getAllByRole('button', { name: 'Dark theme' }).length).toBeGreaterThan(0);
	});

	it('U-03.8: marks search as the current tab on the home page and hides the bar from the laptop zone', () => {
		render(SiteFrame, { children });

		const bar = screen.getByRole('navigation', { name: 'Πλοήγηση' });
		expect(bar).toHaveClass('laptop:hidden');
		expect(within(bar).getByRole('link', { name: 'Αναζήτηση' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(within(bar).getAllByRole('button')).toHaveLength(4);
	});

	it('U-03.8: points the language links and the crawler links at the same page, from Greek and English', () => {
		const cases = [
			{ path: '/doctors', current: 'Ελληνικά', other: 'English' },
			{ path: '/en/doctors', current: 'English', other: 'Ελληνικά' }
		];
		const hrefs: Record<string, string> = { Ελληνικά: '/doctors', English: '/en/doctors' };
		for (const { path, current, other } of cases) {
			visit(path);
			const view = render(SiteFrame, { children });

			const currentLinks = screen.getAllByRole('link', { name: current });
			const otherLinks = screen.getAllByRole('link', { name: other });
			expect(currentLinks).toHaveLength(2);
			expect(otherLinks).toHaveLength(2);
			for (const link of currentLinks) {
				expect(link).toHaveAttribute('href', hrefs[current]);
				expect(link).toHaveAttribute('aria-current', 'true');
			}
			for (const link of otherLinks) {
				expect(link).toHaveAttribute('href', hrefs[other]);
				expect(link).not.toHaveAttribute('aria-current');
			}

			const crawlers = [
				...view.container.querySelectorAll('a[aria-hidden="true"][tabindex="-1"]')
			].map((link) => [link.textContent, link.getAttribute('href')]);
			expect(crawlers).toEqual([
				['el', '/doctors'],
				['en', '/en/doctors']
			]);
			view.unmount();
		}
	});

	it('U-03.8: leaves the search tab unmarked away from the home page', () => {
		visit('/doctors');
		render(SiteFrame, { children });

		const bar = screen.getByRole('navigation', { name: 'Πλοήγηση' });
		expect(within(bar).getByRole('link', { name: 'Αναζήτηση' })).not.toHaveAttribute(
			'aria-current'
		);
	});
});
