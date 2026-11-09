import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import type { DoctorOnboardingProgress } from '$modules/doctor-onboarding/api/progress';
import type { DoctorOnboardingScreen } from '$modules/doctor-onboarding/lib/steps';
import { doctorOnboardingProgressSample } from '$modules/doctor-onboarding/lib/onboarding.sample';
import type { OnboardingDraft } from '$modules/doctor-onboarding/ui/draft-host';
import Harness from './onboarding.harness.svelte';
import type { DoctorOnboardingContext } from '../types';

type Call = { path: string; method: string; body?: unknown; credentials?: string };
type Handle = {
	session: Session;
	draft: OnboardingDraft;
	setStatus: (status: SessionStatus) => void;
};
let calls: Call[];
let server: DoctorOnboardingProgress;
let answers: Record<string, () => Response>;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const refusal = (status: number, errorMessage: string, errorCode = 'EC000') =>
	new Response(JSON.stringify({ errorCode, errorMessage }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

const context: DoctorOnboardingContext = {
	locale: 'el',
	href: (path) => path,
	helpHref: '/help',
	homeHref: '/',
	readCodeFailure: () => 'unknown',
	// The sign-in's rule for a number, made simple (W8-Σ1): a page of these specs sends no office phone.
	toPhoneNumber: (typed) => typed.trim() || null,
	showPhoneNumber: (stored) => stored
};

beforeEach(() => {
	calls = [];
	answers = {};
	server = doctorOnboardingProgressSample();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const path = new URL(url).pathname.replace(/^\/api\/v\d+/u, '');
			calls.push({
				path,
				method,
				body: init.body ? JSON.parse(String(init.body)) : undefined,
				credentials: init.credentials
			});
			const answer = answers[`${method} ${path}`];
			if (answer) return answer();
			if (path.startsWith('/doctor/onboarding')) return json(server);
			return json({});
		})
	);
	page.state = {};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function draw(
	start: SessionStatus = 'member',
	prepare?: (handle: Handle) => void,
	screenName: DoctorOnboardingScreen = 'overview'
) {
	const handle = {} as Handle;
	const toasts = new ToastState();
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				start,
				screen: screenName,
				context,
				toasts,
				onReady: (ready: Handle) => {
					Object.assign(handle, ready);
					prepare?.(handle);
				}
			}
		}
	});
	return { handle, toasts };
}

const user = () => userEvent.setup({ delay: null });
const start = () => screen.getByTestId('doctor-onboarding-start');
const writes = () => calls.filter((call) => call.method !== 'GET');
/**
 * U-100 / D-W3-27: nothing of the sign-up's frame and rows takes a colour under the pointer. The site's round controls
 * (the map's «+» / «−», a field's «×») keep their own light fill (U-28.4), as the moved picker keeps its own (D-W3-30).
 */
const noHover = (root: Element) => {
	for (const node of [root, ...root.querySelectorAll('*')]) {
		if (node.closest('[data-slot="map-view"], [data-slot="icon-button"]')) continue;
		expect([...node.classList].filter((name) => name.includes('hover:'))).toEqual([]);
	}
};
const opened = (path: string, depth: number, replaceState = false) =>
	expect(vi.mocked(goto)).toHaveBeenCalledWith(path, {
		replaceState,
		state: { onboarding: { depth } }
	});

describe('33 · Επισκόπηση (record §6.4, U-103.4)', () => {
	it('record §6.4 / U-100: the title, the three stages one under the other with their number and words, «Βοήθεια» as a page of its own; no colour under the pointer anywhere', async () => {
		draw('guest');
		expect(
			screen.getByRole('heading', {
				level: 1,
				name: 'Ξεκινήστε τη συνεργασία σας με το eDoctor, εύκολα και γρήγορα'
			})
		).toBeInTheDocument();
		const stages = within(screen.getByTestId('doctor-onboarding-stages')).getAllByRole('listitem');
		expect(stages.map((stage) => stage.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'1 Πείτε μας για εσάς Τα στοιχεία σας, η ειδικότητα και η άδειά σας.',
			'2 Το ιατρείο σας Πού βρίσκεται, τι θα βρουν οι ασθενείς, πώς πληρώνουν, η τιμή και το ημερολόγιό σας.',
			'3 Τελειώνουμε Ασφάλιση, όροι, και πώς θα επικοινωνήσουμε μαζί σας.'
		]);
		expect(screen.getByTestId('doctor-onboarding-stages')).toHaveClass('flex', 'flex-col');
		expect(screen.getByTestId('doctor-onboarding-help')).toHaveAttribute('href', '/help');
		expect(screen.queryByTestId('doctor-onboarding-save-exit')).toBeNull();
		expect(start()).toHaveClass('rounded-full');
		noHover(screen.getByTestId('doctor-onboarding-overview'));
	});

	it('U-103.4 / U-80.1 Ε4: a guest’s «Ξεκινήστε» opens the sign-in over the page for `doctor`, nothing is read or written; after it the sign-up starts and «Βήμα 1» opens', async () => {
		server = doctorOnboardingProgressSample({ state: 'NOT_STARTED', missing: [] });
		answers['POST /doctor/onboarding/start'] = () => {
			server = doctorOnboardingProgressSample();
			return json(server);
		};
		const { handle } = draw('guest');
		expect(start()).toHaveTextContent('Ξεκινήστε');
		await user().click(start());
		expect(handle.session.flowOpen).toBe(true);
		expect(handle.session.pendingAction).toBe('doctor');
		expect(calls).toEqual([]);

		handle.setStatus('member');
		handle.session.completeSignIn();
		await waitFor(() => opened('/doctor/onboarding/stage/1', 1));
		expect(writes()).toEqual([
			{ path: '/doctor/onboarding/start', method: 'POST', body: {}, credentials: 'include' }
		]);
	});

	it('🔴 D-W3-01: a member’s «Ξεκινήστε» starts the sign-up with ONE write — the server’s new cookies are the browser’s, no refresh is asked', async () => {
		server = doctorOnboardingProgressSample({ state: 'NOT_STARTED', missing: [] });
		answers['POST /doctor/onboarding/start'] = () => json(doctorOnboardingProgressSample());
		draw('member');
		await waitFor(() => expect(start()).not.toBeDisabled());
		expect(start()).toHaveTextContent('Ξεκινήστε');
		await user().click(start());
		await waitFor(() => opened('/doctor/onboarding/stage/1', 1));
		expect(writes().map((call) => call.path)).toEqual(['/doctor/onboarding/start']);
		expect(calls.some((call) => /refresh/u.test(call.path))).toBe(false);
	});

	it('record §6.4: a sign-up in progress says so with the day it would be deleted; «Συνέχεια» opens the first missing step (P-B3 Σ-24), writing nothing', async () => {
		server = doctorOnboardingProgressSample({
			missing: ['PROFESSIONAL', 'OFFICE_ADDRESS'],
			deleteAfter: '2027-02-07T08:00:00.000Z'
		});
		draw('member');
		expect(await screen.findByTestId('doctor-onboarding-resume')).toHaveTextContent(
			'Έχετε μια εγγραφή σε εξέλιξη. Συνεχίζετε από εκεί που μείνατε.'
		);
		expect(screen.getByTestId('doctor-onboarding-deadline')).toHaveTextContent(/2027/u);
		await waitFor(() => expect(start()).not.toBeDisabled());
		expect(start()).toHaveTextContent('Συνέχεια');
		await user().click(start());
		opened('/doctor/onboarding/specialty', 1);
		expect(writes()).toEqual([]);
	});

	it('record §6.4: a finished sign-up and a locked one say so and offer no button', async () => {
		server = doctorOnboardingProgressSample({ state: 'COMPLETED', missing: [] });
		const first = draw('member');
		expect(await screen.findByTestId('doctor-onboarding-notice')).toHaveTextContent(
			'Η εγγραφή σας έχει ολοκληρωθεί.'
		);
		expect(screen.queryByTestId('doctor-onboarding-start')).toBeNull();
		expect(first.handle.session.status).toBe('member');
		cleanup();

		server = doctorOnboardingProgressSample({ state: 'LOCKED', missing: [] });
		draw('member');
		expect(await screen.findByTestId('doctor-onboarding-notice')).toHaveTextContent(
			/έμειναν ημιτελείς τρεις φορές/u
		);
		expect(screen.queryByTestId('doctor-onboarding-start')).toBeNull();
	});

	it('U-80.1 Ε4: «Ξεκινήστε» that went through `/login` or a provider’s redirect comes back here and goes on, once', async () => {
		server = doctorOnboardingProgressSample({ state: 'NOT_STARTED', missing: [] });
		answers['POST /doctor/onboarding/start'] = () => json(doctorOnboardingProgressSample());
		const { handle } = draw('member', (ready) => ready.session.resume('doctor'));
		await waitFor(() => opened('/doctor/onboarding/stage/1', 1));
		expect(writes()).toHaveLength(1);
		expect(handle.session.resumedAction).toBeNull();
	});

	it('🔴 D-W3-37 (security web MAJOR-1, negative): a member who arrives with nothing the tab wrote — a link, `/login?do=doctor` — writes NOTHING; only the press of «Ξεκινήστε» starts', async () => {
		server = doctorOnboardingProgressSample({ state: 'NOT_STARTED', missing: [] });
		answers['POST /doctor/onboarding/start'] = () => json(doctorOnboardingProgressSample());
		const { handle } = draw('member');
		const start = await screen.findByTestId('doctor-onboarding-start');
		await waitFor(() => expect(start).toBeEnabled());
		await new Promise((settle) => setTimeout(settle, 50));
		expect(writes()).toEqual([]);
		expect(handle.session.resumedAction).toBeNull();
		await user().click(start);
		await waitFor(() => opened('/doctor/onboarding/stage/1', 1));
		expect(writes()).toHaveLength(1);
	});

	it('W8 Delta 2 (NIT-1, negative): «Ξεκινήστε» on a sign-up locked meanwhile (its `403`, an old progress in memory) says the lock ONCE — the overview’s own notice, never the frame’s words over it', async () => {
		server = doctorOnboardingProgressSample({ state: 'NOT_STARTED', missing: [] });
		answers['POST /doctor/onboarding/start'] = () => {
			server = doctorOnboardingProgressSample({ state: 'LOCKED', missing: [] });
			return refusal(
				403,
				'Forbidden: Doctor registration is locked after repeated incomplete onboarding. Contact support.',
				'EC403'
			);
		};
		draw('member');
		await waitFor(() => expect(start()).not.toBeDisabled());
		await user().click(start());
		expect(await screen.findByTestId('doctor-onboarding-notice')).toHaveTextContent(
			/έμειναν ημιτελείς τρεις φορές/u
		);
		expect(screen.getAllByText(/έμειναν ημιτελείς τρεις φορές/u)).toHaveLength(1);
		expect(screen.queryByTestId('doctor-onboarding-start-error')).toBeNull();
		expect(screen.queryByText(/σύνδεσή σας/u)).toBeNull();
	});

	it('(negative) a read that fails says so with «Δοκιμάστε ξανά»; a refused start keeps the page and says so', async () => {
		answers['GET /doctor/onboarding'] = () => refusal(503, 'down');
		draw('member');
		// One retry of the read (the progress query's own), then the notice.
		expect(
			await screen.findByTestId('doctor-onboarding-load-error', {}, { timeout: 4000 })
		).toHaveTextContent('Δεν μπορέσαμε να φορτώσουμε την εγγραφή σας.');
		cleanup();

		delete answers['GET /doctor/onboarding'];
		server = doctorOnboardingProgressSample({ state: 'NOT_STARTED', missing: [] });
		answers['POST /doctor/onboarding/start'] = () => refusal(500, 'boom');
		draw('member');
		await waitFor(() => expect(start()).not.toBeDisabled());
		await user().click(start());
		expect(await screen.findByTestId('doctor-onboarding-start-error')).toHaveTextContent(
			'Δεν μπορέσαμε να αποθηκεύσουμε αυτό το βήμα.'
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});
});
