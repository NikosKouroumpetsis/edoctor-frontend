import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync, type Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { consentStorageKey } from '$shared/config/env';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import type { SiteDialogs } from '$shared/state/site-dialogs';
import type { ToastState } from '$shared/ui/molecules/toast';
import type { ProfileScreenData } from '../types';
import Harness from './screen.harness.svelte';

/*
 * Wave 4.5 · screen 62 composed under the «Προφίλ» route (record §5.7; D-W45-01, D-W45-26 … D-W45-31): «Απόρρητο», the
 * page «Εργαλεία τρίτων και cookies» and «Διαγραφή λογαριασμού» on the web — three modules, drawn by this screen inside
 * the shell of screen 57. The server is stubbed; made-up values, no person's.
 */

const REGISTRY = {
	registryVersion: '2.0.0',
	tools: [
		{
			id: 'edoctor-api',
			category: 'essential',
			platforms: ['app', 'web'],
			policyUrl: null,
			translations: {
				el: { title: 'Υπηρεσίες eDoctor', description: 'Απαραίτητες.' },
				en: { title: 'eDoctor services', description: 'Required.' }
			}
		},
		{
			id: 'web-analytics',
			category: 'analytics',
			platforms: ['web'],
			policyUrl: null,
			translations: {
				el: { title: 'Στατιστικά ιστότοπου', description: 'Μετρήσεις.' },
				en: { title: 'Site analytics', description: 'Measurements.' }
			}
		}
	]
};

const PREVIEW = {
	allowed: true,
	refusal: null,
	codeChannel: 'email',
	codeDestinationMasked: 'e***a@example.gr',
	removed: [{ item: 'ratings', count: 3 }],
	warnings: ['MESSAGES_COPY_BEFORE_DELETION'],
	retained: [
		{ category: 'DELETION_TRACE', purpose: 'DELETION_ACCOUNTABILITY', maxRetentionYears: 5 }
	]
};

type Call = {
	url: string;
	path: string;
	method: string;
	credentials?: RequestCredentials;
	body: unknown;
};
let calls: Call[];
let confirmAnswer: () => Response;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });

const to = (path: string) => calls.filter((call) => call.path === path);

beforeEach(() => {
	calls = [];
	confirmAnswer = () => json({ tenantUserId: 'u-1', deletedAt: '2026-11-12T10:00:00.000Z' });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init: RequestInit = {}) => {
			const url = String(input);
			const path = new URL(url, 'https://api.test').pathname.replace(/^\/api\/v\d+/u, '');
			calls.push({
				url,
				path,
				method: init.method ?? 'GET',
				credentials: init.credentials,
				body: init.body ? JSON.parse(String(init.body)) : null
			});
			if (path === '/consent/registry') return json(REGISTRY);
			if (path === '/auth/account-deletion/me') return json(PREVIEW);
			if (path === '/auth/account-deletion/me/start') return json({ channel: 'email' });
			if (path === '/auth/account-deletion/me/confirm') return confirmAnswer();
			return json({});
		})
	);
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	window.localStorage.clear();
	window.sessionStorage.clear();
	visit('/');
	page.state = {};
});

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

type Handle = {
	session: Session;
	dialogs: SiteDialogs;
	toasts: ToastState;
	serverForgets: () => void;
	signIn: () => void;
	go: (next: ProfileScreenData) => void;
};

const PRIVACY: ProfileScreenData = { address: { view: 'settings', section: 'privacy' } };
const TOOLS: ProfileScreenData = {
	address: { view: 'settings', section: 'privacy', page: 'tools' }
};
const DELETION: ProfileScreenData = {
	address: { view: 'settings', section: 'privacy', page: 'deletion' }
};
const CODE: ProfileScreenData = {
	address: { view: 'settings', section: 'privacy', page: 'deletion-code' }
};

function draw(data: ProfileScreenData, start: SessionStatus = 'member') {
	let handle: Handle | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { data, start, onReady: (found: Handle) => (handle = found) }
		}
	});
	return () => handle as Handle;
}

const user = () => userEvent.setup({ delay: null });
const gone = () => vi.mocked(goto).mock.calls.map(([where, options]) => [String(where), options]);

/** Step 1 read and «Αποστολή κωδικού» pressed; the route then answers the code step's address. */
async function sendCode(handle: () => Handle) {
	await user().click(await screen.findByTestId('deletion-send-code'));
	await waitFor(() =>
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/account-settings/deletion/code')
	);
	visit('/profile/account-settings/deletion/code');
	flushSync(() => handle().go(CODE));
	return screen.findByTestId('deletion-code-step');
}

describe('screens/profile/[...path] · wave 4.5, screen 62 «Απόρρητο» (D-W45-01, D-W45-27 … D-W45-29)', () => {
	it('a MEMBER’s `/profile/privacy`: the section «Απόρρητο» of the shell — its three card-rows, each to its own address, and the box — titled in the tab, never indexed', async () => {
		visit('/profile/privacy');
		draw(PRIVACY);
		expect(screen.getByTestId('settings-page')).toHaveAttribute('data-section', 'privacy');
		const section = screen.getByTestId('settings-section-privacy');
		expect(
			within(section).getByRole('heading', { level: 2, name: 'Απόρρητο' })
		).toBeInTheDocument();
		expect(
			within(section).getByRole('heading', { level: 3, name: 'Απόρρητο δεδομένων' })
		).toBeInTheDocument();
		expect(screen.getByTestId('privacy-data')).toHaveAttribute('href', '/legal/privacy-policy');
		expect(screen.getByTestId('privacy-tools')).toHaveAttribute(
			'href',
			'/profile/third-party-tools'
		);
		expect(screen.getByTestId('privacy-deletion')).toHaveAttribute(
			'href',
			'/profile/account-settings/deletion'
		);
		expect(screen.getByTestId('privacy-policy-link')).toHaveAttribute(
			'href',
			'/legal/privacy-policy'
		);
		expect(document.title).toBe('Απόρρητο | eDoctor');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		expect(await screen.findByTestId('privacy-tools-line')).toHaveTextContent('Μόνο τα απαραίτητα');
		// The row's catalogue is the consent's own, read anonymously; nothing personal is asked for this page.
		expect(calls.map((call) => [call.path, call.credentials])).toEqual([
			['/consent/registry', 'omit']
		]);
	});

	it('🔴 D-W45-28 composed: the tools’ row says what the browser’s own decision has open', async () => {
		window.localStorage.setItem(
			consentStorageKey,
			JSON.stringify({
				registryVersion: '2.0.0',
				choices: { 'edoctor-api': true, 'web-analytics': true }
			})
		);
		visit('/profile/privacy');
		draw(PRIVACY);
		expect(await screen.findByTestId('privacy-tools-line')).toHaveTextContent(
			'Απαραίτητα, Στατιστικά'
		);
	});

	it('🔴 D-W45-29: a GUEST’s `/profile/privacy` opens — the first two cards and the box, NO «Διαγραφή λογαριασμού», its «←» to the «Προφίλ» — and asks nobody to sign in', async () => {
		visit('/profile/privacy');
		const handle = draw(PRIVACY, 'guest');
		const section = screen.getByTestId('settings-section-privacy');
		expect(
			within(section).getByRole('heading', { level: 1, name: 'Απόρρητο' })
		).toBeInTheDocument();
		expect(screen.getByTestId('privacy-data')).toBeInTheDocument();
		expect(screen.getByTestId('privacy-tools')).toBeInTheDocument();
		expect(screen.queryByTestId('privacy-deletion')).toBeNull();
		expect(screen.getByTestId('privacy-box')).toBeInTheDocument();
		expect(within(section).getByTestId('settings-section-back')).toHaveAttribute(
			'href',
			'/profile'
		);
		expect(screen.getByTestId('settings-split')).toHaveAttribute('data-solo');
		expect(handle().session.flowOpen).toBe(false);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		await screen.findByTestId('privacy-tools-line');
		expect(
			calls.every((call) => call.path === '/consent/registry' && call.credentials === 'omit')
		).toBe(true);
	});

	it('the same page under `/en`: every address in the page’s language', async () => {
		visit('/en/profile/privacy');
		draw(PRIVACY);
		expect(document.title).toBe('Privacy | eDoctor');
		expect(screen.getByTestId('privacy-data')).toHaveAttribute('href', '/en/legal/privacy-policy');
		expect(screen.getByTestId('privacy-tools')).toHaveAttribute(
			'href',
			'/en/profile/third-party-tools'
		);
		expect(screen.getByTestId('privacy-deletion')).toHaveAttribute(
			'href',
			'/en/profile/account-settings/deletion'
		);
		expect(await screen.findByTestId('privacy-tools-line')).toHaveTextContent(
			'Only the essential ones'
		);
	});

	it('`/profile/third-party-tools`: the page «Εργαλεία τρίτων» inside «Απόρρητο», its «←» to «Απόρρητο»; «Αποθήκευση» keeps the choice in the browser’s own storage, says «Οι επιλογές σας αποθηκεύτηκαν.» and goes back to «Απόρρητο»', async () => {
		visit('/profile/third-party-tools');
		const handle = draw(TOOLS, 'guest');
		const section = screen.getByTestId('settings-section-privacy');
		expect(section).toHaveAttribute('data-page', 'tools');
		expect(within(section).getByRole('heading', { name: 'Εργαλεία τρίτων' })).toBeInTheDocument();
		expect(within(section).getByTestId('settings-section-back')).toHaveAttribute(
			'href',
			'/profile/privacy'
		);
		await user().click(await screen.findByTestId('consent-tool-web-analytics'));
		await user().click(screen.getByTestId('tools-save'));
		expect(JSON.parse(window.localStorage.getItem(consentStorageKey) ?? 'null')).toEqual({
			registryVersion: '2.0.0',
			choices: { 'edoctor-api': true, 'web-analytics': true }
		});
		expect(handle().toasts.current?.message).toBe('Οι επιλογές σας αποθηκεύτηκαν.');
		expect(gone()).toEqual([['/profile/privacy', undefined]]);
		// Back on «Απόρρητο», the row says the new choice.
		visit('/profile/privacy');
		flushSync(() => handle().go(PRIVACY));
		expect(await screen.findByTestId('privacy-tools-line')).toHaveTextContent(
			'Απαραίτητα, Στατιστικά'
		);
	});
});

describe('screens/profile/[...path] · 🔴 U-173: η διαγραφή λογαριασμού γίνεται και στο web (D-W45-30)', () => {
	it('U-173: `/profile/account-settings/deletion` draws step 1 inside «Απόρρητο» — «Διαγραφή λογαριασμού», its «←» to «Απόρρητο», the preview from ONE read with the cookies, «Κριτικές που γράψατε» (D-W45-31) and the policy’s link', async () => {
		visit('/profile/account-settings/deletion');
		draw(DELETION);
		expect(screen.getByTestId('settings-page')).toHaveAttribute('data-page', 'deletion');
		const section = screen.getByTestId('settings-section-privacy');
		expect(
			within(section).getByRole('heading', { level: 2, name: 'Διαγραφή λογαριασμού' })
		).toBeInTheDocument();
		expect(within(section).getByTestId('settings-section-back')).toHaveAttribute(
			'href',
			'/profile/privacy'
		);
		expect(await screen.findByTestId('deletion-removed-ratings')).toHaveTextContent(
			'Κριτικές που γράψατε'
		);
		expect(screen.getByTestId('deletion-policy')).toHaveAttribute('href', '/legal/privacy-policy');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		expect(calls.map((call) => [call.method, call.path, call.credentials])).toEqual([
			['GET', '/auth/account-deletion/me', 'include']
		]);
	});

	it('🔴 U-65.6: ο κωδικός δεν μπαίνει ποτέ σε διεύθυνση — «Αποστολή κωδικού» goes to the code step’s bare path, and through the whole flow no address the page asks for or calls carries the code, a query or anything of the person', async () => {
		visit('/profile/account-settings/deletion');
		const handle = draw(DELETION);
		const step = await sendCode(handle);
		expect(gone()).toEqual([['/profile/account-settings/deletion/code', undefined]]);
		expect(
			within(screen.getByTestId('settings-section-privacy')).getByTestId('settings-section-back')
		).toHaveAttribute('href', '/profile/account-settings/deletion');
		await fireEvent.input(within(step).getByTestId('deletion-code'), {
			target: { value: '482913' }
		});
		await user().click(screen.getByTestId('deletion-confirm'));
		await screen.findByTestId('deletion-done');
		for (const [where] of gone()) {
			expect(where).not.toMatch(/482913|[?#=@]|e\*\*\*a/u);
		}
		for (const call of calls) {
			expect(call.url, call.path).not.toMatch(/482913|[?#]|e\*\*\*a/u);
		}
		expect(to('/auth/account-deletion/me/confirm').map((call) => call.body)).toEqual([
			{ code: '482913' }
		]);
		expect(JSON.stringify({ ...window.localStorage })).not.toContain('482913');
		expect(JSON.stringify({ ...window.sessionStorage })).not.toContain('482913');
		expect(page.url.href).not.toContain('482913');
	});

	it('🔴 U-173 composed: the whole flow — step 1, ONE code sent, the code, «Οριστική διαγραφή» — ends on «Ο λογαριασμός σας διαγράφηκε»: the browser’s session is closed, the shell and the form are gone, the home page is the one way on, and the page is NOT sent to the «Προφίλ» from under the end', async () => {
		visit('/profile/account-settings/deletion');
		const handle = draw(DELETION);
		const step = await sendCode(handle);
		expect(to('/auth/account-deletion/me/start')).toHaveLength(1);
		await fireEvent.input(within(step).getByTestId('deletion-code'), {
			target: { value: '482913' }
		});
		await user().click(screen.getByTestId('deletion-confirm'));
		const done = await screen.findByTestId('deletion-done');
		expect(done).toHaveTextContent('Ο λογαριασμός σας διαγράφηκε');
		expect(screen.getByTestId('deletion-done-notice')).toHaveTextContent('e***a@example.gr');
		expect(screen.getByTestId('deletion-done-home')).toHaveAttribute('href', '/');
		await waitFor(() => expect(handle().session.status).toBe('guest'));
		expect(handle().session.forgotten).toBe(1);
		expect(screen.queryByTestId('settings-split')).toBeNull();
		expect(screen.queryByTestId('deletion-code-step')).toBeNull();
		expect(screen.queryByTestId('settings-menu')).toBeNull();
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.getByTestId('deletion-done')).toBeInTheDocument();
		expect(gone()).toEqual([['/profile/account-settings/deletion/code', undefined]]);
		expect(to('/auth/account-deletion/me/confirm')).toHaveLength(1);
		expect(handle().session.flowOpen).toBe(false);
	});

	it('🔴 «Πίσω» δεν ξαναδείχνει τη φόρμα: once the end is left for another address nothing of the flow stays — the deletion’s addresses are a guest’s now, and go to the «Προφίλ»', async () => {
		visit('/profile/account-settings/deletion');
		const handle = draw(DELETION);
		const step = await sendCode(handle);
		await fireEvent.input(within(step).getByTestId('deletion-code'), {
			target: { value: '482913' }
		});
		await user().click(screen.getByTestId('deletion-confirm'));
		await screen.findByTestId('deletion-done');
		vi.mocked(goto).mockClear();
		// The browser's «back»: step 1's address, with the session already closed.
		visit('/profile/account-settings/deletion');
		flushSync(() => handle().go(DELETION));
		await waitFor(() => expect(gone()).toEqual([['/profile', { replaceState: true }]]));
		expect(screen.queryByTestId('deletion-done')).toBeNull();
		expect(screen.queryByTestId('deletion-review')).toBeNull();
		expect(screen.queryByTestId('deletion-code-step')).toBeNull();
		// … and forward again to the code step's: no end, no form — the «Προφίλ» again.
		vi.mocked(goto).mockClear();
		visit('/profile/account-settings/deletion/code');
		flushSync(() => handle().go(CODE));
		await waitFor(() => expect(gone()).toEqual([['/profile', { replaceState: true }]]));
		expect(screen.queryByTestId('deletion-done')).toBeNull();
		expect(screen.queryByTestId('deletion-code-step')).toBeNull();
	});

	it('🔴 a reload on the code step — no code out: step 1 takes its place in the history, and NOTHING is sent', async () => {
		visit('/profile/account-settings/deletion/code');
		draw(CODE);
		await waitFor(() =>
			expect(gone()).toEqual([['/profile/account-settings/deletion', { replaceState: true }]])
		);
		expect(to('/auth/account-deletion/me/start')).toEqual([]);
		expect(to('/auth/account-deletion/me/confirm')).toEqual([]);
	});

	it.each([
		['/profile/account-settings/deletion', DELETION],
		['/profile/account-settings/deletion/code', CODE]
	] as const)(
		'🔴 D-W45-30: επισκέπτης ⇒ `/profile` — `%s` without a session goes to the «Προφίλ» (in its place in the history), draws nothing of the flow, asks the server nothing and asks nobody to sign in',
		async (path, data) => {
			visit(path);
			const handle = draw(data, 'guest');
			await waitFor(() => expect(gone()).toEqual([['/profile', { replaceState: true }]]));
			for (const id of [
				'deletion-review',
				'deletion-code-step',
				'privacy-page',
				'settings-split'
			]) {
				expect(screen.queryByTestId(id), id).toBeNull();
			}
			expect(calls).toEqual([]);
			expect(handle().session.flowOpen).toBe(false);
		}
	);

	it('D-W45-30 under `/en`: a guest is sent to `/en/profile`', async () => {
		visit('/en/profile/account-settings/deletion');
		draw(DELETION, 'guest');
		await waitFor(() => expect(gone()).toEqual([['/en/profile', { replaceState: true }]]));
	});

	it('U-80.1 Ε6: while the session is not known the address waits — nobody is sent anywhere, nothing is asked; a member’s answer then draws step 1', async () => {
		visit('/profile/account-settings/deletion');
		const handle = draw(DELETION, 'unknown');
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(calls).toEqual([]);
		expect(screen.getByTestId('settings-section-loading')).toBeInTheDocument();
		flushSync(() => handle().signIn());
		expect(await screen.findByTestId('deletion-send-code')).toBeInTheDocument();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 συνεδρία που έληξε: the server refusing the session on «Οριστική διαγραφή» (`EC401`, no lost answer before it) is no deletion — the page learns it is a guest’s and goes to the «Προφίλ»', async () => {
		confirmAnswer = () => new Response(JSON.stringify({ errorCode: 'EC401' }), { status: 401 });
		visit('/profile/account-settings/deletion');
		const handle = draw(DELETION);
		const step = await sendCode(handle);
		handle().serverForgets();
		vi.mocked(goto).mockClear();
		await fireEvent.input(within(step).getByTestId('deletion-code'), {
			target: { value: '482913' }
		});
		await user().click(screen.getByTestId('deletion-confirm'));
		await waitFor(() => expect(gone()).toEqual([['/profile', { replaceState: true }]]));
		expect(screen.queryByTestId('deletion-done')).toBeNull();
		expect(handle().session.status).toBe('guest');
	});

	it('(negative) the other pages of the route ask nothing of the deletion or the consent: the «Προφίλ» tab and «Ρυθμίσεις λογαριασμού» stay as quiet as they were', async () => {
		for (const [path, data] of [
			['/profile', { address: { view: 'tab' } }],
			['/profile/account-settings/language', { address: { view: 'settings', section: 'language' } }]
		] as const) {
			visit(path);
			const view = render(QueryHarness, {
				props: {
					component: Harness as unknown as Component<never>,
					props: { data, start: 'guest' }
				}
			});
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(calls, path).toEqual([]);
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
			view.unmount();
		}
	});
});
