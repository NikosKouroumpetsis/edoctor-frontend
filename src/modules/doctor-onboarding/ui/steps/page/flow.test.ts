import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
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

type Call = { path: string; method: string; body?: unknown };
type Handle = {
	session: Session;
	draft: OnboardingDraft;
	setStatus: (status: SessionStatus) => void;
};
let calls: Call[];
let server: DoctorOnboardingProgress;
let answers: Record<string, (body: unknown) => Response>;

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

/** A sign-up whose first stage is answered up to the specialty (its names, day and sex saved). */
const answeredBasics = () =>
	doctorOnboardingProgressSample({
		missing: ['PROFESSIONAL', 'OFFICE_ADDRESS', 'OFFICE_PHONE'],
		basicInfo: {
			firstName: 'Μαρία',
			lastName: 'Τριανταφύλλου',
			dateOfBirth: '1985-04-12',
			gender: 'FEMALE'
		}
	});

beforeEach(() => {
	calls = [];
	answers = {};
	server = answeredBasics();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const path = new URL(url).pathname.replace(/^\/api\/v\d+/u, '');
			const body = init.body ? JSON.parse(String(init.body)) : undefined;
			calls.push({ path, method, body });
			const answer = answers[`${method} ${path}`];
			if (answer) return answer(body);
			if (path.startsWith('/doctor/onboarding')) return json(server);
			if (path === '/professional/professionals') return json([]);
			return json({});
		})
	);
	page.state = {};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	history.replaceState(null, '');
});

function draw(
	first: DoctorOnboardingScreen,
	{
		start = 'member',
		depth = 0,
		toasts = new ToastState()
	}: { start?: SessionStatus; depth?: number; toasts?: ToastState } = {}
) {
	const handle = {} as Handle;
	const back = vi.spyOn(history, 'back').mockImplementation(() => {});
	const propsOf = (screenName: DoctorOnboardingScreen) => ({
		component: Harness as unknown as Component<never>,
		props: {
			start,
			screen: screenName,
			context,
			toasts,
			onReady: (ready: Handle) => Object.assign(handle, ready)
		}
	});
	page.state = depth ? { onboarding: { depth } } : {};
	const view = render(QueryHarness, { props: propsOf(first) });
	/** The navigation `goto` was asked for: the next page, in the same tab (the root's host stays). */
	const open = async (next: DoctorOnboardingScreen, nextDepth = 0) => {
		page.state = nextDepth ? { onboarding: { depth: nextDepth } } : {};
		// QueryHarness has a prop named `props`: the options' form (as `messages/ui/inbox/page/index.test.ts` does).
		await view.rerender({ props: propsOf(next) } as never);
	};
	return { view, handle, back, toasts, open };
}

const user = () => userEvent.setup({ delay: null });
const next = () => screen.getByTestId('doctor-onboarding-next');
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const writes = () => calls.filter((call) => call.method !== 'GET');
const opened = (path: string, depth: number, replaceState = false) =>
	expect(vi.mocked(goto)).toHaveBeenCalledWith(path, {
		replaceState,
		state: { onboarding: { depth } }
	});
/** The step's content is drawn: its frame is there and the server's progress has come. */
const ready = async () => {
	await screen.findByTestId('doctor-onboarding-next');
	await waitFor(() => expect(screen.queryByTestId('doctor-onboarding-loading')).toBeNull());
};
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

describe('the steps’ frame (record §6.3, D-W3-31, U-81.2)', () => {
	it('«Βήμα 1» (record §6.2.3): «Βήμα 1», the stage’s title, the bar’s first stage of three; «Επόμενο» opens «Τα στοιχεία σας» as one more page', async () => {
		server = doctorOnboardingProgressSample();
		draw('stage-1');
		await waitFor(() => expect(next()).not.toBeDisabled());
		expect(screen.getByText('Βήμα 1')).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { level: 1, name: 'Πείτε μας για εσάς' })
		).toBeInTheDocument();
		expect(screen.getByTestId('doctor-onboarding-stage-1-progress')).toHaveAccessibleName(
			'Στάδιο 1 από 3'
		);
		await user().click(next());
		opened('/doctor/onboarding/basic', 1);
		expect(writes()).toEqual([]);
	});

	it('U-81.2 / U-100 / D-W3-27: the shared steps’ frame — below 744 the application’s (no mark, the pills’ short words), from 744 the mark; «Επόμενο» fully round; no colour under the pointer', async () => {
		draw('basic');
		await ready();
		const frame = screen.getByTestId('doctor-onboarding-basic');
		expect(frame).toHaveAttribute('data-slot', 'wizard-screen');
		expect(frame.querySelector('[data-slot="wizard-screen-brand"]')).toHaveClass(
			'hidden',
			'tablet:flex'
		);
		const help = screen.getByTestId('doctor-onboarding-help');
		expect(help).toHaveAccessibleName('Χρειάζεστε βοήθεια;');
		expect(help).toHaveAttribute('href', '/help');
		expect(help.querySelector('.tablet\\:hidden')).toHaveTextContent('Βοήθεια');
		expect(screen.getByTestId('doctor-onboarding-save-exit')).toHaveAccessibleName(
			'Αποθήκευση και έξοδος'
		);
		expect(next()).toHaveClass('rounded-full');
		noHover(frame);
	});

	it('🔴 D-W3-31: «Πίσω» goes back through the history it came by; a page opened from a link gives its place to the step before', async () => {
		const first = draw('specialty', { depth: 2 });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-back'));
		expect(first.back).toHaveBeenCalledTimes(1);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		first.view.unmount();

		draw('specialty');
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-back'));
		opened('/doctor/onboarding/basic', 0, true);
	});

	it('🔴 review w3-w3 R1 MINOR-5 (U-112.2): after a reload the entry still knows the pages behind it — «Πίσω» goes BACK, never a second entry', async () => {
		history.replaceState({ 'sveltekit:states': { onboarding: { depth: 2 } } }, '');
		const { back } = draw('specialty');
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-back'));
		expect(back).toHaveBeenCalledTimes(1);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('«Αποθήκευση και έξοδος»: a complete step is saved as «Επόμενο» saves it, then the overview, told once', async () => {
		const { toasts } = draw('basic');
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-save-exit'));
		await waitFor(() => opened('/doctor/onboarding', 0));
		expect(writes().map((call) => call.path)).toEqual(['/doctor/onboarding/basic-info']);
		expect(toasts.current).toMatchObject({
			message: 'Αποθηκεύτηκαν. Συνεχίζετε όποτε θέλετε, από οποιαδήποτε συσκευή.',
			lift: 'page-bar'
		});
	});

	it('38–42 (card w3-w5): each step is its own page in the shared frame — its title, the bar of its stage, «Επόμενο» locked until it is answered, nothing written before', async () => {
		server = doctorOnboardingProgressSample({ missing: ['OFFICE_PHONE', 'OFFICE_PAYMENTS'] });
		draw('office');
		await ready();
		expect(
			screen.getByRole('heading', { level: 1, name: 'Πώς θα σας βρουν οι ασθενείς;' })
		).toBeInTheDocument();
		expect(screen.getByTestId('doctor-onboarding-office')).toHaveAttribute(
			'data-slot',
			'wizard-screen'
		);
		expect(screen.getByTestId('doctor-onboarding-office-progress')).toHaveAccessibleName(
			'Στάδιο 2 από 3'
		);
		expect(next()).toBeDisabled();
		expect(writes()).toEqual([]);
	});
});

describe('the guards (P-W3 §3.3.3, D-W3-31, review w3-w3 R1 MAJOR-1)', () => {
	it('🔴 D-W3-31: a guest who opens a step goes to the overview — only once the browser knows; nothing moves while the session is unknown', async () => {
		const { handle } = draw('basic', { start: 'unknown' });
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		handle.setStatus('guest');
		await waitFor(() => opened('/doctor/onboarding', 0, true));
		expect(calls).toEqual([]);
	});

	it('P-W3 §3.3.3: a page beyond what the server holds opens the first missing step in its place; a sign-up not in progress goes to the overview', async () => {
		server = doctorOnboardingProgressSample({ missing: ['BASIC_INFO', 'PROFESSIONAL'] });
		const first = draw('pin');
		await waitFor(() => opened('/doctor/onboarding/basic', 0, true));
		// One move only: the pin's own «no address yet» (review w3-w4 R1 MINOR-3) leaves this to the guard.
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(vi.mocked(goto)).toHaveBeenCalledTimes(1);
		first.view.unmount();
		vi.mocked(goto).mockClear();

		server = doctorOnboardingProgressSample({ state: 'NOT_STARTED', missing: [] });
		draw('basic');
		await waitFor(() => opened('/doctor/onboarding', 0, true));
	});

	it('(negative) a page up to the first missing section’s last one stays: the email’s code, the address’s pin', async () => {
		server = doctorOnboardingProgressSample({ missing: ['OFFICE_ADDRESS', 'OFFICE_PHONE'] });
		draw('address-confirm');
		await ready();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 review w3-w3 R1 MAJOR-1 (U-84): a session that ended under the page keeps the page and every typed word — the sign-in opens over it, and the same person finds them after it', async () => {
		answers['POST /doctor/onboarding/basic-info'] = () => refusal(401, 'expired');
		const { handle } = draw('basic');
		await ready();
		await user().clear(field('Όνομα'));
		await user().type(field('Όνομα'), 'Μαρίνα');
		await user().click(next());
		await waitFor(() => expect(handle.session.flowOpen).toBe(true));
		expect(handle.session.status).toBe('guest');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(handle.draft.edits.basicInfo).toEqual({ firstName: 'Μαρίνα' });

		delete answers['POST /doctor/onboarding/basic-info'];
		handle.setStatus('member');
		handle.session.completeSignIn();
		await waitFor(() => expect(field('Όνομα')).toHaveValue('Μαρίνα'));
		expect(vi.mocked(goto)).not.toHaveBeenCalledWith('/doctor/onboarding', expect.anything());
	});

	it('U-65.6: a sign-out (or another account) here takes the typed words and goes to the overview', async () => {
		const { handle } = draw('basic');
		await ready();
		await user().clear(field('Όνομα'));
		await user().type(field('Όνομα'), 'Μαρίνα');
		await handle.session.signOut();
		await waitFor(() => opened('/doctor/onboarding', 0, true));
		expect(handle.draft.edits).toEqual({});
	});
});

describe('🔴 U-112.2 · τα στοιχεία δεν χάνονται (the root’s draft, the server’s progress)', () => {
	it('🔴 U-112.2: back and forth between the steps keeps every typed value; «Επόμενο» saves to the server; a reload refills from it; nothing in a storage, a cookie or the address', async () => {
		answers['POST /doctor/onboarding/basic-info'] = (body) => {
			const input = body as { firstName: string; lastName: string };
			server = {
				...server,
				basicInfo: { ...server.basicInfo, ...input, dateOfBirth: '1985-04-12' }
			};
			return json(server);
		};
		const first = draw('basic');
		await ready();
		await user().clear(field('Όνομα'));
		await user().type(field('Όνομα'), 'Μαρίνα');

		await first.open('specialty', 1);
		await ready();
		await user().type(screen.getByTestId('doctor-onboarding-license-number'), 'ΑΘ-12345');
		await first.open('basic', 0);
		await ready();
		expect(field('Όνομα')).toHaveValue('Μαρίνα');
		await first.open('specialty', 1);
		await ready();
		expect(screen.getByTestId('doctor-onboarding-license-number')).toHaveValue('ΑΘ-12345');

		// «Επόμενο» on «Τα στοιχεία σας»: the server keeps them; the draft lets that part go.
		await first.open('basic', 0);
		await ready();
		await user().click(next());
		await waitFor(() => expect(first.handle.draft.edits.basicInfo).toBeUndefined());
		expect(writes().map((call) => [call.path, call.body])).toEqual([
			[
				'/doctor/onboarding/basic-info',
				{
					firstName: 'Μαρίνα',
					lastName: 'Τριανταφύλλου',
					gender: 'FEMALE',
					dateOfBirth: '1985-04-12T00:00:00.000Z'
				}
			]
		]);
		expect(first.handle.draft.edits.professional).toEqual({ licenseNumber: 'ΑΘ-12345' });
		expect(localStorage.length + sessionStorage.length).toBe(0);
		// The only cookie of the tab is the page's language (Paraglide), never a word of the sign-up.
		expect(
			document.cookie.split('; ').filter((part) => part && !part.startsWith('PARAGLIDE_LOCALE='))
		).toEqual([]);
		expect(calls.every((call) => !call.path.includes('Μαρίνα'))).toBe(true);
		first.view.unmount();

		// A reload (or another device): a new tree, an empty draft, the server's progress fills the page.
		draw('basic');
		await waitFor(() => expect(field('Όνομα')).toHaveValue('Μαρίνα'));
		expect(field('Επώνυμο')).toHaveValue('Τριανταφύλλου');
	});
});

describe('🔴 U-112.2 · the joint over the whole of 38–42 (card w3-w5)', () => {
	/** A sign-up answered up to «Πρόσβαση» (made-up facts): every page of 38–42 may open. */
	const answeredToTheEnd = () =>
		doctorOnboardingProgressSample({
			missing: ['ACTIVATION_INTENT'],
			basicInfo: {
				firstName: 'Μαρία',
				lastName: 'Τριανταφύλλου',
				dateOfBirth: '1985-04-12',
				gender: 'FEMALE'
			},
			office: {
				streetLine: 'Καραΐσκου 74',
				postalCode: '18532',
				city: 'Πειραιάς',
				latitude: 37.94265,
				longitude: 23.64655,
				placeId: null,
				pinMoved: false,
				phone: '2104123456',
				floor: 2,
				gettingThere: null,
				parking: false,
				parkingKinds: [],
				disabilityAccess: false,
				accessibleToilet: false,
				accessibleParking: false,
				elevator: false,
				nearPublicTransport: false,
				paymentOptions: ['CASH']
			},
			servicePricing: { price: 50, customDurationInMinutes: 30 },
			calendar: { category: 'GOOGLE' },
			liability: {
				liabilityInsurance: true,
				liabilityCompany: null,
				liabilityInsuranceExpiresAt: null
			},
			terms: { accepted: true, version: '1.0' }
		});
	const checked = (testId: string) => screen.getByTestId(testId).getAttribute('aria-checked');

	it('🔴 U-112.2: back and forth over 38–42 keeps every unsaved answer of every page — the root’s draft, never the page; a reload refills from the server; nothing in a storage, a cookie or the address', async () => {
		server = answeredToTheEnd();
		const flow = draw('office', { depth: 4 });
		await ready();
		await user().clear(screen.getByTestId('doctor-onboarding-office-phone'));
		await user().type(screen.getByTestId('doctor-onboarding-office-phone'), '2109999999');
		await user().type(screen.getByTestId('doctor-onboarding-getting-there'), 'Πίσω είσοδος');

		await flow.open('amenities', 5);
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-amenity-nearPublicTransport'));
		await flow.open('payments', 6);
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-payment-IRIS'));
		await flow.open('price', 7);
		await ready();
		await user().clear(screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' }));
		await user().type(screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' }), '80');
		await user().click(screen.getByRole('radio', { name: '20 λεπτά' }));
		await flow.open('calendar', 8);
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-calendar-option-DIRECT'));
		await flow.open('terms', 10);
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-insurance-no'));
		await user().click(screen.getByTestId('doctor-onboarding-terms-accept'));
		await flow.open('access', 11);
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-access-option-wantsAppointments'));
		await user().click(screen.getByRole('switch'));

		// The browser's «back», page by page, to «Πώς θα σας βρουν»: every answer is where it was left.
		await flow.open('terms', 10);
		await ready();
		expect(checked('doctor-onboarding-insurance-no')).toBe('true');
		expect(checked('doctor-onboarding-terms-accept')).toBe('false');
		await flow.open('calendar', 8);
		await ready();
		expect(checked('doctor-onboarding-calendar-option-DIRECT')).toBe('true');
		await flow.open('price', 7);
		await ready();
		expect(screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' })).toHaveValue('80');
		expect(screen.getByRole('radio', { name: '20 λεπτά' })).toHaveAttribute('aria-checked', 'true');
		await flow.open('payments', 6);
		await ready();
		expect(checked('doctor-onboarding-payment-IRIS')).toBe('true');
		expect(checked('doctor-onboarding-payment-CASH')).toBe('true');
		await flow.open('amenities', 5);
		await ready();
		expect(checked('doctor-onboarding-amenity-nearPublicTransport')).toBe('true');
		await flow.open('office', 4);
		await ready();
		expect(screen.getByTestId('doctor-onboarding-office-phone')).toHaveValue('2109999999');
		expect(screen.getByTestId('doctor-onboarding-getting-there')).toHaveValue('Πίσω είσοδος');
		// …and forward again to «Πρόσβαση».
		await flow.open('access', 11);
		await ready();
		expect(checked('doctor-onboarding-access-option-wantsAppointments')).toBe('false');
		expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

		expect(writes()).toEqual([]);
		expect(localStorage.length + sessionStorage.length).toBe(0);
		expect(
			document.cookie.split('; ').filter((part) => part && !part.startsWith('PARAGLIDE_LOCALE='))
		).toEqual([]);
		expect(flow.handle.draft.edits).toMatchObject({
			office: { phone: '2109999999', nearPublicTransport: true, paymentOptions: ['CASH', 'IRIS'] },
			servicePricing: { price: '80', customDurationInMinutes: 20 },
			calendar: { category: 'DIRECT' },
			liability: { liabilityInsurance: false },
			terms: { accepted: false },
			salesContact: { salesContactRequested: false }
		});
		flow.view.unmount();

		// A reload (or another device): a new tree, an empty draft — every page refills from the server's progress.
		const again = draw('price', { depth: 7 });
		await ready();
		expect(screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' })).toHaveValue('50');
		expect(screen.getByRole('radio', { name: '30 λεπτά' })).toHaveAttribute('aria-checked', 'true');
		await again.open('calendar', 8);
		await ready();
		expect(checked('doctor-onboarding-calendar-option-GOOGLE')).toBe('true');
		await again.open('office', 4);
		await ready();
		expect(screen.getByTestId('doctor-onboarding-office-phone')).toHaveValue('2104123456');
		expect(screen.getByRole('spinbutton', { name: 'Όροφος' })).toHaveValue('2ος');
	});

	it('🔴 U-112.2: «Επόμενο» on each of 38–42 writes its part to the server and lets only that part of the draft go', async () => {
		server = answeredToTheEnd();
		const flow = draw('payments', { depth: 6 });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-payment-CARD'));
		await flow.open('price', 7);
		await ready();
		await user().clear(screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' }));
		await user().type(screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' }), '70');
		await user().click(next());
		await waitFor(() => expect(flow.handle.draft.edits.servicePricing).toBeUndefined());
		expect(writes().map((call) => [call.path, call.body])).toEqual([
			['/doctor/onboarding/service-pricing', { price: 70, customDurationInMinutes: 30 }]
		]);
		expect(flow.handle.draft.edits.office).toEqual({ paymentOptions: ['CASH', 'CARD'] });
	});
});

describe('«Βήμα 1/2/3» (record §6.2.3)', () => {
	it('each stage’s page: its glyph, «Βήμα N» and its words; no colour under the pointer', async () => {
		server = doctorOnboardingProgressSample({ missing: ['OFFICE_ADDRESS'] });
		const { open } = draw('stage-2');
		await ready();
		expect(screen.getByText('Βήμα 2')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 1, name: 'Το ιατρείο σας' })).toBeInTheDocument();
		noHover(screen.getByTestId('doctor-onboarding-stage-2'));
		await open('stage-1');
		await ready();
		expect(screen.getByText('Βήμα 1')).toBeInTheDocument();
	});
});
