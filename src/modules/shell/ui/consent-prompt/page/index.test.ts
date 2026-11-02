import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { consentStorageKey } from '$shared/config/env';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { ConsentRegistryFacts } from '$modules/shell/api/consent';
import ConsentPrompt from './index.svelte';

const { getConsentRegistry } = vi.hoisted(() => ({ getConsentRegistry: vi.fn() }));
vi.mock('$modules/shell/api/consent', () => ({ getConsentRegistry }));

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
			category: 'analytics',
			id: 'web-analytics',
			platforms: ['web'],
			policyUrl: null,
			translations: words('Στατιστικά ιστότοπου')
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

/**
 * «Μόνο απαραίτητα» on the bundled catalogue. Rewritten by U-24.4 (D3): it was `{ 'edoctor-api': true }`; the
 * results' map makes OpenFreeMap an essential tool of the web too (the application's entry, `web` among its
 * platforms), so both essentials are stored on.
 */
const fallbackDecision = {
	registryVersion: '1.0.0',
	choices: { 'edoctor-api': true, openfreemap: true }
};

const stored = () => JSON.parse(window.localStorage.getItem(consentStorageKey) ?? 'null');
const renderPrompt = () => render(QueryHarness, { props: { component: ConsentPrompt, props: {} } });
const card = () => screen.findByRole('region', { name: 'Συναίνεση cookies' });

const fetchSpy = vi.fn();

beforeEach(() => {
	vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
	window.localStorage.clear();
	vi.unstubAllGlobals();
});

describe('ConsentPrompt (the web’s consent card)', () => {
	it('U-16.5: the floating card — the application’s words with the two policy links in place, the three ways', async () => {
		getConsentRegistry.mockResolvedValue(registry);
		renderPrompt();
		const region = await card();
		expect(region).toHaveTextContent('Βοηθήστε μας να βελτιώσουμε την εμπειρία σας');
		expect(
			within(region).getByRole('link', { name: 'πολιτική του eDoctor για τα cookies' })
		).toHaveAttribute('href', '/legal/cookies-policy');
		expect(within(region).getByRole('link', { name: 'πολιτική απορρήτου' })).toHaveAttribute(
			'href',
			'/legal/privacy-policy'
		);
		for (const name of ['Αποδοχή όλων', 'Μόνο απαραίτητα', 'Διαχείριση προτιμήσεων']) {
			expect(within(region).getByRole('button', { name })).toBeInTheDocument();
		}
		expect(screen.getByTestId('consent-prompt')).toHaveClass(
			'fixed',
			'inset-x-6',
			'bottom-above-tab-bar',
			'tablet:bottom-section',
			'tablet:max-w-consent-card-w',
			'mx-auto'
		);
	});

	it('U-16.5: «Μόνο απαραίτητα» is stored in the browser and the card never shows again (no backend call without a session)', async () => {
		const user = userEvent.setup();
		getConsentRegistry.mockResolvedValue(registry);
		const first = renderPrompt();
		await user.click(within(await card()).getByRole('button', { name: 'Μόνο απαραίτητα' }));
		expect(stored()).toEqual({
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'web-analytics': false }
		});
		await waitFor(() =>
			expect(screen.queryByRole('region', { name: 'Συναίνεση cookies' })).not.toBeInTheDocument()
		);
		first.unmount();

		getConsentRegistry.mockClear();
		renderPrompt();
		await waitFor(() => expect(getConsentRegistry).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(screen.queryByRole('region', { name: 'Συναίνεση cookies' })).not.toBeInTheDocument();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('U-16.5: «Αποδοχή όλων» allows every web tool; an app-only tool is never asked about', async () => {
		const user = userEvent.setup();
		getConsentRegistry.mockResolvedValue(registry);
		renderPrompt();
		await user.click(within(await card()).getByRole('button', { name: 'Αποδοχή όλων' }));
		expect(stored()).toEqual({
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'web-analytics': true }
		});
	});

	it('U-16.5: «Διαχείριση προτιμήσεων» lists the registry’s categories — essentials always on, the rest off until turned on', async () => {
		const user = userEvent.setup();
		getConsentRegistry.mockResolvedValue(registry);
		renderPrompt();
		await user.click(within(await card()).getByRole('button', { name: 'Διαχείριση προτιμήσεων' }));
		const dialog = await screen.findByTestId('consent-tools');
		expect(within(dialog).getByText('Απολύτως απαραίτητα')).toBeInTheDocument();
		expect(within(dialog).getByText('Πάντα ενεργό')).toBeInTheDocument();
		expect(within(dialog).queryByText('Διαφημίσεις εφαρμογής')).not.toBeInTheDocument();
		const analytics = within(dialog).getByRole('switch', { name: 'Στατιστικά ιστότοπου' });
		expect(analytics).toHaveAttribute('aria-checked', 'false');
		await user.click(analytics);
		await user.click(within(dialog).getByRole('button', { name: 'Αποθήκευση' }));
		expect(stored()).toEqual({
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'web-analytics': true }
		});
	});

	it('U-16.5: an unreadable registry falls back to the bundled catalogue, so the card still asks', async () => {
		const user = userEvent.setup();
		getConsentRegistry.mockRejectedValue(new Error('offline'));
		renderPrompt();
		await user.click(within(await card()).getByRole('button', { name: 'Μόνο απαραίτητα' }));
		expect(stored()).toEqual(fallbackDecision);
	});
	it('U-16.5: a registry with no usable version (`null` at the boundary) falls back to the bundled catalogue too', async () => {
		const user = userEvent.setup();
		getConsentRegistry.mockResolvedValue(null);
		renderPrompt();
		await user.click(within(await card()).getByRole('button', { name: 'Μόνο απαραίτητα' }));
		expect(stored()).toEqual(fallbackDecision);
	});

	// MAJOR-3 (r1): r0 kept the answered version as it was, so a later `/consent/record` would send a stale one.
	it('U-16.5: an essential-only bump is reconciled silently and stored — no card', async () => {
		window.localStorage.setItem(
			consentStorageKey,
			JSON.stringify({
				registryVersion: '1.9.0',
				choices: { 'edoctor-api': true, 'web-analytics': false }
			})
		);
		getConsentRegistry.mockResolvedValue(registry);
		renderPrompt();
		await waitFor(() =>
			expect(stored()).toEqual({
				registryVersion: '2.0.0',
				choices: { 'edoctor-api': true, 'web-analytics': false }
			})
		);
		expect(screen.queryByRole('region', { name: 'Συναίνεση cookies' })).not.toBeInTheDocument();
	});
	// MINOR-2 (r2): r1 kept a served registry whose tools were all dropped at the boundary — an empty catalogue never
	// asks and never stores a decision; the application keeps its bundled one then.
	it('U-16.5 (app = web): a registry whose tools are all dropped keeps the bundled catalogue, so the card still asks', async () => {
		const user = userEvent.setup();
		getConsentRegistry.mockResolvedValue({ registryVersion: '3.0.0', tools: [] });
		renderPrompt();
		await user.click(within(await card()).getByRole('button', { name: 'Μόνο απαραίτητα' }));
		expect(stored()).toEqual(fallbackDecision);
	});
});
