import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { consentStorageKey } from '$shared/config/env';
import QueryHarness from '$shared/query/query.harness.svelte';
import { Session } from '$shared/state/session';
import type { ConsentRegistryFacts } from '$modules/shell/api/consent';
import Harness from './tools.harness.svelte';

/*
 * Wave 4.5 · screen 62 «Εργαλεία τρίτων και cookies» (record §5.7): the window «Διαχείριση προτιμήσεων» as a page — the
 * SAME words, the same catalogue and the same stored decision as the cookie card. The registry is stubbed.
 */

const { getConsentRegistry, recordConsentDecision } = vi.hoisted(() => ({
	getConsentRegistry: vi.fn(),
	recordConsentDecision: vi.fn()
}));
vi.mock('$modules/shell/api/consent', () => ({ getConsentRegistry, recordConsentDecision }));

const words = (title: string) => ({
	el: { title, description: `${title}: περιγραφή` },
	en: { title, description: `${title}: description` }
});

const registry: ConsentRegistryFacts = {
	registryVersion: '2.0.0',
	tools: [
		{
			category: 'essential',
			id: 'edoctor-api',
			platforms: ['app', 'web'],
			policyUrl: null,
			translations: words('Υπηρεσίες edoctor')
		},
		{
			category: 'functional',
			id: 'live-chat',
			platforms: ['web'],
			policyUrl: null,
			translations: words('Ζωντανή συνομιλία')
		},
		{
			category: 'analytics',
			id: 'web-analytics',
			platforms: ['web'],
			policyUrl: null,
			translations: words('Στατιστικά ιστότοπου')
		},
		{
			category: 'marketing',
			id: 'web-ads',
			platforms: ['web'],
			policyUrl: null,
			translations: words('Διαφημίσεις ιστότοπου')
		},
		{
			category: 'marketing',
			id: 'app-ads',
			platforms: ['app'],
			policyUrl: null,
			translations: words('Διαφημίσεις εφαρμογής')
		}
	]
};

const stored = () => JSON.parse(window.localStorage.getItem(consentStorageKey) ?? 'null');
const keep = (choices: Record<string, boolean>, registryVersion = '2.0.0') =>
	window.localStorage.setItem(consentStorageKey, JSON.stringify({ registryVersion, choices }));
const draw = (props: Record<string, unknown> = {}) =>
	render(QueryHarness, { props: { component: Harness as unknown as Component<never>, props } });
const page = () => screen.findByTestId('consent-tools-page');
const toggle = (id: string) => screen.getByTestId(`consent-tool-${id}`);
const line = () => screen.getByTestId('summary-line');

beforeEach(() => {
	getConsentRegistry.mockResolvedValue(registry);
	recordConsentDecision.mockResolvedValue({});
	vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
	window.localStorage.clear();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('«Εργαλεία τρίτων και cookies» as a page (wave 4.5, screen 62)', () => {
	it('the four categories of the window, with its own words: «Απολύτως απαραίτητα» always on, every optional tool a switch that is OFF until turned on; «Αποθήκευση» and «Ενεργοποίηση όλων»', async () => {
		draw({ prompt: false });
		const view = await page();
		await waitFor(() => expect(within(view).getByTestId('tools-save')).toBeInTheDocument());
		expect(view).toHaveTextContent(
			'Μπορείτε να επιλέξετε ποια εργαλεία επιτρέπετε. Τα απολύτως απαραίτητα είναι πάντα ενεργά'
		);
		expect(
			[...view.querySelectorAll('[data-testid^="consent-category-"]')].map((section) =>
				section.querySelector('h3')?.textContent?.trim()
			)
		).toEqual(['Απολύτως απαραίτητα', 'Λειτουργικά', 'Στατιστικά', 'Στόχευση και διαφήμιση']);
		const essential = within(view).getByTestId('consent-category-essential');
		expect(essential).toHaveTextContent('Πάντα ενεργό');
		expect(within(essential).queryByRole('switch')).toBeNull();
		for (const id of ['live-chat', 'web-analytics', 'web-ads']) {
			expect(toggle(id)).toHaveAttribute('aria-checked', 'false');
		}
		// A tool of the application alone never reaches the web's page.
		expect(view).not.toHaveTextContent('Διαφημίσεις εφαρμογής');
		expect(within(view).getByTestId('tools-save')).toHaveTextContent('Αποθήκευση');
		expect(within(view).getByTestId('tools-all')).toHaveTextContent('Ενεργοποίηση όλων');
		expect(getConsentRegistry).toHaveBeenCalledTimes(1);
	});

	it('🔴 ίδια αποθήκη με το παράθυρο: the page starts from what the cookie card kept, and what it saves is what the card’s window then shows', async () => {
		keep({ 'edoctor-api': true, 'live-chat': false, 'web-analytics': true, 'web-ads': false });
		const onSaved = vi.fn();
		const user = userEvent.setup();
		draw({ onSaved });
		await page();
		await waitFor(() => expect(toggle('web-analytics')).toHaveAttribute('aria-checked', 'true'));
		expect(toggle('web-ads')).toHaveAttribute('aria-checked', 'false');
		expect(line()).toHaveTextContent('Απαραίτητα, Στατιστικά');

		await user.click(toggle('web-ads'));
		await user.click(toggle('web-analytics'));
		// Nothing is kept before «Αποθήκευση».
		expect(stored().choices).toMatchObject({ 'web-analytics': true, 'web-ads': false });
		expect(line()).toHaveTextContent('Απαραίτητα, Στατιστικά');
		await user.click(screen.getByTestId('tools-save'));

		expect(stored()).toEqual({
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'live-chat': false, 'web-analytics': false, 'web-ads': true }
		});
		expect(onSaved).toHaveBeenCalledTimes(1);
		expect(await screen.findByText('Οι επιλογές σας αποθηκεύτηκαν.')).toBeInTheDocument();
		// The row of «Απόρρητο» says the new choice at once: one decision, three surfaces.
		expect(line()).toHaveTextContent('Απαραίτητα, Στόχευση και διαφήμιση');
		// One catalogue: the card, the page and the row asked for it once between them.
		expect(getConsentRegistry).toHaveBeenCalledTimes(1);
	});

	it('🔴 … and the other way round: with no decision the cookie card is up; saving on the PAGE answers it — the card goes, and never asks again', async () => {
		const user = userEvent.setup();
		draw();
		const card = await screen.findByRole('region', { name: 'Συναίνεση cookies' });
		expect(card).toBeInTheDocument();
		expect(line()).toHaveTextContent('Μόνο τα απαραίτητα');
		await waitFor(() => expect(screen.getByTestId('tools-save')).toBeInTheDocument());
		await user.click(screen.getByTestId('tools-save'));
		await waitFor(() =>
			expect(screen.queryByRole('region', { name: 'Συναίνεση cookies' })).toBeNull()
		);
		expect(stored()).toEqual({
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'live-chat': false, 'web-analytics': false, 'web-ads': false }
		});
		expect(line()).toHaveTextContent('Μόνο τα απαραίτητα');
	});

	it('«Ενεργοποίηση όλων» turns every switch on and keeps NOTHING until «Αποθήκευση»', async () => {
		const user = userEvent.setup();
		draw({ prompt: false });
		await page();
		await waitFor(() => expect(screen.getByTestId('tools-all')).toBeInTheDocument());
		await user.click(screen.getByTestId('tools-all'));
		for (const id of ['live-chat', 'web-analytics', 'web-ads']) {
			expect(toggle(id)).toHaveAttribute('aria-checked', 'true');
		}
		expect(stored()).toBeNull();
		await user.click(screen.getByTestId('tools-save'));
		expect(stored().choices).toEqual({
			'edoctor-api': true,
			'live-chat': true,
			'web-analytics': true,
			'web-ads': true
		});
		expect(line()).toHaveTextContent('Απαραίτητα, Λειτουργικά, Στατιστικά, Στόχευση και διαφήμιση');
	});

	it('🔴 R-4: a member’s choice saved on the page reaches the server’s record once, as the card’s does; a guest’s asks nothing', async () => {
		const member = new Session({
			status: () => 'member',
			member: () => ({ firstName: null }),
			signOut: async () => undefined
		});
		const user = userEvent.setup();
		const view = draw({ session: member });
		await waitFor(() => expect(screen.getByTestId('tools-save')).toBeInTheDocument());
		await user.click(toggle('web-analytics'));
		await user.click(screen.getByTestId('tools-save'));
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(1));
		expect(recordConsentDecision).toHaveBeenCalledWith({
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'live-chat': false, 'web-analytics': true, 'web-ads': false }
		});
		view.unmount();
		window.localStorage.clear();
		recordConsentDecision.mockClear();

		draw();
		await waitFor(() => expect(screen.getByTestId('tools-save')).toBeInTheDocument());
		await user.click(screen.getByTestId('tools-save'));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(recordConsentDecision).not.toHaveBeenCalled();
	});

	it('until the catalogue answers the page waits — no switch, nothing to save; a catalogue that cannot be read is the bundled one (the window’s rule)', async () => {
		let answer: (value: ConsentRegistryFacts | null) => void = () => undefined;
		getConsentRegistry.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
		draw({ prompt: false });
		const view = await page();
		expect(within(view).getByTestId('consent-tools-loading')).toHaveAttribute('aria-busy', 'true');
		expect(within(view).queryByTestId('tools-save')).toBeNull();
		expect(within(view).queryByRole('switch')).toBeNull();
		answer(null);
		await waitFor(() => expect(within(view).getByTestId('tools-save')).toBeInTheDocument());
		expect(within(view).getByTestId('consent-category-essential')).toBeInTheDocument();
	});

	it('🔴 U-65.6 (negative): a tool’s words from the registry are drawn as text — markup stays letters, on the page as in the window', async () => {
		const markup = '<img src=x onerror=alert(1)>';
		getConsentRegistry.mockResolvedValue({
			registryVersion: '2.0.0',
			tools: [registry.tools[0], { ...registry.tools[2], translations: words(markup) }]
		});
		draw({ prompt: false });
		const view = await page();
		await waitFor(() => expect(within(view).getByTestId('tools-save')).toBeInTheDocument());
		expect(view.querySelector('img')).toBeNull();
		expect(view).toHaveTextContent(markup);
	});

	it('the same page in English', async () => {
		draw({ prompt: false, locale: 'en' });
		const view = await page();
		await waitFor(() => expect(within(view).getByTestId('tools-save')).toHaveTextContent('Save'));
		expect(within(view).getByTestId('tools-all')).toHaveTextContent('Enable all');
		expect(within(view).getByTestId('consent-category-essential')).toHaveTextContent('Always on');
	});
});

describe('🔴 D-W45-28: the line of the row «Εργαλεία τρίτων και cookies»', () => {
	it('«Μόνο τα απαραίτητα» with no decision — said without waiting for the catalogue', async () => {
		getConsentRegistry.mockReturnValue(new Promise(() => undefined));
		draw({ prompt: false, page: false });
		await waitFor(() => expect(line()).toHaveTextContent('Μόνο τα απαραίτητα'));
	});

	it('(negative) a kept decision is never guessed: until its catalogue answers the line says nothing', async () => {
		keep({ 'edoctor-api': true, 'web-ads': true });
		let answer: (value: ConsentRegistryFacts) => void = () => undefined;
		getConsentRegistry.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		draw({ prompt: false, page: false });
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(line()).toHaveTextContent('…');
		answer(registry);
		await waitFor(() => expect(line()).toHaveTextContent('Απαραίτητα, Στόχευση και διαφήμιση'));
	});
});
