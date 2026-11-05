import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { consentRecordedStorageKey, consentStorageKey } from '$shared/config/env';
import QueryHarness from '$shared/query/query.harness.svelte';
import { Session, type SessionStatus } from '$shared/state/session';
import { SiteDialogs } from '$shared/state/site-dialogs';
import type { ConsentRegistryFacts } from '$modules/shell/api/consent';
import ConsentPrompt from './index.svelte';
import SessionHarness from './session.harness.svelte';

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
	registryVersion: '1.1.0',
	choices: { 'edoctor-api': true, openfreemap: true, 'helpful-answers-storage': true }
};

const stored = () => JSON.parse(window.localStorage.getItem(consentStorageKey) ?? 'null');
const renderPrompt = () => render(QueryHarness, { props: { component: ConsentPrompt, props: {} } });
const card = () => screen.findByRole('region', { name: 'Συναίνεση cookies' });

/** The card under a session the test can start, end or give to another. */
function renderWithSession(start: SessionStatus, dialogs?: SiteDialogs) {
	const state = new SvelteMap([['status', start]]);
	const session = new Session({
		status: () => state.get('status') as SessionStatus,
		member: () => (state.get('status') === 'member' ? { firstName: null } : null),
		signOut: async () => {
			state.set('status', 'guest');
		}
	});
	const view = render(QueryHarness, {
		props: {
			component: SessionHarness as unknown as Component<never>,
			props: { session, dialogs }
		}
	});
	return { view, session, become: (status: SessionStatus) => state.set('status', status) };
}

const decision = { registryVersion: '2.0.0', choices: { 'edoctor-api': true } };
const keep = (kept: { registryVersion: string; choices: Record<string, boolean> }) =>
	window.localStorage.setItem(consentStorageKey, JSON.stringify(kept));
const settled = () => new Promise((resolve) => setTimeout(resolve, 10));
const recorded = () =>
	JSON.parse(window.localStorage.getItem(consentRecordedStorageKey) ?? 'null') as unknown;

const fetchSpy = vi.fn();

beforeEach(() => {
	vi.stubGlobal('fetch', fetchSpy);
	recordConsentDecision.mockResolvedValue({});
});

afterEach(() => {
	window.localStorage.clear();
	vi.unstubAllGlobals();
});

describe('the server’s record of a member’s decision (R-4)', () => {
	beforeEach(() => {
		getConsentRegistry.mockResolvedValue(registry);
	});

	it('🔴 R-4 (negative): a guest asks nothing, even with a decision kept, even answering the card', async () => {
		const user = userEvent.setup();
		renderWithSession('guest');
		await user.click(within(await card()).getByRole('button', { name: 'Μόνο απαραίτητα' }));
		await settled();
		expect(recordConsentDecision).not.toHaveBeenCalled();
	});

	it('R-4 (negative): nothing while the page does not know yet who reads it', async () => {
		keep(decision);
		renderWithSession('unknown');
		await settled();
		expect(recordConsentDecision).not.toHaveBeenCalled();
	});

	it('🔴 R-4: a member answering the card: its decision reaches the record at once', async () => {
		const user = userEvent.setup();
		renderWithSession('member');
		await user.click(within(await card()).getByRole('button', { name: 'Αποδοχή όλων' }));
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(1));
		expect(recordConsentDecision).toHaveBeenCalledWith({
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'web-analytics': true }
		});
	});

	it('🔴 R-4: what a guest decided reaches the record when the session comes, once, and never again on a new load', async () => {
		keep(decision);
		const { view, become } = renderWithSession('guest');
		await settled();
		become('member');
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(recorded()).toEqual(decision));
		view.unmount();
		recordConsentDecision.mockClear();
		renderWithSession('member');
		await settled();
		expect(recordConsentDecision).not.toHaveBeenCalled();
	});

	it('R-4: a new version of the catalogue is a new record', async () => {
		keep({ registryVersion: '1.9.0', choices: { 'edoctor-api': true, 'web-analytics': false } });
		window.localStorage.setItem(
			consentRecordedStorageKey,
			JSON.stringify({ registryVersion: '1.9.0', choices: { 'edoctor-api': true } })
		);
		renderWithSession('member');
		await waitFor(() =>
			expect(recordConsentDecision).toHaveBeenCalledWith(
				expect.objectContaining({ registryVersion: '2.0.0' })
			)
		);
	});

	it('🔴 R-4: another choice within the same version is written: ONE request for the change, none on the next load', async () => {
		const user = userEvent.setup();
		keep({ registryVersion: '2.0.0', choices: { 'edoctor-api': true, 'web-analytics': false } });
		const dialogs = new SiteDialogs();
		const { view } = renderWithSession('member', dialogs);
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(recorded()).not.toBeNull());
		dialogs.openConsent();
		const panel = await screen.findByTestId('consent-tools');
		await user.click(within(panel).getByRole('switch', { name: 'Στατιστικά ιστότοπου' }));
		await user.click(within(panel).getByRole('button', { name: 'Αποθήκευση' }));
		const changed = {
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'web-analytics': true }
		};
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(2));
		expect(recordConsentDecision).toHaveBeenLastCalledWith(changed);
		await waitFor(() => expect(recorded()).toEqual(changed));
		view.unmount();
		recordConsentDecision.mockClear();
		renderWithSession('member');
		await settled();
		expect(recordConsentDecision).not.toHaveBeenCalled();
	});

	it('R-4: back to the recorded choice while the other is on its way: the record hears it at once, and it is what stays', async () => {
		const user = userEvent.setup();
		const first = {
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'web-analytics': false }
		};
		const other = {
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'web-analytics': true }
		};
		keep(first);
		window.localStorage.setItem(consentRecordedStorageKey, JSON.stringify(first));
		const answers: (() => void)[] = [];
		recordConsentDecision.mockImplementation(
			() => new Promise((resolve) => answers.push(() => resolve({})))
		);
		const dialogs = new SiteDialogs();
		renderWithSession('member', dialogs);
		const flip = async () => {
			dialogs.openConsent();
			const panel = await screen.findByTestId('consent-tools');
			await user.click(within(panel).getByRole('switch', { name: 'Στατιστικά ιστότοπου' }));
			await user.click(within(panel).getByRole('button', { name: 'Αποθήκευση' }));
			await waitFor(() => expect(screen.queryByTestId('consent-tools')).not.toBeInTheDocument());
		};
		await flip();
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(1));
		expect(recordConsentDecision).toHaveBeenLastCalledWith(other);
		await flip();
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(2));
		expect(recordConsentDecision).toHaveBeenLastCalledWith(first);
		answers.forEach((answer) => answer());
		await waitFor(() => expect(recorded()).toEqual(first));
	});

	it('R-4: a choice changed where the record could not hear it (signed out meanwhile) reaches it on the next load, once', async () => {
		keep({ registryVersion: '2.0.0', choices: { 'edoctor-api': true, 'web-analytics': true } });
		window.localStorage.setItem(
			consentRecordedStorageKey,
			JSON.stringify({
				registryVersion: '2.0.0',
				choices: { 'edoctor-api': true, 'web-analytics': false }
			})
		);
		renderWithSession('member');
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(1));
		await settled();
		expect(recordConsentDecision).toHaveBeenCalledTimes(1);
	});

	it('R-4 (negative): saving the same choices again asks nothing', async () => {
		const user = userEvent.setup();
		const same = {
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'web-analytics': false }
		};
		keep(same);
		window.localStorage.setItem(consentRecordedStorageKey, JSON.stringify(same));
		const dialogs = new SiteDialogs();
		renderWithSession('member', dialogs);
		dialogs.openConsent();
		const panel = await screen.findByTestId('consent-tools');
		await user.click(within(panel).getByRole('button', { name: 'Αποθήκευση' }));
		await settled();
		expect(recordConsentDecision).not.toHaveBeenCalled();
	});

	it('🔴 R-4 (negative): a failure is not marked done: no loop on this load, and the next load asks again', async () => {
		keep(decision);
		recordConsentDecision.mockRejectedValue(new Error('down'));
		const { view } = renderWithSession('member');
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(1));
		await settled();
		expect(recordConsentDecision).toHaveBeenCalledTimes(1);
		expect(recorded()).toBeNull();
		view.unmount();
		recordConsentDecision.mockResolvedValue({});
		renderWithSession('member');
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(2));
	});

	it('🔴 R-4: a sign-out or another account starts over: each account has its own record', async () => {
		keep(decision);
		const { session, become } = renderWithSession('member');
		await waitFor(() => expect(recorded()).toEqual(decision));
		await session.signOut();
		await waitFor(() => expect(recorded()).toBeNull());
		become('member');
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(recorded()).toEqual(decision));
		session.accountChanged();
		await waitFor(() => expect(recordConsentDecision).toHaveBeenCalledTimes(3));
	});

	it('R-4 (negative): a decision with nothing in it (the schema asks at least one) is not sent', async () => {
		keep({ registryVersion: '2.0.0', choices: {} });
		getConsentRegistry.mockReturnValue(new Promise(() => {}));
		renderWithSession('member');
		await settled();
		expect(recordConsentDecision).not.toHaveBeenCalled();
	});
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
