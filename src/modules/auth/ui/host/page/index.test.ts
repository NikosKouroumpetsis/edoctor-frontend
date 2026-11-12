import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusManager, onlineManager, QueryClient } from '@tanstack/svelte-query';
import { afterNavigate } from '$app/navigation';
import { page } from '$app/state';
import { knownAccountStorageKey, sessionChannelName } from '$shared/config/env';
import { SIGN_IN_PROVIDER_COLORS } from '$shared/preferences/theme/sign-in-provider-colors';
import { leaveFor } from '$modules/auth/api/provider';
import { readSourceFiles, projectRoot } from '../../../../../../tests/architecture/source-scan';
import Harness from './host.harness.svelte';

vi.mock('$modules/auth/api/provider', async (original) => ({
	...(await original<typeof import('$modules/auth/api/provider')>()),
	leaveFor: vi.fn()
}));

type Reply = { status: number; body?: unknown };
type Route = (body: Record<string, unknown>, url: URL) => Reply;

const ok = (data: unknown): Reply => ({ status: 200, body: { status: 'ok', data } });
const refuse = (status: number, errorCode?: string, errorMessage?: string): Reply => ({
	status,
	body: { errorCode, errorMessage }
});

let routes: Record<string, Route>;
let calls: {
	method: string;
	path: string;
	body: Record<string, unknown>;
	init: RequestInit;
	lang: string | null;
}[];
let signedIn: boolean;
let patient: Record<string, unknown> | null;

function serve() {
	routes = {
		'GET /patient/me': () => (signedIn ? ok(patient) : refuse(401, 'EC401')),
		'GET /doctor/profile/base': () => refuse(403),
		'POST /auth/access/start': () => ok({ success: true, channel: 'email' }),
		'POST /auth/access/resend': () => ok({ success: true, channel: 'email' }),
		'POST /auth/access/verify': () => {
			signedIn = true;
			return ok({ outcome: 'signed-in', tenantUser: { id: 'u' }, registrationTicket: null });
		},
		'POST /auth/login': () => {
			signedIn = true;
			return ok({ tenantUser: { id: 'u' } });
		},
		'POST /auth/logout': () => {
			signedIn = false;
			return ok({ revokedCount: 1 });
		},
		'POST /auth/access/complete-registration': () => {
			signedIn = true;
			return ok({ tenantUser: { id: 'u' } });
		},
		'POST /patient/onboarding/complete': () => {
			patient = { id: 'p', firstName: 'Ελένη' };
			return ok({});
		},
		'POST /auth/password-credentials/me/set-password/init': () => ok({ success: true }),
		'POST /auth/password-credentials/me/set-password': () => ok({ success: true }),
		'GET /content/public/pages/terms-of-use': () => ok({ version: '3' }),
		'GET /content/public/pages/privacy-policy': () => ok({ version: '2' })
	};
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
			const url = new URL(String(input));
			const path = url.pathname.replace(/^\/api\/v1/u, '');
			const method = init.method ?? 'GET';
			const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
			calls.push({ method, path, body, init, lang: url.searchParams.get('lang') });
			const route = routes[`${method} ${path}`];
			const reply = route ? route(body, url) : refuse(404);
			return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status });
		})
	);
}

const callsTo = (path: string) => calls.filter((call) => call.path === path);

/** The person comes back to this tab: every read past its time asks again. */
function comeBackToTheTab() {
	focusManager.setFocused(false);
	focusManager.setFocused(true);
	focusManager.setFocused(undefined);
}
const user = () => userEvent.setup({ delay: null });

async function openFlow(onSignedIn?: () => void, onSignInAbandoned?: () => void) {
	const view = render(Harness, { props: { onSignedIn, onSignInAbandoned } });
	await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
	await user().click(screen.getByTestId('ask'));
	await screen.findByTestId('auth-dialog');
	return view;
}

async function submitIdentifier(value: string) {
	const field = within(await screen.findByTestId('auth-step-entry')).getByTestId('auth-identifier');
	await user().type(field, value);
	await user().click(screen.getByTestId('auth-continue'));
}

async function typeCode(code = '123456') {
	const cell = await screen.findByTestId('auth-code');
	await fireEvent.input(cell, { target: { value: code } });
}

beforeEach(() => {
	signedIn = false;
	patient = { id: 'p', firstName: 'Μαρία' };
	serve();
});

afterEach(() => {
	vi.unstubAllGlobals();
	window.localStorage.clear();
	window.sessionStorage.clear();
	(page as { url: URL }).url = new URL('http://localhost/');
});

describe('the session (U-80.1 Ε6)', () => {
	it('Ε6: the page starts unknown, and the browser asks with the cookies; a `401` is a guest, not a failure', async () => {
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		expect(callsTo('/patient/me')).toHaveLength(1);
		expect(callsTo('/patient/me')[0].init.credentials).toBe('include');
	});

	it('Ε6: a member is known by the same read', async () => {
		signedIn = true;
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument();
	});

	it('Ε6 (negative): a failed read opens nothing and asks no sign-in', async () => {
		routes['GET /patient/me'] = () => refuse(503);
		render(Harness);
		await waitFor(() => expect(callsTo('/patient/me')).toHaveLength(1));
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('status')).toHaveTextContent('unknown');
		expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument();
	});

	it('signing out clears the session with `POST /auth/logout`', async () => {
		signedIn = true;
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		await user().click(screen.getByTestId('sign-out'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		expect(callsTo('/auth/logout')[0].init.credentials).toBe('include');
	});

	it('🔴 R-2 (negative): a logout the server did not carry out leaves the member signed in, and says so', async () => {
		signedIn = true;
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		for (const down of [() => refuse(503), () => refuse(500)]) {
			routes['POST /auth/logout'] = down;
			await user().click(screen.getByTestId('sign-out'));
		}
		await waitFor(() => expect(screen.getByTestId('sign-out-failures')).toHaveTextContent('2'));
		expect(screen.getByTestId('status')).toHaveTextContent('member');
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
	});

	it('🔴 R-2 (negative): no network: the cookies live on the API, so the page cannot say a guest', async () => {
		signedIn = true;
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
		await user().click(screen.getByTestId('sign-out'));
		await waitFor(() => expect(screen.getByTestId('sign-out-failures')).toHaveTextContent('1'));
		expect(screen.getByTestId('status')).toHaveTextContent('member');
	});

	it('R-2: a `401` means the session had already ended: a guest, with nothing to report', async () => {
		signedIn = true;
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		routes['POST /auth/logout'] = () => {
			signedIn = false;
			return refuse(401, 'EC401');
		};
		await user().click(screen.getByTestId('sign-out'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		expect(screen.getByTestId('sign-out-failures')).toHaveTextContent('0');
		expect(screen.getByTestId('forgotten')).toHaveTextContent('1');
	});

	it('🔴 R-2: a read already on its way when the logout is answered cannot write the member back', async () => {
		signedIn = true;
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		let answerRead: ((reply: Reply) => void) | undefined;
		const fetchMock = vi.mocked(fetch);
		const answered = fetchMock.getMockImplementation();
		fetchMock.mockImplementation(async (input, init = {}) => {
			if (new URL(String(input)).pathname.endsWith('/patient/me')) {
				return new Promise<Response>((resolve, reject) => {
					init.signal?.addEventListener('abort', () =>
						reject(new DOMException('Aborted', 'AbortError'))
					);
					answerRead = (reply) =>
						resolve(new Response(JSON.stringify(reply.body), { status: reply.status }));
				});
			}
			return (answered as typeof fetch)(input, init);
		});
		await user().click(screen.getByTestId('reread'));
		await waitFor(() => expect(answerRead).toBeDefined());
		await user().click(screen.getByTestId('sign-out'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		answerRead?.(ok(patient));
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('status')).toHaveTextContent('guest');
	});

	it('🔴 U-65.6: a sign-out forgets what a person wrote', async () => {
		signedIn = true;
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		await user().click(screen.getByTestId('sign-out'));
		await waitFor(() => expect(screen.getByTestId('forgotten')).toHaveTextContent('1'));
	});

	it('🔴 D-W3-37 (security web MINOR-2, NIT-1): a sign-out in ANOTHER tab of the browser ends this one too — a guest here, the drafts forgotten, no personal read and no write’s body left; only the event travels', async () => {
		signedIn = true;
		const clientOf = () =>
			new QueryClient({
				defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 0 } }
			});
		const here = clientOf();
		const there = clientOf();
		const posted: unknown[] = [];
		const listen = new BroadcastChannel(sessionChannelName);
		listen.onmessage = (event) => posted.push(event.data);
		const tabHere = render(Harness, { props: { client: here } });
		const tabThere = render(Harness, { props: { client: there } });
		const inTab = (tab: typeof tabHere, id: string) => within(tab.container).getByTestId(id);
		await waitFor(() => expect(inTab(tabHere, 'status')).toHaveTextContent('member'));
		await waitFor(() => expect(inTab(tabThere, 'status')).toHaveTextContent('member'));
		// What this tab's person wrote: a personal read and a write's body (a mobile), kept by TanStack.
		here.setQueryDefaults(['appointments'], { meta: { personal: true } });
		here.setQueryData(['appointments', 'patient'], { id: 'p' });
		await here
			.getMutationCache()
			.build(here, { mutationFn: async () => 'sent' })
			.execute({ mobilePhone: '+306912345678' });
		expect(here.getMutationCache().getAll()).toHaveLength(1);

		await user().click(inTab(tabThere, 'sign-out'));
		await waitFor(() => expect(inTab(tabThere, 'status')).toHaveTextContent('guest'));
		await waitFor(() => expect(inTab(tabHere, 'forgotten')).toHaveTextContent('1'));
		expect(inTab(tabHere, 'status')).toHaveTextContent('guest');
		expect(here.getQueryData(['appointments', 'patient'])).toBeUndefined();
		expect(here.getMutationCache().getAll()).toEqual([]);
		expect(inTab(tabThere, 'forgotten')).toHaveTextContent('1');
		// One sign-out, one word on the channel: no fact of the person.
		await waitFor(() => expect(posted).toEqual(['signed-out']));
		listen.close();
	});

	it('🔴 D-W3-37 (negative): anything else on the channel is no sign-out; a logout the server did not carry out tells no tab', async () => {
		signedIn = true;
		const posted: unknown[] = [];
		const listen = new BroadcastChannel(sessionChannelName);
		listen.onmessage = (event) => posted.push(event.data);
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		const other = new BroadcastChannel(sessionChannelName);
		other.postMessage({ type: 'signed-out', email: 'x@example.test' });
		other.postMessage('signed-out ');
		await new Promise((settle) => setTimeout(settle, 30));
		expect(screen.getByTestId('status')).toHaveTextContent('member');
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
		routes['POST /auth/logout'] = () => refuse(503);
		await user().click(screen.getByTestId('sign-out'));
		await waitFor(() => expect(screen.getByTestId('sign-out-failures')).toHaveTextContent('1'));
		await new Promise((settle) => setTimeout(settle, 30));
		expect(posted.filter((data) => data === 'signed-out')).toEqual([]);
		other.close();
		listen.close();
	});

	it('🔴 D-W3-37 (NIT-1): a sign-out here, or another account in this tab, takes every write’s body from the client’s memory', async () => {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία', tenantUserId: 'account-a' };
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 0 } }
		});
		const remember = () =>
			client
				.getMutationCache()
				.build(client, { mutationFn: async () => 'sent' })
				.execute({ amka: '01019012345', patientNote: 'Πόνος στο στήθος' });
		render(Harness, { props: { client } });
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		await remember();
		patient = { id: 'q', firstName: 'Νίκος', tenantUserId: 'account-b' };
		await user().click(screen.getByTestId('reread'));
		await waitFor(() => expect(screen.getByTestId('forgotten')).toHaveTextContent('1'));
		expect(client.getMutationCache().getAll()).toEqual([]);
		await remember();
		await user().click(screen.getByTestId('sign-out'));
		await waitFor(() => expect(screen.getByTestId('forgotten')).toHaveTextContent('2'));
		expect(client.getMutationCache().getAll()).toEqual([]);
	});

	it('🔴 U-65.6: another account in this tab forgets it too; the same one, read again, does not', async () => {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία', tenantUserId: 'account-a' };
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		await user().click(screen.getByTestId('reread'));
		await waitFor(() => expect(callsTo('/patient/me').length).toBeGreaterThan(1));
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
		patient = { id: 'q', firstName: 'Νίκος', tenantUserId: 'account-b' };
		await user().click(screen.getByTestId('reread'));
		await waitFor(() => expect(screen.getByTestId('forgotten')).toHaveTextContent('1'));
	});

	it('🔴 R-13, S-10: a doctor with no patient’s profile is told apart by the doctor’s read, with no request of its own', async () => {
		signedIn = true;
		patient = null;
		let doctorId = 'doctor-a';
		routes['GET /doctor/profile/base'] = () => ok({ doctorId, notificationEmail: 'a@b.gr' });
		render(Harness);
		await waitFor(() => expect(callsTo('/doctor/profile/base')).toHaveLength(1));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
		// The same doctor, read again: nothing goes.
		comeBackToTheTab();
		await waitFor(() => expect(callsTo('/doctor/profile/base')).toHaveLength(2));
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
		// Another doctor in this tab (a sign-in in a second tab): the reads and the words of the first go.
		doctorId = 'doctor-b';
		comeBackToTheTab();
		await waitFor(() => expect(screen.getByTestId('forgotten')).toHaveTextContent('1'));
	});

	it('🔴 R-13, S-10: a doctor signing in over another’s ended session starts clean; the same one finds the words', async () => {
		signedIn = true;
		patient = null;
		let doctorId = 'doctor-a';
		routes['GET /doctor/profile/base'] = () => ok({ doctorId });
		render(Harness);
		await waitFor(() => expect(callsTo('/doctor/profile/base')).toHaveLength(1));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		await new Promise((done) => setTimeout(done, 0));
		signedIn = false;
		await user().click(screen.getByTestId('expire'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		signedIn = true;
		await user().click(screen.getByTestId('reread'));
		await waitFor(() => expect(callsTo('/doctor/profile/base')).toHaveLength(2));
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
		signedIn = false;
		await user().click(screen.getByTestId('expire'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		doctorId = 'doctor-b';
		signedIn = true;
		await user().click(screen.getByTestId('reread'));
		await waitFor(() => expect(screen.getByTestId('forgotten')).toHaveTextContent('1'));
	});

	it('🔴 U-84: a session that ended under a write: the page knows nobody and the sign-in opens, keeping what was written; the same person back forgets nothing', async () => {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία', tenantUserId: 'account-a' };
		const action = vi.fn();
		render(Harness, { props: { onSignedIn: action } });
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		signedIn = false;
		await user().click(screen.getByTestId('expire'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		expect(screen.getByTestId('auth-dialog')).toHaveAttribute('data-state', 'open');
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
		expect(action).not.toHaveBeenCalled();
		await submitIdentifier('patient-3@seed.edoctor.test');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		await waitFor(() => expect(action).toHaveBeenCalledOnce());
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
	});

	it('🔴 D-W4-78 (U-84): the ended session is SAID (`expired`) while the sign-in it opened is open; the same person back ends it, nothing forgotten', async () => {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία', tenantUserId: 'account-a' };
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		expect(screen.getByTestId('expired')).toHaveTextContent('false');
		signedIn = false;
		await user().click(screen.getByTestId('expire'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		expect(screen.getByTestId('expired')).toHaveTextContent('true');
		await submitIdentifier('patient-3@seed.edoctor.test');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		await waitFor(() => expect(screen.getByTestId('expired')).toHaveTextContent('false'));
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
	});

	it('🔴 D-W4-78 (negative): ANOTHER account signing in over the ended session — what was written is forgotten and the ended session is over with it', async () => {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία', tenantUserId: 'account-a' };
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		signedIn = false;
		await user().click(screen.getByTestId('expire'));
		await waitFor(() => expect(screen.getByTestId('expired')).toHaveTextContent('true'));
		patient = { id: 'q', firstName: 'Νίκος', tenantUserId: 'account-b' };
		await submitIdentifier('patient-4@seed.edoctor.test');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		await waitFor(() => expect(screen.getByTestId('forgotten')).toHaveTextContent('1'));
		expect(screen.getByTestId('status')).toHaveTextContent('member');
		expect(screen.getByTestId('expired')).toHaveTextContent('false');
	});

	it('🔴 D-W4-78 (negative): «×» on the sign-in of an ended session: a guest, and the ended session is over — nothing waits under a sign-in that closed', async () => {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία', tenantUserId: 'account-a' };
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		signedIn = false;
		await user().click(screen.getByTestId('expire'));
		await waitFor(() => expect(screen.getByTestId('expired')).toHaveTextContent('true'));
		await user().click(await screen.findByTestId('auth-close'));
		await waitFor(() => expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument());
		expect(screen.getByTestId('expired')).toHaveTextContent('false');
		expect(screen.getByTestId('status')).toHaveTextContent('guest');
	});

	/** The browser shows the page: put back from its back/forward cache as it was left (`persisted`), or loaded. */
	function pageShown(persisted: boolean) {
		const event = new Event('pageshow');
		Object.defineProperty(event, 'persisted', { value: persisted });
		window.dispatchEvent(event);
	}

	/** A member whose session ended under a write: the sign-in open over the page, the ended session said. */
	async function endedUnderAWrite(onSignedIn?: () => void, onSignInAbandoned?: () => void) {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία', tenantUserId: 'account-a' };
		const view = render(Harness, { props: { onSignedIn, onSignInAbandoned } });
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		signedIn = false;
		await user().click(screen.getByTestId('expire'));
		await waitFor(() => expect(screen.getByTestId('expired')).toHaveTextContent('true'));
		expect(await screen.findByTestId('auth-dialog')).toHaveAttribute('data-state', 'open');
		return view;
	}

	it('🔴 U-153 (card w4-w12; live check w4-live-web-3 Δ5): a page the browser puts back from its back/forward cache with the ended session still under its sign-in is left as by «×» — a guest, the sign-in closed, the ended session over, what waited for it told gone and never run', async () => {
		const action = vi.fn();
		const abandoned = vi.fn();
		await endedUnderAWrite(action, abandoned);
		pageShown(true);
		await waitFor(() => expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument());
		expect(screen.getByTestId('expired')).toHaveTextContent('false');
		expect(screen.getByTestId('status')).toHaveTextContent('guest');
		expect(abandoned).toHaveBeenCalledOnce();
		expect(action).not.toHaveBeenCalled();
		// The same way as «×»: nothing else is touched (a draft goes with a sign-out or another account, not here).
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
		// Shown again: there is nothing left to leave.
		pageShown(true);
		expect(abandoned).toHaveBeenCalledOnce();
	});

	it('U-153 (negative): a page merely shown (a load, `persisted` false) keeps the ended session under its sign-in as it is', async () => {
		const abandoned = vi.fn();
		await endedUnderAWrite(undefined, abandoned);
		pageShown(false);
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('auth-dialog')).toHaveAttribute('data-state', 'open');
		expect(screen.getByTestId('expired')).toHaveTextContent('true');
		expect(abandoned).not.toHaveBeenCalled();
	});

	it('U-153 (negative): a page put back with NO ended session does not change — a guest’s sign-in asked by a card stays open, a member stays a member', async () => {
		const abandoned = vi.fn();
		const view = await openFlow(undefined, abandoned);
		expect(screen.getByTestId('expired')).toHaveTextContent('false');
		pageShown(true);
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('auth-dialog')).toHaveAttribute('data-state', 'open');
		expect(abandoned).not.toHaveBeenCalled();
		view.unmount();

		signedIn = true;
		render(Harness, { props: { onSignInAbandoned: abandoned } });
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		pageShown(true);
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('status')).toHaveTextContent('member');
		expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument();
		expect(abandoned).not.toHaveBeenCalled();
	});

	it('U-153 (negative): the same person already signed in again, on «set a password» past the sign-in — the page is theirs: put back, it stays as it is, and what waited still runs once', async () => {
		const action = vi.fn();
		const abandoned = vi.fn();
		await endedUnderAWrite(action, abandoned);
		await submitIdentifier('a@b.gr');
		await user().click(await screen.findByTestId('auth-try-another-way'));
		await user().click(await screen.findByTestId('auth-use-password'));
		await user().click(await screen.findByTestId('auth-password-forgot'));
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		const step = await screen.findByTestId('auth-step-set-password');
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		expect(screen.getByTestId('expired')).toHaveTextContent('true');
		pageShown(true);
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('auth-step-set-password')).toBe(step);
		expect(screen.getByTestId('status')).toHaveTextContent('member');
		expect(abandoned).not.toHaveBeenCalled();
		expect(action).not.toHaveBeenCalled();
		await user().click(within(step).getByTestId('auth-set-password-later'));
		await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
		expect(screen.getByTestId('forgotten')).toHaveTextContent('0');
	});

	it('U-153: ONE listener of the page’s showing, and it goes with the host', async () => {
		const added = vi.spyOn(window, 'addEventListener');
		const removed = vi.spyOn(window, 'removeEventListener');
		const abandoned = vi.fn();
		try {
			const view = await endedUnderAWrite(undefined, abandoned);
			const listeners = added.mock.calls.filter(([type]) => type === 'pageshow');
			expect(listeners).toHaveLength(1);
			view.unmount();
			expect(removed).toHaveBeenCalledWith('pageshow', listeners[0][1]);
			pageShown(true);
			expect(abandoned).not.toHaveBeenCalled();
		} finally {
			added.mockRestore();
			removed.mockRestore();
		}
	});

	it('the session says whether the account has a patient’s profile (`null` from the server: none)', async () => {
		signedIn = true;
		patient = { id: 'p', firstName: 'Μαρία' };
		const { unmount } = render(Harness);
		await waitFor(() => expect(screen.getByTestId('patient-profile')).toHaveTextContent('true'));
		unmount();
		patient = null;
		render(Harness);
		await waitFor(() => expect(screen.getByTestId('patient-profile')).toHaveTextContent('false'));
	});
});

describe('the flow: the application’s steps (U-64.3, Π1)', () => {
	it('Ε4: email ⇒ code ⇒ signed in: the surface closes and the action that asked runs once', async () => {
		const action = vi.fn();
		await openFlow(action);
		await submitIdentifier('Patient-3@seed.edoctor.test');
		expect(callsTo('/auth/access/start')[0].body).toMatchObject({
			email: 'patient-3@seed.edoctor.test',
			tenantSlug: 'edoctor-seed-main'
		});
		const otp = await screen.findByTestId('auth-step-otp');
		expect(within(otp).getByTestId('auth-otp-subtitle')).toHaveTextContent(
			'Ο κωδικός εστάλη στη διεύθυνση p***3@seed.edoctor.test.'
		);
		await typeCode();
		// Never on the sixth digit: only when asked.
		expect(callsTo('/auth/access/verify')).toHaveLength(0);
		await user().click(screen.getByTestId('auth-verify'));
		await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		expect(callsTo('/auth/access/verify')[0].body).toMatchObject({ code: '123456' });
	});

	it('🔴 D-W3-39 (review w3-w6 R1 MAJOR-N1, R2 NIT-3): the code goes out in the page’s language — `?lang=el` on a Greek page, `?lang=en` on an English one, its «Αποστολή νέου» too', async () => {
		const first = await openFlow();
		await submitIdentifier('a@b.gr');
		await screen.findByTestId('auth-step-otp');
		expect(callsTo('/auth/access/start').map((call) => call.lang)).toEqual(['el']);
		first.unmount();
		(page as { url: URL }).url = new URL('http://localhost/en/');
		await openFlow();
		await submitIdentifier('a@b.gr');
		await screen.findByTestId('auth-step-otp');
		expect(callsTo('/auth/access/start').map((call) => call.lang)).toEqual(['el', 'en']);
		// Review w3-w6 R2 NIT-3: «Αποστολή νέου» once the 60″ are over says the same language.
		const later = Date.now() + 61_000;
		const clock = vi.spyOn(Date, 'now').mockImplementation(() => later);
		try {
			await user().click(screen.getByTestId('auth-resend'));
			await waitFor(() => expect(callsTo('/auth/access/resend')).toHaveLength(1));
		} finally {
			clock.mockRestore();
		}
		expect(callsTo('/auth/access/resend')[0].lang).toBe('en');
	});

	it('Π1: «Συνέχεια» stays off until the sixth digit', async () => {
		await openFlow();
		await submitIdentifier('a@b.gr');
		await typeCode('12345');
		expect(screen.getByTestId('auth-verify')).toBeDisabled();
		await typeCode('123456');
		expect(screen.getByTestId('auth-verify')).toBeEnabled();
	});

	it('Π5 (negative): an identifier it cannot read is one line and no request', async () => {
		await openFlow();
		await submitIdentifier('maria@');
		expect(await screen.findByTestId('auth-error')).toHaveTextContent(
			'Εισαγάγετε έγκυρο email ή αριθμό τηλεφώνου.'
		);
		expect(callsTo('/auth/access/start')).toHaveLength(0);
	});

	it('🔴 record §6.7: on a phone the sentence says the number, not «διεύθυνση»; no «other way» there', async () => {
		routes['POST /auth/access/start'] = () => ok({ success: true, channel: 'phone' });
		await openFlow();
		await submitIdentifier('6912345678');
		expect(callsTo('/auth/access/start')[0].body).toMatchObject({ mobilePhone: '+306912345678' });
		const subtitle = await screen.findByTestId('auth-otp-subtitle');
		expect(subtitle).toHaveTextContent('Ο κωδικός εστάλη στον αριθμό ***678.');
		expect(subtitle).not.toHaveTextContent('διεύθυνση');
		expect(screen.queryByTestId('auth-try-another-way')).not.toBeInTheDocument();
	});

	it('Π5: a number the server refuses names itself; another failure is the generic line', async () => {
		routes['POST /auth/access/start'] = () => refuse(400);
		await openFlow();
		await submitIdentifier('6912345678');
		expect(await screen.findByTestId('auth-error')).toHaveTextContent(
			'Ελέγξτε τον αριθμό τηλεφώνου και δοκιμάστε ξανά.'
		);
		routes['POST /auth/access/start'] = () => refuse(500);
		await user().click(screen.getByTestId('auth-continue'));
		await waitFor(() =>
			expect(screen.getByTestId('auth-error')).toHaveTextContent('Κάτι πήγε στραβά.')
		);
	});

	it('Π5: a throttled send opens the code saying one is already out there', async () => {
		routes['POST /auth/access/start'] = () => refuse(429);
		await openFlow();
		await submitIdentifier('a@b.gr');
		expect(await screen.findByTestId('auth-otp-subtitle')).toHaveTextContent(
			'Σας έχει ήδη σταλεί πρόσφατα κωδικός'
		);
	});

	it('Π5: a wrong code is its line, the cells empty; three of them lock', async () => {
		routes['POST /auth/access/verify'] = () => refuse(400, 'EC011');
		await openFlow();
		await submitIdentifier('a@b.gr');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		expect(await screen.findByTestId('auth-error')).toHaveTextContent(
			'Ο κωδικός δεν είναι σωστός.'
		);
		expect(screen.getByTestId('auth-code')).toHaveValue('');
		routes['POST /auth/access/verify'] = () => refuse(401, 'EC008');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		await waitFor(() =>
			expect(screen.getByTestId('auth-error')).toHaveTextContent('Πολλές προσπάθειες.')
		);
	});

	it('Π5: «Αποστολή νέου» waits with the seconds of the client’s own mirror', async () => {
		await openFlow();
		await submitIdentifier('a@b.gr');
		await user().click(await screen.findByTestId('auth-resend'));
		expect(await screen.findByTestId('auth-resend-feedback')).toHaveTextContent(/Περιμένετε \d+δ/u);
		expect(callsTo('/auth/access/resend')).toHaveLength(0);
	});

	it('a new visitor: the ticket opens the form, whose back lands on the entry; the password only for an address', async () => {
		routes['POST /auth/access/verify'] = () =>
			ok({ outcome: 'registration-required', tenantUser: null, registrationTicket: 'ticket-1' });
		const action = vi.fn();
		await openFlow(action);
		await submitIdentifier('new@b.gr');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		const form = await screen.findByTestId('auth-step-register');
		expect(within(form).getByTestId('auth-new-password')).toBeInTheDocument();
		// An incomplete form never leaves the step.
		await user().click(within(form).getByTestId('auth-register-submit'));
		expect(await within(form).findByTestId('auth-name-error')).toHaveTextContent(
			'Συμπληρώστε το όνομά σας'
		);
		expect(within(form).getByTestId('auth-birth-date-error')).toBeInTheDocument();
		expect(
			within(form).getByText('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες')
		).toBeTruthy();
		expect(callsTo('/auth/access/complete-registration')).toHaveLength(0);

		await user().type(within(form).getByTestId('auth-first-name'), 'Ελένη');
		await user().type(within(form).getByTestId('auth-last-name'), 'Γεωργίου');
		await user().type(within(form).getByTestId('auth-new-password'), 'Secret123');
		await user().click(within(form).getByTestId('auth-birth-date'));
		await user().selectOptions(await screen.findByTestId('auth-date-year'), '1988');
		await user().selectOptions(screen.getByTestId('auth-date-month'), '4');
		await user().selectOptions(screen.getByTestId('auth-date-day'), '12');
		await user().click(screen.getByTestId('auth-date-confirm'));
		await user().click(within(form).getByTestId('auth-gender'));
		await user().click(await screen.findByTestId('auth-option-FEMALE'));
		await user().click(within(form).getByTestId('auth-register-submit'));
		await waitFor(() => expect(callsTo('/auth/access/complete-registration')).toHaveLength(1));
		expect(callsTo('/auth/access/complete-registration')[0].body).toEqual({
			tenantSlug: 'edoctor-seed-main',
			registrationTicket: 'ticket-1',
			firstName: 'Ελένη',
			lastName: 'Γεωργίου',
			dateOfBirth: '1988-04-12T00:00:00.000Z',
			gender: 'FEMALE',
			language: 'el',
			password: 'Secret123',
			legalAcceptance: {
				context: 'PATIENT',
				acceptances: [
					{ accepted: true, documentCode: 'CORE_TERMS_OF_USE', version: '3' },
					{ accepted: true, documentCode: 'CORE_PRIVACY_POLICY', version: '2' }
				]
			}
		});
		await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
		// The memory of «Καλωσορίσατε»: the name from the form, the mask, never the address.
		const stored = window.localStorage.getItem(knownAccountStorageKey) ?? '';
		expect(JSON.parse(stored)).toEqual({
			firstName: 'Ελένη',
			maskedIdentifier: 'n***w@b.gr',
			channel: 'email',
			lastMethod: 'otp'
		});
		expect(stored).not.toContain('new@b.gr');
		expect(JSON.stringify({ ...window.sessionStorage })).not.toContain('new@b.gr');
	});

	it('a phone sign-up has no password field', async () => {
		routes['POST /auth/access/start'] = () => ok({ success: true, channel: 'phone' });
		routes['POST /auth/access/verify'] = () =>
			ok({ outcome: 'registration-required', tenantUser: null, registrationTicket: 't' });
		await openFlow();
		await submitIdentifier('6912345678');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		const form = await screen.findByTestId('auth-step-register');
		expect(within(form).queryByTestId('auth-new-password')).not.toBeInTheDocument();
	});

	it('Π5: a spent ticket goes back to the entry with its line', async () => {
		routes['POST /auth/access/verify'] = () =>
			ok({ outcome: 'registration-required', tenantUser: null, registrationTicket: 't' });
		routes['POST /auth/access/complete-registration'] = () => refuse(400, 'EC016');
		await openFlow();
		await submitIdentifier('6912345678');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		const form = await screen.findByTestId('auth-step-register');
		await user().type(within(form).getByTestId('auth-first-name'), 'Α');
		await user().type(within(form).getByTestId('auth-last-name'), 'Β');
		await user().click(within(form).getByTestId('auth-birth-date'));
		await user().click(await screen.findByTestId('auth-date-confirm'));
		await user().click(within(form).getByTestId('auth-register-submit'));
		const entry = await screen.findByTestId('auth-step-entry');
		expect(within(entry).getByTestId('auth-error')).toHaveTextContent('Το βήμα σύνδεσης έληξε.');
	});

	it('the other way: the password; a wrong one is emptied, its line says so', async () => {
		routes['POST /auth/login'] = () => refuse(401, 'EC412');
		await openFlow();
		await submitIdentifier('a@b.gr');
		await user().click(await screen.findByTestId('auth-try-another-way'));
		await user().click(await screen.findByTestId('auth-use-password'));
		const step = await screen.findByTestId('auth-step-password');
		expect(within(step).getByTestId('auth-password-submit')).toBeDisabled();
		await user().type(within(step).getByTestId('auth-password'), 'wrong-pass');
		await user().click(within(step).getByTestId('auth-password-submit'));
		expect(await within(step).findByTestId('auth-error')).toHaveTextContent(
			'Ο κωδικός πρόσβασης δεν είναι σωστός.'
		);
		expect(within(step).getByTestId('auth-password')).toHaveValue('');
	});

	it('«Ξέχασα»: back to the code, and the sign-in that spends it stays open on the password; «Όχι τώρα» leaves', async () => {
		const action = vi.fn();
		await openFlow(action);
		await submitIdentifier('a@b.gr');
		await user().click(await screen.findByTestId('auth-try-another-way'));
		await user().click(await screen.findByTestId('auth-use-password'));
		await user().click(await screen.findByTestId('auth-password-forgot'));
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		const step = await screen.findByTestId('auth-step-set-password');
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('member'));
		// No «‹»: the sign-in beneath it is done.
		expect(screen.queryByTestId('auth-back')).not.toBeInTheDocument();
		expect(action).not.toHaveBeenCalled();
		await user().click(within(step).getByTestId('auth-set-password-later'));
		await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
	});

	it('set a password: code ⇒ new password in one call; a refused code goes back to the cells', async () => {
		await openFlow();
		await submitIdentifier('a@b.gr');
		await user().click(await screen.findByTestId('auth-try-another-way'));
		await user().click(await screen.findByTestId('auth-use-password'));
		await user().click(await screen.findByTestId('auth-password-forgot'));
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		await user().click(await screen.findByTestId('auth-set-password-send'));
		// 🔴 D-W3-39: the code's email in the page's language.
		await waitFor(() =>
			expect(
				callsTo('/auth/password-credentials/me/set-password/init').map((call) => call.lang)
			).toEqual(['el'])
		);
		await fireEvent.input(
			within(await screen.findByTestId('auth-step-set-password-code')).getByTestId('auth-code'),
			{ target: { value: '654321' } }
		);
		await user().click(screen.getByTestId('auth-set-password-code-continue'));
		const step = await screen.findByTestId('auth-step-set-password-new');
		await user().click(screen.getByTestId('auth-set-password-save'));
		expect(
			await within(step).findByText('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες')
		).toBeTruthy();
		expect(callsTo('/auth/password-credentials/me/set-password')).toHaveLength(0);
		routes['POST /auth/password-credentials/me/set-password'] = () => refuse(400, 'EC011');
		await user().type(within(step).getByTestId('auth-set-password-new'), 'Secret123');
		await user().click(screen.getByTestId('auth-set-password-save'));
		await waitFor(() => expect(screen.getByTestId('auth-step-set-password-code')).toBeTruthy());
		expect(callsTo('/auth/password-credentials/me/set-password')[0].body).toEqual({
			code: '654321',
			newPassword: 'Secret123'
		});
		expect(await screen.findByTestId('auth-error')).toHaveTextContent(
			'Ο κωδικός δεν είναι σωστός.'
		);
	});

	it('U-65.6: every field has its limit', async () => {
		routes['POST /auth/access/verify'] = () =>
			ok({ outcome: 'registration-required', tenantUser: null, registrationTicket: 't' });
		await openFlow();
		const entry = await screen.findByTestId('auth-step-entry');
		expect(within(entry).getByTestId('auth-identifier')).toHaveAttribute('maxlength', '254');
		await submitIdentifier('a@b.gr');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		const form = await screen.findByTestId('auth-step-register');
		expect(within(form).getByTestId('auth-first-name')).toHaveAttribute('maxlength', '100');
		expect(within(form).getByTestId('auth-last-name')).toHaveAttribute('maxlength', '100');
		expect(within(form).getByTestId('auth-new-password')).toHaveAttribute('maxlength', '128');
	});

	it('U-65.6 (negative): the name in the browser’s memory is never markup', async () => {
		window.localStorage.setItem(
			knownAccountStorageKey,
			JSON.stringify({
				firstName: '<img src=x onerror=alert(1)>',
				maskedIdentifier: 'a***@b.gr',
				channel: 'email',
				lastMethod: 'otp'
			})
		);
		await openFlow();
		const step = await screen.findByTestId('auth-step-welcome');
		expect(step.querySelector('img')).toBeNull();
		expect(step).toHaveTextContent('<img src=x onerror=alert(1)>');
	});

	it('Π1 · 2: a browser that remembers greets by name, with the mask only; «Δεν είστε εσείς;» is the entry', async () => {
		window.localStorage.setItem(
			knownAccountStorageKey,
			JSON.stringify({
				firstName: 'Μαρία',
				maskedIdentifier: 'p***3@seed.edoctor.test',
				channel: 'email',
				lastMethod: 'otp'
			})
		);
		await openFlow();
		const step = await screen.findByTestId('auth-step-welcome');
		expect(step).toHaveTextContent('Καλωσορίσατε και πάλι, Μαρία');
		expect(within(step).getByTestId('auth-known-identifier')).toHaveTextContent(
			'p***3@seed.edoctor.test'
		);
		await user().click(within(step).getByTestId('auth-welcome-not-you'));
		expect(await screen.findByTestId('auth-step-entry')).toBeInTheDocument();
	});

	it('Π4 (negative): the flow writes no identifier, code or ticket in the address or the storage', async () => {
		routes['POST /auth/access/verify'] = () =>
			ok({
				outcome: 'registration-required',
				tenantUser: null,
				registrationTicket: 'ticket-secret'
			});
		const address = window.location.href;
		await openFlow();
		await submitIdentifier('private@b.gr');
		await typeCode('987654');
		await user().click(screen.getByTestId('auth-verify'));
		await screen.findByTestId('auth-step-register');
		const stored = JSON.stringify([{ ...window.localStorage }, { ...window.sessionStorage }]);
		for (const secret of ['private@b.gr', '987654', 'ticket-secret']) {
			expect(stored).not.toContain(secret);
		}
		expect(window.location.href).toBe(address);
	});

	it('«×» and Escape leave and forget what asked', async () => {
		const action = vi.fn();
		await openFlow(action);
		await user().click(await screen.findByTestId('auth-close'));
		await waitFor(() => expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument());
		expect(action).not.toHaveBeenCalled();
		await user().click(screen.getByTestId('ask'));
		await screen.findByTestId('auth-dialog');
		await user().keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument());
	});

	it('R-8: the surface does not stay over another page (the browser’s «back»), and what asked for it never runs there', async () => {
		const action = vi.fn();
		const abandoned = vi.fn();
		await openFlow(action, abandoned);
		const navigated = vi.mocked(afterNavigate).mock.calls.at(-1)?.[0] as (
			navigation: unknown
		) => void;
		const at = (pathname: string, search = '') => ({
			url: new URL(`http://localhost${pathname}${search}`)
		});
		// The same page: a hash or a query moved, the surface stays.
		navigated({ type: 'popstate', from: at('/doctors/a'), to: at('/doctors/a', '?x=1') });
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('auth-dialog')).toHaveAttribute('data-state', 'open');
		navigated({ type: 'popstate', from: at('/doctors/a'), to: at('/doctors') });
		await waitFor(() => expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument());
		expect(abandoned).toHaveBeenCalledOnce();
		expect(action).not.toHaveBeenCalled();
	});

	it('R-8 (negative): no surface open, a navigation has nothing to leave', async () => {
		const abandoned = vi.fn();
		render(Harness, { props: { onSignInAbandoned: abandoned } });
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		const navigated = vi.mocked(afterNavigate).mock.calls.at(-1)?.[0] as (
			navigation: unknown
		) => void;
		navigated({
			type: 'link',
			from: { url: new URL('http://localhost/a') },
			to: { url: new URL('http://localhost/b') }
		});
		expect(abandoned).not.toHaveBeenCalled();
	});

	it('`w2-w3` §Ανοιχτά 2: «×» and Escape say the sign-in was left, so what waited for it in the tab can go', async () => {
		const abandoned = vi.fn();
		await openFlow(undefined, abandoned);
		expect(abandoned).not.toHaveBeenCalled();
		await user().click(await screen.findByTestId('auth-close'));
		await waitFor(() => expect(abandoned).toHaveBeenCalledTimes(1));
		await user().click(screen.getByTestId('ask'));
		await screen.findByTestId('auth-dialog');
		await user().keyboard('{Escape}');
		await waitFor(() => expect(abandoned).toHaveBeenCalledTimes(2));
	});

	it('`w2-w3` §Ανοιχτά 2 (negative): a sign-in that finished has left nothing behind to forget', async () => {
		const abandoned = vi.fn();
		const action = vi.fn();
		await openFlow(action, abandoned);
		await submitIdentifier('a@b.gr');
		await typeCode();
		await user().click(screen.getByTestId('auth-verify'));
		await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
		expect(abandoned).not.toHaveBeenCalled();
	});
});

describe('the providers (Ε5, `P-B-backend.md` §8.3)', () => {
	it('Apple: a whole-page visit to its start with an absolute way back and one JSON acceptance', async () => {
		(page as { url: URL }).url = new URL('http://localhost/doctors/a-pappas');
		await openFlow();
		await user().click(await screen.findByTestId('auth-apple'));
		await waitFor(() => expect(leaveFor).toHaveBeenCalledTimes(1));
		const url = new URL(vi.mocked(leaveFor).mock.calls[0][0]);
		expect(url.pathname).toBe('/api/v1/auth/register/apple');
		const redirect = new URL(url.searchParams.get('redirectUrl') ?? '');
		expect(redirect.origin).toBe(window.location.origin);
		expect(redirect.pathname).toBe('/login');
		expect(redirect.searchParams.get('next')).toBe('/doctors/a-pappas');
		expect(redirect.searchParams.get('do')).toBe('book');
		expect(redirect.searchParams.get('via')).toBe('apple');
		// 🔴 `w2-b5` §2: at Apple the acceptance is required, so nothing leaves without it, whole, with what was read.
		expect(JSON.parse(url.searchParams.get('legalAcceptance') ?? '')).toEqual({
			context: 'PATIENT',
			acceptances: [
				{ accepted: true, documentCode: 'CORE_TERMS_OF_USE', version: '3' },
				{ accepted: true, documentCode: 'CORE_PRIVACY_POLICY', version: '2' }
			]
		});
		expect((url.searchParams.get('legalAcceptance') ?? '').length).toBeLessThanOrEqual(2048);
		expect(url.searchParams.get('tenantSlug')).toBe('edoctor-seed-main');
		// Π4: what waits in the tab is the action and the path, nothing personal.
		expect(JSON.parse(Object.values({ ...window.sessionStorage })[0] as string)).toEqual({
			next: '/doctors/a-pappas',
			action: 'book'
		});
	});

	it.each(['google', 'apple'])(
		'`w2-b5` §5.11: %s: nothing asks the start before leaving, so no `state` and no rate limit are spent by a look ahead',
		async (provider) => {
			await openFlow();
			await user().click(await screen.findByTestId(`auth-${provider}`));
			await waitFor(() => expect(leaveFor).toHaveBeenCalledTimes(1));
			expect(calls.filter((call) => call.path.startsWith('/auth/register/'))).toEqual([]);
			expect(calls.some((call) => call.init.redirect === 'manual')).toBe(false);
		}
	);

	it.each(['google', 'apple'])(
		'Π5 (negative): %s: an API that does not answer stays a line on the step, and no redirect',
		async (provider) => {
			routes['GET /content/public/pages/privacy-policy'] = () => refuse(500);
			await openFlow();
			await user().click(await screen.findByTestId(`auth-${provider}`));
			expect(await screen.findByTestId('auth-error')).toHaveTextContent(
				'Δεν μπορέσαμε να επιβεβαιώσουμε τους ισχύοντες όρους.'
			);
			expect(leaveFor).not.toHaveBeenCalled();
			expect(window.sessionStorage.length).toBe(0);
		}
	);

	it('Π5 (negative): without a network the line comes at once, and the button does not wait for one', async () => {
		await openFlow();
		onlineManager.setOnline(false);
		try {
			vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
			await user().click(await screen.findByTestId('auth-apple'));
			expect(await screen.findByTestId('auth-error')).toHaveTextContent(
				'Δεν μπορέσαμε να επιβεβαιώσουμε τους ισχύοντες όρους.'
			);
			expect(leaveFor).not.toHaveBeenCalled();
		} finally {
			onlineManager.setOnline(true);
		}
	});

	it('Π5 (negative): the versions are read afresh: a read of a moment ago does not hide an API that has just gone', async () => {
		await openFlow();
		await user().click(await screen.findByTestId('auth-google'));
		await waitFor(() => expect(leaveFor).toHaveBeenCalledTimes(1));
		routes['GET /content/public/pages/terms-of-use'] = () => refuse(503);
		await user().click(screen.getByTestId('auth-google'));
		expect(await screen.findByTestId('auth-error')).toHaveTextContent(
			'Δεν μπορέσαμε να επιβεβαιώσουμε τους ισχύοντες όρους.'
		);
		expect(leaveFor).toHaveBeenCalledTimes(1);
	});

	it.each([
		['google', 'Συνέχεια με Google'],
		['apple', 'Συνέχεια με Apple']
	])(
		'`w2-w1` §Ανοιχτά 3: a browser that last came through %s leads with that door, the code the way around it',
		async (provider, label) => {
			window.localStorage.setItem(
				knownAccountStorageKey,
				JSON.stringify({
					firstName: 'Μαρία',
					maskedIdentifier: 'm***a@b.gr',
					channel: 'email',
					lastMethod: provider
				})
			);
			await openFlow();
			const step = await screen.findByTestId('auth-step-welcome');
			expect(within(step).getByTestId('auth-known-identifier')).toHaveTextContent('m***a@b.gr');
			expect(within(step).queryByTestId('auth-welcome-sign-in')).not.toBeInTheDocument();
			const door = within(step).getByTestId(`auth-welcome-${provider}`);
			expect(door).toHaveTextContent(label);
			await user().click(door);
			await waitFor(() => expect(leaveFor).toHaveBeenCalledTimes(1));
			expect(new URL(vi.mocked(leaveFor).mock.calls[0][0]).pathname).toBe(
				`/api/v1/auth/register/${provider}`
			);
		}
	);

	it('`w2-w1` §Ανοιχτά 3: the way around a provider: only the mask is known, so the entry step asks for the address', async () => {
		window.localStorage.setItem(
			knownAccountStorageKey,
			JSON.stringify({
				firstName: 'Μαρία',
				maskedIdentifier: 'm***a@b.gr',
				channel: 'email',
				lastMethod: 'apple'
			})
		);
		await openFlow();
		await user().click(await screen.findByTestId('auth-welcome-code'));
		expect(await screen.findByTestId('auth-step-entry')).toBeInTheDocument();
		expect(callsTo('/auth/access/start')).toHaveLength(0);
	});

	it('U-96: Apple and Google tiles stay white in both themes, with the same outline and Apple’s whole file', async () => {
		await openFlow();
		const apple = await screen.findByTestId('auth-apple');
		const google = screen.getByTestId('auth-google');
		for (const tile of [apple, google]) {
			expect(tile).toHaveStyle({ backgroundColor: SIGN_IN_PROVIDER_COLORS.surface });
			expect(tile).toHaveClass(
				'size-control-xl',
				'rounded-md',
				'border',
				'border-border',
				'active:border-primary'
			);
			expect(tile).not.toHaveClass('active:bg-muted');
		}
		// U-95: at the full 64 of the tile, with no margin of ours; the «G» as it was.
		const mark = apple.querySelector('[data-slot="brand-apple"]') as SVGElement;
		expect(mark).toHaveAttribute('viewBox', '0 0 56 56');
		expect(mark).toHaveClass('size-control-xl');
		expect(google.querySelector('[data-slot="brand-google"]')).toHaveClass('icon-lg');
	});

	it('U-95, U-96, U-100: «Συνέχεια με Apple» is white in both themes, its title and file black and centred, the file as high as the button', async () => {
		window.localStorage.setItem(
			knownAccountStorageKey,
			JSON.stringify({
				firstName: 'Μαρία',
				maskedIdentifier: 'm***a@b.gr',
				channel: 'email',
				lastMethod: 'apple'
			})
		);
		await openFlow();
		const button = await screen.findByTestId('auth-welcome-apple');
		expect(button).toHaveStyle({ backgroundColor: SIGN_IN_PROVIDER_COLORS.surface });
		expect(button).toHaveClass('min-h-control-md', 'justify-center');
		const mark = button.querySelector('[data-slot="brand-apple-left-aligned"]') as SVGElement;
		expect(mark).toHaveAttribute('viewBox', '0 0 31 44');
		// The file's height is the button's (Apple's HIG).
		expect(mark).toHaveClass('h-control-md');
		expect(mark).not.toHaveClass('h-control-lg');
		const title = button.querySelector('[data-slot="auth-apple-continue-title"]') as HTMLElement;
		expect(title).toHaveTextContent('Συνέχεια με Apple');
		expect(title).toHaveClass('text-body-lg', 'font-medium');
		expect(title).toHaveStyle({ color: SIGN_IN_PROVIDER_COLORS.mark });
		// The press marks the outline, never the white under Apple's file.
		const outline = button.querySelector('span[aria-hidden="true"]') as HTMLElement;
		expect(outline).toHaveClass('group-active:border-primary', 'group-active:border-2');
		expect(button.className).not.toContain('active:bg');
	});

	it('Ε5 (`P-B-backend.md` §8.10): no script of Apple or Google on our pages', () => {
		const sources = [
			...readSourceFiles(),
			{ path: 'src/app.html', text: readFileSync(join(projectRoot, 'src/app.html'), 'utf8') }
		];
		const found = sources.filter((file) =>
			/appleid\.apple\.com|accounts\.google\.com|apis\.google\.com|gsi\/client/u.test(file.text)
		);
		expect(found.map((file) => file.path)).toEqual([]);
	});

	it('Μ14, U-95: the old CC0 mark is gone, and each official Apple file is drawn in one place', () => {
		const sources = readSourceFiles();
		const drawing = (start: string) =>
			sources.filter((file) => file.text.includes(start)).map((file) => file.path);
		expect(drawing('M12.152 6.896')).toEqual([]);
		expect(drawing('M28.2226562,20.3846154')).toEqual([
			'src/shared/ui/icons/brand-apple/brand-apple.svelte'
		]);
		expect(drawing('M15.7099491,14.8846154')).toEqual([
			'src/shared/ui/icons/brand-apple/brand-apple-left-aligned.svelte'
		]);
	});
});

describe('the owed profile (D-83, Π1 · 9)', () => {
	it('owed to a session without a profile that the server said is no doctor: no «×», no way out but its own', async () => {
		signedIn = true;
		patient = null;
		render(Harness);
		const step = await screen.findByTestId('auth-step-onboarding');
		expect(screen.queryByTestId('auth-close')).not.toBeInTheDocument();
		expect(screen.queryByTestId('auth-back')).not.toBeInTheDocument();
		await fireEvent.keyDown(screen.getByTestId('auth-dialog'), { key: 'Escape' });
		expect(screen.getByTestId('auth-dialog')).toHaveAttribute('data-state', 'open');
		expect(within(step).getByTestId('auth-onboarding-delete')).toHaveAttribute(
			'href',
			'/account-deletion'
		);
		await user().type(within(step).getByTestId('auth-first-name'), 'Ελένη');
		await user().type(within(step).getByTestId('auth-last-name'), 'Γ');
		await user().click(within(step).getByTestId('auth-birth-date'));
		await user().click(await screen.findByTestId('auth-date-confirm'));
		await user().click(within(step).getByTestId('auth-onboarding-submit'));
		await waitFor(() => expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument());
		expect(callsTo('/patient/onboarding/complete')[0].body).toMatchObject({
			firstName: 'Ελένη',
			language: 'el'
		});
	});

	it('R-8 (negative): the owed profile stays over any page: it has no way out but its own', async () => {
		signedIn = true;
		patient = null;
		render(Harness);
		await screen.findByTestId('auth-step-onboarding');
		const navigated = vi.mocked(afterNavigate).mock.calls.at(-1)?.[0] as (
			navigation: unknown
		) => void;
		navigated({
			type: 'link',
			from: { url: new URL('http://localhost/a') },
			to: { url: new URL('http://localhost/b') }
		});
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.getByTestId('auth-dialog')).toHaveAttribute('data-state', 'open');
	});

	it('D-83 (negative): a doctor is never asked', async () => {
		signedIn = true;
		patient = null;
		routes['GET /doctor/profile/base'] = () => ok({ id: 'd' });
		render(Harness);
		await waitFor(() => expect(callsTo('/doctor/profile/base')).toHaveLength(1));
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument();
	});

	it('D-83 (negative): an outage of that answer locks nobody out', async () => {
		signedIn = true;
		patient = null;
		routes['GET /doctor/profile/base'] = () => refuse(503);
		render(Harness);
		await waitFor(() => expect(callsTo('/doctor/profile/base')).toHaveLength(1));
		await new Promise((done) => setTimeout(done, 0));
		expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument();
	});

	it('Π1 · 9: «Λάθος λογαριασμός;» signs out and the surface goes', async () => {
		signedIn = true;
		patient = null;
		render(Harness);
		const step = await screen.findByTestId('auth-step-onboarding');
		await user().click(within(step).getByTestId('auth-onboarding-sign-out'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
		await waitFor(() => expect(screen.queryByTestId('auth-dialog')).not.toBeInTheDocument());
	});
});
