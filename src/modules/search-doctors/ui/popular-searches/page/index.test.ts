import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { page } from '$app/state';
import PopularSearches from './index.svelte';

const APP_PARAM_NAMES = new Set([
	'availability',
	'what',
	'where',
	'whatKind',
	'whatId',
	'whatSlug',
	'whatLabel',
	'whereKind',
	'whereSlug',
	'whereLabel',
	'whereLat',
	'whereLng'
]);

const paramsOf = (href: string | null) => {
	const url = new URL(href ?? '', 'http://localhost');
	return { path: url.pathname, query: Object.fromEntries(url.searchParams) };
};

afterEach(() => {
	(page as { url: URL }).url = new URL('http://localhost/');
});

describe('PopularSearches (the footer’s «Δημοφιλείς αναζητήσεις»)', () => {
	it('U-16.9/U-20: «Καρδιολόγοι / Αθήνα» opens the results with the application’s parameter names — every link, every tab', async () => {
		const user = userEvent.setup({ delay: null });
		render(PopularSearches);
		const panel = () => screen.getByTestId('footer-popular-panel');
		expect(screen.getByRole('heading', { name: 'Δημοφιλείς αναζητήσεις' })).toBeInTheDocument();
		const first = within(panel()).getAllByRole('link')[0];
		expect(first).toHaveTextContent('Καρδιολόγοι');
		expect(first).toHaveTextContent('Αθήνα');
		expect(paramsOf(first.getAttribute('href'))).toEqual({
			path: '/doctors',
			query: {
				what: 'Καρδιολόγος',
				where: 'Αθήνα',
				whatKind: 'text',
				whatLabel: 'Καρδιολόγος',
				whereKind: 'text',
				whereLabel: 'Αθήνα'
			}
		});
		for (const tab of ['specialties', 'areas']) {
			await user.click(screen.getByTestId(`footer-popular-tab-${tab}`));
			const more = screen.queryByTestId('footer-popular-more');
			if (more) await user.click(more);
			const links = within(panel()).getAllByRole('link');
			expect(links.length).toBeGreaterThan(0);
			for (const link of links) {
				const { path, query } = paramsOf(link.getAttribute('href'));
				expect(path).toBe('/doctors');
				for (const name of Object.keys(query)) expect(APP_PARAM_NAMES.has(name)).toBe(true);
				expect(query.where).toBeTruthy();
			}
		}
	});

	// Rewrites «U-16.9: «Online» is the video consultation in an area»: U-89.1 takes the column out of the product.
	it('U-89.1: καμία βιντεοκλήση στις αναζητήσεις — no «Online» column and no link searches a video call, in Greek or English', async () => {
		const user = userEvent.setup({ delay: null });
		const view = render(PopularSearches);
		const read = async () => {
			expect(screen.queryByTestId('footer-popular-tab-online')).not.toBeInTheDocument();
			expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('data-testid'))).toEqual([
				'footer-popular-tab-specialties',
				'footer-popular-tab-areas'
			]);
			for (const tab of ['specialties', 'areas']) {
				await user.click(screen.getByTestId(`footer-popular-tab-${tab}`));
				const more = screen.queryByTestId('footer-popular-more');
				if (more) await user.click(more);
				for (const link of within(screen.getByTestId('footer-popular-panel')).getAllByRole(
					'link'
				)) {
					const text = `${link.textContent} ${decodeURIComponent(link.getAttribute('href') ?? '')}`;
					expect(text).not.toMatch(/βιντεο|video|online/iu);
				}
			}
		};
		await read();
		view.unmount();
		(page as { url: URL }).url = new URL('http://localhost/en/doctors');
		render(PopularSearches);
		await read();
	});

	it('U-16.9: «Περιοχές» is every specialty of an area', async () => {
		const user = userEvent.setup({ delay: null });
		render(PopularSearches);
		await user.click(screen.getByTestId('footer-popular-tab-areas'));
		const area = within(screen.getByTestId('footer-popular-panel')).getAllByRole('link')[0];
		expect(area).toHaveTextContent('Γιατροί όλων των ειδικοτήτων');
		const { query } = paramsOf(area.getAttribute('href'));
		expect(query.what).toBeUndefined();
		expect(query.whereKind).toBe('text');
	});

	it('U-16.9: shows 11 links per tab first, then «Εμφάνιση περισσότερων»', () => {
		render(PopularSearches);
		expect(within(screen.getByTestId('footer-popular-panel')).getAllByRole('link')).toHaveLength(
			11
		);
		expect(screen.getByTestId('footer-popular-more')).toHaveTextContent('Εμφάνιση περισσότερων');
	});

	it('U-20: on /en the links are the English results with the matcher’s English words', () => {
		(page as { url: URL }).url = new URL('http://localhost/en/doctors');
		render(PopularSearches);
		const first = within(screen.getByTestId('footer-popular-panel')).getAllByRole('link')[0];
		expect(paramsOf(first.getAttribute('href'))).toMatchObject({
			path: '/en/doctors',
			query: { what: 'Cardiologist', where: 'Athina' }
		});
	});
});
