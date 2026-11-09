import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import { ApiError } from '$shared/lib/http';
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
// D-W3-39: the language each request names in its address (kept apart, so the calls above stay as they were).
let langs: { path: string; lang: string | null }[];
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

/** The sign-in's reading of a refused code, made simple: a `400` is a wrong code. */
const context: DoctorOnboardingContext = {
	locale: 'el',
	href: (path) => path,
	helpHref: '/help',
	homeHref: '/',
	readCodeFailure: (error) =>
		error instanceof ApiError && error.status === 400 ? 'invalid-code' : 'unknown',
	// The sign-in's rule for a number, made simple (W8-Σ1): a page of these specs sends no office phone.
	toPhoneNumber: (typed) => typed.trim() || null,
	showPhoneNumber: (stored) => stored
};

/** The specialties' catalogue (made-up ids, the server's names). */
const PROFESSIONS = [
	{ id: 'p-card', key: 'cardiology', translations: [{ language: 'el', name: 'Καρδιολόγος' }] },
	{
		id: 'p-paed',
		key: 'paed-cardiology',
		translations: [{ language: 'el', name: 'Παιδοκαρδιολόγος' }]
	},
	{
		id: 'p-surg',
		key: 'cardiac-surgery',
		translations: [{ language: 'el', name: 'Καρδιοχειρουργός' }]
	},
	{ id: 'p-path', key: 'pathology', translations: [{ language: 'el', name: 'Παθολόγος' }] },
	{
		id: 'p-evil',
		key: 'x',
		translations: [{ language: 'el', name: '<img src=x onerror=alert(1)>' }]
	}
];

beforeEach(() => {
	calls = [];
	langs = [];
	answers = {};
	server = doctorOnboardingProgressSample();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const path = new URL(url).pathname.replace(/^\/api\/v\d+/u, '');
			const body = init.body ? JSON.parse(String(init.body)) : undefined;
			calls.push({ path, method, body });
			langs.push({ path, lang: new URL(url).searchParams.get('lang') });
			const answer = answers[`${method} ${path}`];
			if (answer) return answer(body);
			if (path === '/professional/professionals') return json(PROFESSIONS);
			if (path.endsWith('/verification-code')) return json({ success: true });
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
	first: DoctorOnboardingScreen,
	{
		depth = 0,
		prepare,
		locale = context.locale
	}: {
		depth?: number;
		prepare?: (handle: Handle) => void;
		locale?: DoctorOnboardingContext['locale'];
	} = {}
) {
	const handle = {} as Handle;
	const back = vi.spyOn(history, 'back').mockImplementation(() => {});
	const propsOf = (screenName: DoctorOnboardingScreen) => ({
		component: Harness as unknown as Component<never>,
		props: {
			start: 'member',
			screen: screenName,
			context: { ...context, locale },
			toasts: new ToastState(),
			onReady: (ready: Handle) => {
				Object.assign(handle, ready);
				prepare?.(handle);
			}
		}
	});
	page.state = depth ? { onboarding: { depth } } : {};
	const view = render(QueryHarness, { props: propsOf(first) });
	const open = async (next: DoctorOnboardingScreen, nextDepth = 0) => {
		page.state = nextDepth ? { onboarding: { depth: nextDepth } } : {};
		// QueryHarness has a prop named `props`: the options' form (as `messages/ui/inbox/page/index.test.ts` does).
		await view.rerender({ props: propsOf(next) } as never);
	};
	return { view, handle, back, open };
}

const user = () => userEvent.setup({ delay: null });
const next = () => screen.getByTestId('doctor-onboarding-next');
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const writes = () => calls.filter((call) => call.method !== 'GET');
/** The step's content is drawn: its frame is there and the server's progress has come. */
const ready = async () => {
	await screen.findByTestId('doctor-onboarding-next');
	await waitFor(() => expect(screen.queryByTestId('doctor-onboarding-loading')).toBeNull());
};
const opened = (path: string, depth: number, replaceState = false) =>
	expect(vi.mocked(goto)).toHaveBeenCalledWith(path, {
		replaceState,
		state: { onboarding: { depth } }
	});
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
/** U-129.1: the ONE date field (`type="date"`) by its label, a whole day typed as the browser takes it. */
async function typeDate(label: string, iso: string) {
	const u = user();
	await u.clear(field(label));
	await u.type(field(label), iso);
}

/** What a browser does with a day left half or impossible in that field: no value, and `validity.badInput`. */
function leaveHalf(label: string) {
	const input = field(label);
	Object.defineProperty(input, 'validity', { configurable: true, get: () => ({ badInput: true }) });
	input.value = '';
	input.dispatchEvent(new Event('input', { bubbles: true }));
	Reflect.deleteProperty(input, 'validity');
}

const BIRTH = 'Ημερομηνία γέννησης';
const LICENSE = 'Ημερομηνία άδειας (προαιρετικό)';

describe('34 · «Τα στοιχεία σας» (record §6.4, §6.2.1)', () => {
	it('U-110.2 / U-112.1 / U-100: the names as the account has them, the sex as two cards one under the other, none taking a colour under the pointer', async () => {
		draw('basic');
		await ready();
		expect(field('Όνομα')).toHaveValue('Μαρία');
		expect(field('Επώνυμο')).toHaveValue('Τριανταφύλλου');
		const sex = screen.getByRole('radiogroup', { name: 'Φύλο' });
		expect(sex).toHaveClass('flex', 'flex-col');
		expect(sex.className).not.toMatch(/grid-cols|flex-row/u);
		expect(
			within(sex)
				.getAllByRole('radio')
				.map((card) => card.textContent?.trim())
		).toEqual(['Γυναίκα', 'Άνδρας']);
		expect(next()).toBeDisabled();
		noHover(screen.getByTestId('doctor-onboarding-basic'));
	});

	it('record §6.4: at least 18 — a younger day says «Πρέπει να είστε τουλάχιστον 18 ετών.» and keeps «Επόμενο» locked; 18 or more unlocks it and the step is written as the server takes it', async () => {
		const youngYear = String(new Date().getFullYear() - 17);
		draw('basic');
		await ready();
		await user().click(screen.getByRole('radio', { name: 'Γυναίκα' }));
		await typeDate(BIRTH, `${youngYear}-01-01`);
		expect(await screen.findByText('Πρέπει να είστε τουλάχιστον 18 ετών.')).toBeInTheDocument();
		expect(next()).toBeDisabled();

		await typeDate(BIRTH, '1985-01-01');
		await waitFor(() => expect(next()).not.toBeDisabled());
		await user().clear(field('Όνομα'));
		await user().type(field('Όνομα'), '  Μαρία ');
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/specialty', 1));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/basic-info',
				method: 'POST',
				body: {
					firstName: 'Μαρία',
					lastName: 'Τριανταφύλλου',
					gender: 'FEMALE',
					dateOfBirth: '1985-01-01T00:00:00.000Z'
				}
			}
		]);
	});

	it('U-65.6 (negative): each name stops at 100 and shows back as text; blanks lock «Επόμενο»; the server’s age refusal says so and keeps every word', async () => {
		answers['POST /doctor/onboarding/basic-info'] = () =>
			refusal(422, 'DOCTOR_ONBOARDING_INCOMPLETE: DOCTOR_UNDER_MINIMUM_AGE');
		const { handle } = draw('basic', {
			prepare: (ready) =>
				ready.draft.update('basicInfo', { dateOfBirth: '1985-04-12', gender: 'MALE' })
		});
		await ready();
		expect(field('Όνομα')).toHaveAttribute('maxlength', '100');
		expect(field('Επώνυμο')).toHaveAttribute('maxlength', '100');
		await user().clear(field('Όνομα'));
		await user().type(field('Όνομα'), '   ');
		expect(next()).toBeDisabled();
		await user().clear(field('Όνομα'));
		await user().type(field('Όνομα'), '<img src=x onerror=alert(1)>');
		expect(document.querySelector('img')).toBeNull();
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-save-error')).toHaveTextContent(
			'Πρέπει να είστε τουλάχιστον 18 ετών.'
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(handle.draft.edits.basicInfo).toMatchObject({
			firstName: '<img src=x onerror=alert(1)>',
			gender: 'MALE'
		});
	});
});

describe('34 · the contact email (record §6.4: only when the account has none)', () => {
	const withoutEmail = () =>
		doctorOnboardingProgressSample({
			missing: ['CONTACT_EMAIL', 'PROFESSIONAL'],
			basicInfo: {
				firstName: 'Μαρία',
				lastName: 'Τριανταφύλλου',
				dateOfBirth: '1985-04-12',
				gender: 'FEMALE'
			},
			contactEmail: { notificationEmail: null, verified: false }
		});

	it('«Συνέχεια» writes the address, sends the code to it and opens the code’s screen as one more page', async () => {
		server = withoutEmail();
		draw('email');
		await ready();
		expect(next()).toHaveTextContent('Συνέχεια');
		expect(next()).toBeDisabled();
		await user().type(screen.getByTestId('doctor-onboarding-email-field'), ' dr@example.test ');
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/email/code', 1));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/notification-email',
				method: 'PUT',
				body: { notificationEmail: 'dr@example.test' }
			},
			{ path: '/doctor/onboarding/notification-email/verification-code', method: 'POST', body: {} }
		]);
	});

	it('U-65.6 (negative): at most 254; an address that is none says so on leaving and stays locked; a code that could not leave says so and keeps the address', async () => {
		server = withoutEmail();
		answers['POST /doctor/onboarding/notification-email/verification-code'] = () =>
			refusal(500, 'DOCTOR_NOTIFICATION_EMAIL_SEND_FAILED');
		draw('email');
		await ready();
		const input = screen.getByTestId('doctor-onboarding-email-field');
		expect(input).toHaveAttribute('maxlength', '254');
		await user().type(input, 'not-an-email');
		await user().tab();
		expect(screen.getByText('Συμπληρώστε έγκυρο email.')).toBeInTheDocument();
		expect(next()).toBeDisabled();
		await user().clear(input);
		await user().type(input, 'dr@example.test');
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-email-error')).toHaveTextContent(
			'Δεν μπορέσαμε να στείλουμε τον κωδικό. Δοκιμάστε ξανά.'
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('the code: «Στείλαμε έναν κωδικό 6 ψηφίων στο …», «Επιβεβαίωση» locked until the 6 digits, then the address and the code are verified and the specialty opens', async () => {
		server = {
			...withoutEmail(),
			contactEmail: { notificationEmail: 'dr@example.test', verified: false }
		};
		answers['POST /doctor/onboarding/notification-email/verify'] = () =>
			json({ ...server, missing: ['PROFESSIONAL'] });
		draw('email-code', { depth: 1 });
		await ready();
		expect(
			screen.getByText('Στείλαμε έναν κωδικό 6 ψηφίων στο dr@example.test.')
		).toBeInTheDocument();
		expect(next()).toHaveTextContent('Επιβεβαίωση');
		expect(next()).toBeDisabled();
		await user().type(screen.getByTestId('doctor-onboarding-code-input'), '123456');
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/specialty', 2));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/notification-email/verify',
				method: 'POST',
				body: { notificationEmail: 'dr@example.test', code: '123456' }
			}
		]);
	});

	it('(negative) a wrong code empties the boxes and says so in the sign-in’s words; «Αποστολή νέου κωδικού» waits the 60″ after the first code, asking nothing', async () => {
		server = {
			...withoutEmail(),
			contactEmail: { notificationEmail: 'dr@example.test', verified: false }
		};
		answers['POST /doctor/onboarding/notification-email/verify'] = () => refusal(400, 'wrong');
		draw('email-code', { depth: 1 });
		await ready();
		await user().type(screen.getByTestId('doctor-onboarding-code-input'), '000000');
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-code-error')).toHaveTextContent(
			'Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.'
		);
		expect(screen.getByTestId('doctor-onboarding-code-input')).toHaveValue('');
		await user().click(screen.getByTestId('doctor-onboarding-code-resend'));
		expect(screen.getByTestId('doctor-onboarding-code-feedback')).toHaveTextContent(
			/^Περιμένετε (59|60)δ πριν ζητήσετε νέο κωδικό\.$/u
		);
		expect(calls.some((call) => call.path.endsWith('/verification-code'))).toBe(false);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('a code’s screen with no address behind it (a link, a reload) gives its place to the address’s, once the server says so', async () => {
		server = withoutEmail();
		draw('email-code');
		await waitFor(() => opened('/doctor/onboarding/email', 0, true));
	});

	it('🔴 D-W3-39 (review w3-w6 R2 NIT-3): the code goes out in the PAGE’s language — «Συνέχεια» (34) and «Αποστολή νέου» (34b) name `?lang=` from the context', async () => {
		const codesSent = () =>
			langs.filter((call) => call.path.endsWith('/notification-email/verification-code'));
		server = withoutEmail();
		const english = draw('email', { locale: 'en' });
		await ready();
		await user().type(screen.getByTestId('doctor-onboarding-email-field'), 'dr@example.test');
		await user().click(next());
		await waitFor(() => expect(codesSent()).toHaveLength(1));
		expect(codesSent()[0].lang).toBe('en');
		english.view.unmount();

		// A reload on the code's screen: no code has just left, so «Αποστολή νέου» sends one at once.
		server = {
			...withoutEmail(),
			contactEmail: { notificationEmail: 'dr@example.test', verified: false }
		};
		const greek = draw('email-code');
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-code-resend'));
		await waitFor(() => expect(codesSent()).toHaveLength(2));
		greek.view.unmount();
		draw('email-code', { locale: 'en' });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-code-resend'));
		await waitFor(() => expect(codesSent()).toHaveLength(3));
		expect(codesSent().map((call) => call.lang)).toEqual(['en', 'el', 'en']);
	});
});

describe('W-4 · w3-b3’s codes ⇒ the approved texts (W8-Σ1: never «check your connection» for a 4xx)', () => {
	const RATE = 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.';
	const CODE_WAIT = 'Περιμένετε λίγο πριν ζητήσετε νέο κωδικό.';

	it('W8-Σ1: a `429` on a step’s «Επόμενο» says «Πολλές προσπάθειες…», never «check your connection» nor the code’s «…πριν ζητήσετε νέο κωδικό» (a step has no code)', async () => {
		answers['POST /doctor/onboarding/basic-info'] = () =>
			refusal(429, 'Too many requests', 'EC429');
		draw('basic', {
			prepare: (ready) =>
				ready.draft.update('basicInfo', { dateOfBirth: '1985-04-12', gender: 'FEMALE' })
		});
		await ready();
		await waitFor(() => expect(next()).not.toBeDisabled());
		await user().click(next());
		const error = await screen.findByTestId('doctor-onboarding-save-error');
		expect(error).toHaveTextContent(RATE);
		expect(error).not.toHaveTextContent('σύνδεσή');
		expect(error).not.toHaveTextContent('κωδικό');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('the email’s own `429`s: the address’s write says «Πολλές προσπάθειες…» (W8-Σ1); the CODE that could not leave yet says the code’s', async () => {
		const withoutEmail = () =>
			doctorOnboardingProgressSample({
				missing: ['CONTACT_EMAIL', 'PROFESSIONAL'],
				contactEmail: { notificationEmail: null, verified: false }
			});
		server = withoutEmail();
		answers['PUT /doctor/onboarding/notification-email'] = () =>
			refusal(429, 'Too many requests', 'EC429');
		const first = draw('email');
		await ready();
		await user().type(screen.getByTestId('doctor-onboarding-email-field'), 'dr@example.test');
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-save-error')).toHaveTextContent(RATE);
		expect(screen.queryByText(CODE_WAIT)).toBeNull();
		first.view.unmount();

		server = withoutEmail();
		delete answers['PUT /doctor/onboarding/notification-email'];
		answers['POST /doctor/onboarding/notification-email/verification-code'] = () =>
			refusal(429, 'Too many requests', 'EC429');
		draw('email');
		await ready();
		await user().type(screen.getByTestId('doctor-onboarding-email-field'), 'dr@example.test');
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-email-error')).toHaveTextContent(CODE_WAIT);
		expect(screen.queryByTestId('doctor-onboarding-save-error')).toBeNull();
	});
});

describe('35 · «Η ειδικότητά σας» (record §6.2.4, U-102, U-108.3)', () => {
	beforeEach(() => {
		server = doctorOnboardingProgressSample({ missing: ['PROFESSIONAL', 'OFFICE_ADDRESS'] });
	});

	it('🔴 U-102: the field opens the list as a page of its own (a link, no window); the license is optional', async () => {
		draw('specialty');
		await ready();
		const opener = screen.getByTestId('doctor-onboarding-specialty-field');
		expect(opener.tagName).toBe('A');
		expect(opener).toHaveAttribute('href', '/doctor/onboarding/specialty/list');
		expect(opener).toHaveTextContent('Επιλέξτε την ειδικότητά σας');
		await user().click(opener);
		opened('/doctor/onboarding/specialty/list', 1);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(
			screen.getByText('Αν η ειδικότητά σας δεν έχει άδεια, αφήστε τα κενά.')
		).toBeInTheDocument();
		expect(next()).toBeDisabled();
	});

	it('🔴 U-102 (record §6.2.4): «καρδ» shows the three cardiologies; a row chosen goes back to the step, which shows it; «Επόμενο» writes the specialty, then the license', async () => {
		const { open, back, handle } = draw('specialty-list', { depth: 1 });
		const search = await screen.findByTestId('doctor-onboarding-specialty-search');
		expect(
			screen.getByRole('heading', { level: 1, name: 'Επιλέξτε ειδικότητα' })
		).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.queryByTestId('doctor-onboarding-next')).toBeNull();
		await screen.findByTestId('doctor-onboarding-specialty-rows');
		await user().type(search, 'καρδ');
		const rows = within(screen.getByTestId('doctor-onboarding-specialty-rows')).getAllByRole(
			'button'
		);
		expect(rows.map((row) => row.textContent?.trim())).toEqual([
			'Καρδιολόγος',
			'Παιδοκαρδιολόγος',
			'Καρδιοχειρουργός'
		]);
		noHover(screen.getByTestId('doctor-onboarding-specialty-list'));
		await user().click(screen.getByTestId('doctor-onboarding-specialty-p-paed'));
		expect(handle.draft.edits.professional).toEqual({ professionalId: 'p-paed' });
		expect(back).toHaveBeenCalledTimes(1);

		await open('specialty', 0);
		await ready();
		expect(screen.getByTestId('doctor-onboarding-specialty-field')).toHaveTextContent(
			'Παιδοκαρδιολόγος'
		);
		await user().type(screen.getByTestId('doctor-onboarding-license-number'), ' ΑΘ-12345 ');
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/stage/2', 1));
		expect(writes().map((call) => [call.path, call.body])).toEqual([
			['/doctor/onboarding/professional', { professionalId: 'p-paed' }],
			['/doctor/onboarding/license', { licenseNumber: 'ΑΘ-12345', licenseObtainedDate: null }]
		]);
	});

	it('U-65.6 (negative): the license number stops at 50, the search at 60; a name of the catalogue stays text; none found says so; «←» is a link back to the step', async () => {
		draw('specialty-list');
		const search = await screen.findByTestId('doctor-onboarding-specialty-search');
		expect(search).toHaveAttribute('maxlength', '60');
		await screen.findByTestId('doctor-onboarding-specialty-rows');
		expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
		await user().type(search, 'ωωω');
		expect(screen.getByTestId('doctor-onboarding-specialty-none')).toHaveTextContent(
			'Δεν βρέθηκε ειδικότητα. Δοκιμάστε άλλη λέξη.'
		);
		expect(screen.getByTestId('doctor-onboarding-sub-back')).toHaveAttribute(
			'href',
			'/doctor/onboarding/specialty'
		);
		await user().click(screen.getByTestId('doctor-onboarding-sub-back'));
		opened('/doctor/onboarding/specialty', 0, true);
	});

	it('(negative) the license number shows its limit; a blank one is sent as none', async () => {
		server = doctorOnboardingProgressSample({
			missing: ['PROFESSIONAL'],
			professional: { professionalId: 'p-card', licenseNumber: 'ΑΘ-1', licenseObtainedDate: null }
		});
		draw('specialty');
		await ready();
		const license = screen.getByTestId('doctor-onboarding-license-number');
		expect(license).toHaveAttribute('maxlength', '50');
		await user().clear(license);
		await waitFor(() => expect(next()).not.toBeDisabled());
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(2));
		expect(writes()[1].body).toEqual({ licenseNumber: null, licenseObtainedDate: null });
	});
	it('🔴 review w3-w4 R1 MINOR-1 (U-65.6, negative): a license day typed half, wrong or ahead never clears the saved one — «Επόμενο» says «Δώστε μια έγκυρη ημερομηνία» and writes nothing', async () => {
		server = doctorOnboardingProgressSample({
			missing: ['PROFESSIONAL'],
			professional: {
				professionalId: 'p-card',
				licenseNumber: 'ΑΘ-1',
				licenseObtainedDate: '2010-05-12T00:00:00.000Z'
			}
		});
		draw('specialty');
		await ready();
		await waitFor(() => expect(field(LICENSE)).toHaveValue('2010-05-12'));
		// U-129.1: one date field — a day left half or impossible (31/02, «201») is the browser's `badInput`.
		for (const ahead of [null, null, `${new Date().getFullYear() + 1}-05-12`]) {
			if (ahead) await typeDate(LICENSE, ahead);
			else leaveHalf(LICENSE);
			await user().click(next());
			expect(await screen.findByText('Δώστε μια έγκυρη ημερομηνία')).toBeInTheDocument();
			expect(writes()).toEqual([]);
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
		}
		// A real day writes it; a field left empty is «no date» (the server clears it), as before.
		await typeDate(LICENSE, '2011-06-01');
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(2));
		expect(writes()[1].body).toEqual({
			licenseNumber: 'ΑΘ-1',
			licenseObtainedDate: '2011-06-01T00:00:00.000Z'
		});
	});
});
