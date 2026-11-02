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
		for (const tab of ['specialties', 'areas', 'online']) {
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

	it('U-16.9: «Online» is the video consultation in an area; «Περιοχές» every specialty of an area', async () => {
		const user = userEvent.setup({ delay: null });
		render(PopularSearches);
		await user.click(screen.getByTestId('footer-popular-tab-online'));
		const video = within(screen.getByTestId('footer-popular-panel')).getAllByRole('link')[0];
		expect(paramsOf(video.getAttribute('href')).query).toMatchObject({
			what: 'Βιντεοκλήση',
			whatKind: 'text'
		});
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
