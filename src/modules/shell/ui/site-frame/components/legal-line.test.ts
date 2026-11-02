import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { page } from '$app/state';
import { SearchDock } from '$shared/state/search-dock';
import { showsSiteFooter } from '../lib/frame';
import LegalLineHarness from './legal-line.harness.svelte';
import LegalLine from './legal-line.svelte';

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

afterEach(() => visit('/'));

describe('shell::site-frame::legal-line (§7.2)', () => {
	it('§7.2 (U-24, D3): the results’ thin line — «© 2026 eDoctor · Απόρρητο · Όροι · Cookies · 🌐 Ελληνικά (GR)», the footer’s own addresses', () => {
		visit('/doctors');
		render(LegalLine);
		const line = screen.getByTestId('results-legal-line');
		expect(line).toHaveTextContent('© 2026 eDoctor');
		expect(within(line).getByRole('link', { name: 'Απόρρητο' })).toHaveAttribute(
			'href',
			'/legal/privacy-policy'
		);
		expect(within(line).getByRole('link', { name: 'Όροι' })).toHaveAttribute(
			'href',
			'/legal/terms-of-use'
		);
		expect(within(line).getByRole('link', { name: 'Cookies' })).toHaveAttribute(
			'href',
			'/legal/cookies-policy'
		);
		expect(screen.getByTestId('results-legal-language')).toHaveTextContent('Ελληνικά (GR)');
		expect(line).toHaveClass('border-t', 'border-border', 'text-label-lg', 'text-muted-foreground');
	});

	it('§7.2 / U-16.1: its language opens «Ρυθμίσεις», as the footer’s does; in English the line is English', async () => {
		visit('/en/doctors');
		render(LegalLine);
		expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
			'href',
			'/en/legal/privacy-policy'
		);
		await userEvent.setup().click(screen.getByTestId('results-legal-language'));
		expect(await screen.findByTestId('settings-dialog')).toBeInTheDocument();
	});

	it('U-24 (§7.2, MINOR-5 of r1): on the results the language keeps the search — «English» opens the address the page gives', async () => {
		visit('/doctors?what=Καρδιολόγος&whatSlug=kardiologos&gender=FEMALE');
		const dock = new SearchDock();
		dock.languageHref = (locale) =>
			locale === 'en'
				? '/en/doctors?what=Καρδιολόγος&whatSlug=kardiologos&gender=FEMALE'
				: '/doctors?what=Καρδιολόγος&whatSlug=kardiologos&gender=FEMALE';
		render(LegalLineHarness, { props: { dock } });
		await userEvent.setup().click(screen.getByTestId('results-legal-language'));
		const settings = await screen.findByTestId('settings-dialog');
		const english = within(settings).getByRole('link', { name: 'English' });
		expect(english.getAttribute('href')).toMatch(/^\/en\/doctors\?/);
		expect(english.getAttribute('href')).toContain('gender=FEMALE');
	});

	it('U-24 (negative, MINOR-5 of r1): a page that gives no address of its own keeps the same path in each language', async () => {
		visit('/doctors?gender=FEMALE');
		render(LegalLineHarness, { props: { dock: new SearchDock() } });
		await userEvent.setup().click(screen.getByTestId('results-legal-language'));
		const settings = await screen.findByTestId('settings-dialog');
		expect(within(settings).getByRole('link', { name: 'English' })).toHaveAttribute(
			'href',
			'/en/doctors'
		);
	});

	it('§7.2 (negative): only the results lose the footer — the home, a profile and the other pages keep it', () => {
		expect(showsSiteFooter('/doctors')).toBe(false);
		expect(showsSiteFooter('/doctors/')).toBe(false);
		expect(showsSiteFooter('/')).toBe(true);
		expect(showsSiteFooter('/doctors/a-pappas')).toBe(true);
		expect(showsSiteFooter('/articles')).toBe(true);
	});
});
