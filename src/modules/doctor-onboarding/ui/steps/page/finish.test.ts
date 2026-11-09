import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	showPhoneNumber,
	toPhoneNumber
} from '$screens/doctor/onboarding/[...step]/hooks/use-screen.svelte';
import type { DoctorOnboardingProgress } from '$modules/doctor-onboarding/api/progress';
import type { DoctorOnboardingScreen } from '$modules/doctor-onboarding/lib/steps';
import { doctorOnboardingProgressSample } from '$modules/doctor-onboarding/lib/onboarding.sample';
import type { OnboardingDraft } from '$modules/doctor-onboarding/ui/draft-host';
import Harness from './onboarding.harness.svelte';
import type { DoctorOnboardingContext } from '../types';

type Call = { path: string; method: string; body?: unknown; search: string };
type Handle = {
	session: Session;
	draft: OnboardingDraft;
	setStatus: (status: SessionStatus) => void;
};
let calls: Call[];
let server: DoctorOnboardingProgress;
let answers: Record<string, (body: unknown) => Response | Promise<Response>>;
let termsVersion: string;
// Review w3-w5 R1 MINOR-1: writes answered after a macrotask, as a real network does — TanStack's notifications wait for
// a timer too, so a write's `isPending` is still `true` when its `await` returns (the bug the `writing` gate fixed). The
// reads stay quick: 41's version, read between its two writes, must not give that timer the time to run.
let slow: boolean;

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
	// 🔴 W8 Delta 1 / Delta 3: the screen's own rules for a number, not a copy (`use-screen.svelte.ts`).
	toPhoneNumber,
	showPhoneNumber
};

/** A sign-up answered up to `missing` (made-up facts): the office whole, its phone and a way to pay saved. */
const answeredUpTo = (missing: DoctorOnboardingProgress['missing']) =>
	doctorOnboardingProgressSample({
		missing,
		basicInfo: {
			firstName: 'Μαρία',
			lastName: 'Τριανταφύλλου',
			dateOfBirth: '1985-04-12',
			gender: 'FEMALE'
		},
		professional: { professionalId: 'p-card', licenseNumber: null, licenseObtainedDate: null },
		office: {
			streetLine: 'Καραΐσκου 74',
			postalCode: '18532',
			city: 'Πειραιάς',
			latitude: 37.94265,
			longitude: 23.64655,
			placeId: null,
			pinMoved: false,
			phone: '2104123456',
			floor: 3,
			gettingThere: null,
			parking: false,
			parkingKinds: [],
			disabilityAccess: false,
			accessibleToilet: false,
			accessibleParking: false,
			elevator: false,
			nearPublicTransport: false,
			paymentOptions: ['CASH']
		}
	});

beforeEach(() => {
	calls = [];
	answers = {};
	termsVersion = '2026-11';
	slow = false;
	server = answeredUpTo(['SERVICE_PRICING', 'CALENDAR', 'LIABILITY', 'TERMS', 'ACTIVATION_INTENT']);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			if (slow && method !== 'GET') await new Promise((after) => setTimeout(after, 5));
			const parsed = new URL(url);
			const path = parsed.pathname.replace(/^\/api\/v\d+/u, '');
			const body = init.body ? JSON.parse(String(init.body)) : undefined;
			calls.push({ path, method, body, search: parsed.search });
			const answer = answers[`${method} ${path}`];
			if (answer) return answer(body);
			if (path === '/content/public/pages/doctor-marketplace-terms') {
				return json({ slug: 'doctor-marketplace-terms', version: termsVersion });
			}
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
	{ depth = 0, prepare }: { depth?: number; prepare?: (handle: Handle) => void } = {}
) {
	const handle = {} as Handle;
	const propsOf = (screenName: DoctorOnboardingScreen) => ({
		component: Harness as unknown as Component<never>,
		props: {
			start: 'member',
			screen: screenName,
			context,
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
	return { view, handle, open };
}

const user = () => userEvent.setup({ delay: null });
const next = () => screen.getByTestId('doctor-onboarding-next');
const writes = () => calls.filter((call) => call.method !== 'GET');
const termsReads = () =>
	calls.filter((call) => call.path === '/content/public/pages/doctor-marketplace-terms');
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
 * U-100 / D-W3-27: nothing of the sign-up's pages takes a colour under the pointer. The terms' link, a word of its
 * sentence, keeps the kit's thicker line (U-28.4) — a line, not a colour.
 */
const noHover = (root: Element) => {
	for (const node of [root, ...root.querySelectorAll('*')]) {
		if (node.matches('[data-slot="inline-link-text-link"]')) continue;
		expect([...node.classList].filter((name) => name.includes('hover:'))).toEqual([]);
	}
};

describe('39 · «Πόσο κοστίζει η απλή επίσκεψη;» (record §6.4)', () => {
	it('the big «€ 0», 30 minutes first; digits only, 1 to 9999; «Επόμενο» writes `service-pricing` and opens the calendar', async () => {
		const { handle } = draw('price', { depth: 7 });
		await ready();
		const price = screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' });
		expect(price).toHaveAttribute('placeholder', '0');
		expect(price).toHaveAttribute('inputmode', 'numeric');
		expect(price).toHaveAttribute('maxlength', '4');
		const lengths = screen.getByRole('radiogroup', { name: 'Διάρκεια επίσκεψης' });
		expect(
			within(lengths)
				.getAllByRole('radio')
				.map((pill) => pill.textContent?.trim())
		).toEqual(['15 λεπτά', '20 λεπτά', '30 λεπτά', '45 λεπτά', '60 λεπτά']);
		expect(within(lengths).getByRole('radio', { name: '30 λεπτά' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(next()).toBeDisabled();
		await user().type(price, '0');
		expect(next()).toBeDisabled();
		await user().clear(price);
		await user().type(price, '60');
		await user().click(within(lengths).getByRole('radio', { name: '45 λεπτά' }));
		await waitFor(() => expect(next()).not.toBeDisabled());
		noHover(screen.getByTestId('doctor-onboarding-price'));
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/calendar', 8));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/service-pricing',
				method: 'POST',
				body: { price: 60, customDurationInMinutes: 45 },
				search: ''
			}
		]);
		expect(handle.draft.edits.servicePricing).toBeUndefined();
	});

	it('U-65.6 (negative): a sign, a decimal, a letter or a script leaves no mark in the field; at most four digits', async () => {
		const { handle } = draw('price');
		await ready();
		const price = screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' }) as HTMLInputElement;
		await user().type(price, '-1a2.5<b>');
		expect(price.value).toBe('125');
		expect(handle.draft.edits.servicePricing).toEqual({ price: '125' });
		await user().type(price, '999');
		expect(price.value).toHaveLength(4);
		expect(document.querySelector('b')).toBeNull();
	});
});

describe('40 · «Ποιο ημερολόγιο χρησιμοποιείτε περισσότερο;» (record §6.4, §6.8)', () => {
	beforeEach(() => {
		server = answeredUpTo(['CALENDAR', 'LIABILITY', 'TERMS', 'ACTIVATION_INTENT']);
	});

	it('🔴 U-111.1: Google Calendar with Google’s own colours, Outlook in one colour; four cards one under the other, no Apple; U-100', async () => {
		draw('calendar');
		await ready();
		const group = screen.getByRole('radiogroup', { name: 'Ημερολόγιο' });
		expect(group).toHaveClass('flex', 'flex-col');
		const cards = within(group).getAllByRole('radio');
		expect(cards.map((card) => card.querySelector('.font-semibold')?.textContent)).toEqual([
			'Google Calendar',
			'Microsoft Outlook',
			'Το ημερολόγιο του eDoctor',
			'Κανένα προς το παρόν'
		]);
		expect(group.textContent).not.toMatch(/apple/iu);
		const google = cards[0].querySelector('[data-slot="brand-google-calendar"]') as SVGElement;
		const fills = [...google.querySelectorAll('[fill]')].map((shape) => shape.getAttribute('fill'));
		expect(fills).toEqual(expect.arrayContaining(['#4285F4', '#34A853', '#EA4335', '#1A73E8']));
		expect(fills).not.toContain('currentColor');
		const outlook = cards[1].querySelector('[data-slot="brand-microsoft-outlook"]');
		expect(outlook).toHaveAttribute('fill', 'currentColor');
		expect(next()).toBeDisabled();
		noHover(screen.getByTestId('doctor-onboarding-calendar'));
	});

	it('the one chosen goes as `calendar`; «Επόμενο» opens «Βήμα 3»', async () => {
		draw('calendar', { depth: 8 });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-calendar-option-DIRECT'));
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/stage/3', 9));
		expect(writes().map((call) => [call.path, call.body])).toEqual([
			['/doctor/onboarding/calendar', { calendarCategory: 'DIRECT' }]
		]);
	});
});

describe('41 · «Ασφάλιση και όροι» (record §6.4, 🔴 Ε2, D-W3-01, U-102)', () => {
	beforeEach(() => {
		server = answeredUpTo(['LIABILITY', 'TERMS', 'ACTIVATION_INTENT']);
	});

	it('🔴 Ε2 / U-102: «Ναι» / «Όχι» one under the other; the doctors’ terms by a link to their own page (no window); «Επόμενο» locked until an answer AND the terms; U-100', async () => {
		draw('terms');
		await ready();
		const answer = screen.getByRole('radiogroup', {
			name: 'Έχετε ενεργό ασφαλιστικό συμβόλαιο αστικής ευθύνης;'
		});
		expect(answer).toHaveClass('flex', 'flex-col');
		expect(
			within(answer)
				.getAllByRole('radio')
				.map((card) => card.querySelector('.font-semibold')?.textContent)
		).toEqual(['Ναι', 'Όχι']);
		const box = screen.getByRole('checkbox', {
			name: 'Αποδέχομαι τους Όρους Συνεργασίας Γιατρών'
		});
		const link = screen.getByTestId('doctor-onboarding-terms-link');
		expect(link.tagName).toBe('A');
		expect(link).toHaveAttribute('href', '/legal/doctor-marketplace-terms');
		expect(link).toHaveTextContent('Όρους Συνεργασίας Γιατρών');
		expect(box).not.toContainElement(link);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.queryByTestId('doctor-onboarding-insurance-details')).toBeNull();
		expect(next()).toBeDisabled();
		await user().click(within(answer).getByRole('radio', { name: /Όχι/ }));
		expect(next()).toBeDisabled();
		await user().click(box);
		await waitFor(() => expect(next()).not.toBeDisabled());
		noHover(screen.getByTestId('doctor-onboarding-terms'));
	});

	it('🔴 Ε2 (BLOCKER 2): «Επόμενο» reads the terms’ version at that moment and writes `liability` with ONLY the doctors’ terms at it; then «Πρόσβαση»', async () => {
		const { handle } = draw('terms', { depth: 10 });
		await ready();
		expect(termsReads()).toEqual([]);
		await user().click(screen.getByTestId('doctor-onboarding-insurance-yes'));
		await user().type(screen.getByTestId('doctor-onboarding-insurer'), ' Ασφαλιστική Α.Ε. ');
		await user().click(screen.getByTestId('doctor-onboarding-terms-accept'));
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/access', 11));
		expect(termsReads()).toHaveLength(1);
		expect(termsReads()[0].search).toBe('?lang=el');
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/liability',
				method: 'POST',
				body: {
					liabilityInsurance: true,
					liabilityCompany: 'Ασφαλιστική Α.Ε.',
					liabilityInsuranceExpiresAt: null,
					legalAcceptance: {
						context: 'DOCTOR',
						acceptances: [
							{ documentCode: 'DOCTOR_MARKETPLACE_TERMS', version: '2026-11', accepted: true }
						]
					}
				},
				search: ''
			}
		]);
		expect(handle.draft.edits.liability).toBeUndefined();
		expect(handle.draft.edits.terms).toBeUndefined();
	});

	it('a version that moved on (the server’s `400`) is read again once and sent again — no word to the doctor', async () => {
		let tries = 0;
		answers['POST /doctor/onboarding/liability'] = () => {
			tries += 1;
			if (tries === 1) {
				termsVersion = '2026-12';
				return refusal(400, 'legalAcceptance version is not current');
			}
			return json(server);
		};
		draw('terms', { depth: 10 });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-insurance-no'));
		await user().click(screen.getByTestId('doctor-onboarding-terms-accept'));
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/access', 11));
		expect(termsReads()).toHaveLength(2);
		expect(
			writes().map(
				(call) =>
					(call.body as { legalAcceptance: { acceptances: { version: string }[] } }).legalAcceptance
						.acceptances[0].version
			)
		).toEqual(['2026-11', '2026-12']);
		expect(screen.queryByTestId('doctor-onboarding-save-error')).toBeNull();
	});

	it('W-4 (w3-b3 codes, parity w3-a5 §1.2): the server’s `DOCTOR_TERMS_NOT_ACCEPTED` says «Χωρίς την αποδοχή των όρων…»; nothing moves', async () => {
		answers['POST /doctor/onboarding/liability'] = () =>
			refusal(
				422,
				'Validation Error: DOCTOR_TERMS_NOT_ACCEPTED: legalAcceptance is required',
				'EC422'
			);
		draw('terms', { depth: 10 });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-insurance-no'));
		await user().click(screen.getByTestId('doctor-onboarding-terms-accept'));
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-save-error')).toHaveTextContent(
			'Χωρίς την αποδοχή των όρων δεν μπορείτε να ολοκληρώσετε την εγγραφή σας.'
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(writes()).toHaveLength(1);
	});

	it('(negative) no version to read, or a second refusal: nothing moves and the page says so; the answers stay', async () => {
		answers['GET /content/public/pages/doctor-marketplace-terms'] = () => json({ slug: 'x' });
		const { handle } = draw('terms');
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-insurance-no'));
		await user().click(screen.getByTestId('doctor-onboarding-terms-accept'));
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-save-error')).toBeInTheDocument();
		expect(writes()).toEqual([]);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(handle.draft.edits).toMatchObject({
			liability: { liabilityInsurance: false },
			terms: { accepted: true }
		});
	});

	it('U-65.6 (negative): the company stops at 120 and stays text; an expiry left half says «Δώστε μια έγκυρη ημερομηνία» and writes nothing', async () => {
		draw('terms');
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-insurance-yes'));
		const insurer = screen.getByTestId('doctor-onboarding-insurer');
		expect(insurer).toHaveAttribute('maxlength', '120');
		await user().type(insurer, '<img src=x onerror=alert(1)>');
		expect(document.querySelector('img')).toBeNull();
		const details = screen.getByTestId('doctor-onboarding-insurance-details');
		// U-129.1: ONE date field (`type="date"`); «12/05/203» left half is the browser's `badInput`, no value.
		const expiry = within(details).getByLabelText(
			'Λήξη συμβολαίου (προαιρετικό)'
		) as HTMLInputElement;
		expect(expiry).toHaveAttribute('type', 'date');
		Object.defineProperty(expiry, 'validity', {
			configurable: true,
			get: () => ({ badInput: true })
		});
		expiry.dispatchEvent(new Event('input', { bubbles: true }));
		Reflect.deleteProperty(expiry, 'validity');
		await user().click(screen.getByTestId('doctor-onboarding-terms-accept'));
		await user().click(next());
		expect(await screen.findByText('Δώστε μια έγκυρη ημερομηνία')).toBeInTheDocument();
		expect(writes()).toEqual([]);
		expect(termsReads()).toEqual([]);
		await user().type(expiry, '2030-05-12');
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toMatchObject({
			liabilityInsuranceExpiresAt: '2030-05-12T00:00:00.000Z'
		});
	});
});

describe('42 · «Πρόσβαση» and «Ολοκλήρωση εγγραφής» (record §6.4, review §3.6)', () => {
	beforeEach(() => {
		server = answeredUpTo(['ACTIVATION_INTENT']);
	});

	it('🔴 U-110.2 / U-112.1: three choices one under the other, the profile and booking on; none ⇒ «Διαλέξτε τουλάχιστον ένα.» and locked; the call’s switch with its mobile; U-100', async () => {
		draw('access');
		await ready();
		const group = screen.getByRole('group', { name: 'Τι θέλετε να ενεργοποιήσουμε;' });
		expect(group).toHaveClass('flex', 'flex-col');
		expect(group.className).not.toMatch(/grid-cols|flex-row|flex-wrap/u);
		const wishes = within(group).getAllByRole('checkbox');
		expect(wishes.map((wish) => wish.getAttribute('aria-checked'))).toEqual([
			'true',
			'true',
			'false'
		]);
		expect(
			screen.getByRole('switch', { name: 'Θέλω να επικοινωνήσει μαζί μου συνεργάτης' })
		).toHaveAttribute('aria-checked', 'true');
		expect(next()).toHaveTextContent('Ολοκλήρωση εγγραφής');
		expect(next()).toBeDisabled();
		await user().click(wishes[0]);
		await user().click(wishes[1]);
		expect(screen.getByTestId('doctor-onboarding-access-none')).toHaveTextContent(
			'Διαλέξτε τουλάχιστον ένα.'
		);
		await user().click(screen.getByRole('switch'));
		expect(screen.queryByTestId('doctor-onboarding-contact-phone')).toBeNull();
		expect(next()).toBeDisabled();
		await user().click(wishes[2]);
		await waitFor(() => expect(next()).not.toBeDisabled());
		noHover(screen.getByTestId('doctor-onboarding-access'));
	});

	it('«Ολοκλήρωση εγγραφής»: `activation-intent`, then `complete` (no terms in it, Ε2); done ⇒ the memory empties and the end takes this page’s place', async () => {
		answers['POST /doctor/onboarding/complete'] = () =>
			json({ ...server, state: 'COMPLETED', missing: [], completedAt: '2026-11-07T19:00:00.000Z' });
		const { handle } = draw('access', { depth: 12 });
		await ready();
		await user().type(screen.getByTestId('doctor-onboarding-contact-phone'), ' 691 234 5678 ');
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/done', 12, true));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/activation-intent',
				method: 'POST',
				body: { wantsMarketplace: true, wantsAppointments: true, wantsPayments: false },
				search: ''
			},
			{
				path: '/doctor/onboarding/complete',
				method: 'POST',
				body: { salesContactRequested: true, salesContactPhone: '+306912345678' },
				search: ''
			}
		]);
		expect(handle.draft.edits).toEqual({});
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(vi.mocked(goto)).not.toHaveBeenCalledWith('/doctor/onboarding', expect.anything());
	});

	it('🔴 B-9 (review §3.6): a refused `complete` reads the progress again and opens its first missing step in this page’s place', async () => {
		answers['POST /doctor/onboarding/complete'] = () => {
			server = { ...server, missing: ['OFFICE_PHONE'] };
			return refusal(422, 'DOCTOR_ONBOARDING_INCOMPLETE: office phone is missing');
		};
		draw('access', { depth: 12 });
		await ready();
		await user().click(screen.getByRole('switch'));
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/office', 12, true));
		expect(writes().map((call) => call.path)).toEqual([
			'/doctor/onboarding/activation-intent',
			'/doctor/onboarding/complete'
		]);
		expect(
			calls.filter((call) => call.method === 'GET' && call.path === '/doctor/onboarding').length
		).toBeGreaterThan(1);
	});

	it('(negative) a refusal with nothing missing before stays here and says so (W8-Σ1: the refused form’s words, never «check your connection»); no end, no overview', async () => {
		answers['POST /doctor/onboarding/complete'] = () =>
			refusal(422, 'DOCTOR_ONBOARDING_INCOMPLETE');
		draw('access');
		await ready();
		await user().click(screen.getByRole('switch'));
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-save-error')).toHaveTextContent(
			'Ελέγξτε τα στοιχεία που συμπληρώσατε και δοκιμάστε ξανά.'
		);
		expect(screen.getByTestId('doctor-onboarding-save-error')).not.toHaveTextContent('σύνδεσή');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('W8 Delta 3 (N1): a kept mobile reads back as a field shows it («+306912345678» as «6912345678») and «Ολοκλήρωση» sends the same E.164 again', async () => {
		server = {
			...answeredUpTo(['ACTIVATION_INTENT']),
			salesContact: { salesContactRequested: true, salesContactPhone: '+306912345678' }
		};
		answers['POST /doctor/onboarding/complete'] = () =>
			json({ ...server, state: 'COMPLETED', missing: [], completedAt: '2026-11-07T19:00:00.000Z' });
		draw('access', { depth: 12 });
		await ready();
		expect(screen.getByTestId('doctor-onboarding-contact-phone')).toHaveValue('6912345678');
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(2));
		expect(writes()[1].body).toEqual({
			salesContactRequested: true,
			salesContactPhone: '+306912345678'
		});
	});

	it('W8 Delta 1: the contact’s mobile leaves in the server’s form — «691 234 5678», «+30 691 234 5678» and «0030…» all as «+306912345678»', async () => {
		for (const typed of ['691 234 5678', '+30 691 234 5678', '00306912345678']) {
			calls = [];
			answers['POST /doctor/onboarding/complete'] = () =>
				json({
					...server,
					state: 'COMPLETED',
					missing: [],
					completedAt: '2026-11-07T19:00:00.000Z'
				});
			const { view } = draw('access', { depth: 12 });
			await ready();
			await user().type(screen.getByTestId('doctor-onboarding-contact-phone'), typed);
			await user().click(next());
			await waitFor(() => expect(writes()).toHaveLength(2));
			expect(writes()[1].body).toEqual({
				salesContactRequested: true,
				salesContactPhone: '+306912345678'
			});
			view.unmount();
		}
	});

	it('W8 Delta 1 (negative): the server’s 422 on the mobile (any message of its phone rule, «…τηλέφωνο…») is said UNDER it with «Συμπληρώστε έγκυρο κινητό.», never by the frame; nothing opens; a new number takes it away', async () => {
		for (const [status, message] of [
			[422, 'Validation Error: Μη έγκυρος κωδικός χώρας για το τηλέφωνο.'],
			[422, 'Validation Error: Ευρωπαϊκό τηλέφωνο με 2-ψήφιο κωδικό πρέπει να έχει 12 ψηφία.']
		] as const) {
			calls = [];
			vi.mocked(goto).mockClear();
			answers['POST /doctor/onboarding/complete'] = () => refusal(status, message);
			const { view } = draw('access', { depth: 12 });
			await ready();
			const mobile = screen.getByTestId('doctor-onboarding-contact-phone');
			await user().type(mobile, '+999 6912345678');
			await user().click(next());
			await waitFor(() => expect(writes()).toHaveLength(2));
			expect(await screen.findByText('Συμπληρώστε έγκυρο κινητό.')).toBeInTheDocument();
			expect(mobile).toHaveAttribute('aria-invalid', 'true');
			expect(screen.queryByTestId('doctor-onboarding-save-error')).toBeNull();
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
			await user().clear(mobile);
			await user().type(mobile, '6912345678');
			expect(screen.queryByText('Συμπληρώστε έγκυρο κινητό.')).toBeNull();
			view.unmount();
		}
	});

	it('W8 Delta 1 (negative): a mobile the sign-in’s rule cannot compose (16 digits ⇒ 19 with «+30») locks «Ολοκλήρωση» and is said once left; nothing is sent', async () => {
		draw('access');
		await ready();
		await user().type(screen.getByTestId('doctor-onboarding-contact-phone'), '1234567890123456');
		await user().tab();
		expect(screen.getByText('Συμπληρώστε έγκυρο κινητό.')).toBeInTheDocument();
		expect(next()).toBeDisabled();
		expect(writes()).toEqual([]);
	});

	it('U-65.6 (negative): the mobile stops at 16; a wrong one says «Συμπληρώστε έγκυρο κινητό.» once left and locks; «Αποθήκευση και έξοδος» keeps the wishes and never completes', async () => {
		draw('access');
		await ready();
		const mobile = screen.getByTestId('doctor-onboarding-contact-phone');
		expect(mobile).toHaveAttribute('maxlength', '16');
		await user().type(mobile, '69x');
		await user().tab();
		expect(screen.getByText('Συμπληρώστε έγκυρο κινητό.')).toBeInTheDocument();
		expect(next()).toBeDisabled();
		await user().click(screen.getByTestId('doctor-onboarding-save-exit'));
		await waitFor(() => opened('/doctor/onboarding', 0));
		expect(writes().map((call) => call.path)).toEqual(['/doctor/onboarding/activation-intent']);
	});
});

describe('«Λάβαμε την αίτησή σας» (record §6.4)', () => {
	it('a finished sign-up: the ✓, «Dr. {name}», «Τι ακολουθεί» in three points and one «Στην αρχική» link; only the help pill, no bar', async () => {
		server = { ...answeredUpTo([]), state: 'COMPLETED' };
		draw('done');
		const home = await screen.findByTestId('doctor-onboarding-to-home');
		expect(home.tagName).toBe('A');
		expect(home).toHaveAttribute('href', '/');
		expect(home).toHaveTextContent('Στην αρχική');
		expect(
			screen.getByRole('heading', { level: 1, name: 'Λάβαμε την αίτησή σας' })
		).toBeInTheDocument();
		expect(screen.getByTestId('doctor-onboarding-done-body')).toHaveTextContent(
			'Ευχαριστούμε, Dr. Μαρία Τριανταφύλλου. Η εγγραφή σας ολοκληρώθηκε.'
		);
		expect(
			within(screen.getByTestId('doctor-onboarding-done-next')).getAllByRole('listitem')
		).toHaveLength(3);
		expect(screen.getByTestId('doctor-onboarding-help')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-onboarding-save-exit')).toBeNull();
		expect(screen.queryByTestId('doctor-onboarding-done-progress')).toBeNull();
		expect(screen.queryByTestId('doctor-onboarding-back')).toBeNull();
		noHover(screen.getByTestId('doctor-onboarding-done'));
	});

	it('(negative) the end of a sign-up still open (a link, the browser’s «back») goes to the overview', async () => {
		server = answeredUpTo(['ACTIVATION_INTENT']);
		draw('done');
		await waitFor(() => opened('/doctor/onboarding', 0, true));
	});
});

describe('review w3-w5 R1 · a network that answers after a macrotask (MINOR-1, NIT-1)', () => {
	beforeEach(() => {
		slow = true;
	});

	it('🔴 MINOR-1 (42): «Ολοκλήρωση εγγραφής» sends `activation-intent` AND `complete` back to back, and the end opens', async () => {
		server = answeredUpTo(['ACTIVATION_INTENT']);
		answers['POST /doctor/onboarding/complete'] = () =>
			json({ ...server, state: 'COMPLETED', missing: [], completedAt: '2026-11-07T19:00:00.000Z' });
		draw('access', { depth: 12 });
		await ready();
		await user().type(screen.getByTestId('doctor-onboarding-contact-phone'), '6912345678');
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/done', 12, true));
		expect(writes().map((call) => call.path)).toEqual([
			'/doctor/onboarding/activation-intent',
			'/doctor/onboarding/complete'
		]);
	});

	it('🔴 MINOR-1 (41): a version that moved on (`400`) is read again and the `liability` sent again, with the new one', async () => {
		let tries = 0;
		answers['POST /doctor/onboarding/liability'] = () => {
			tries += 1;
			if (tries === 1) {
				termsVersion = '2026-12';
				return refusal(400, 'legalAcceptance version is not current');
			}
			return json(server);
		};
		draw('terms', { depth: 10 });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-insurance-no'));
		await user().click(screen.getByTestId('doctor-onboarding-terms-accept'));
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/access', 11));
		expect(
			writes().map(
				(call) =>
					(call.body as { legalAcceptance: { acceptances: { version: string }[] } }).legalAcceptance
						.acceptances[0].version
			)
		).toEqual(['2026-11', '2026-12']);
		expect(screen.queryByTestId('doctor-onboarding-save-error')).toBeNull();
	});

	it('🔴 MINOR-1: «Επόμενο» pressed twice while its write is out sends ONE write', async () => {
		draw('price', { depth: 7 });
		await ready();
		await user().type(screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' }), '60');
		await waitFor(() => expect(next()).not.toBeDisabled());
		next().click();
		next().click();
		await waitFor(() => opened('/doctor/onboarding/calendar', 8));
		await new Promise((after) => setTimeout(after, 30));
		expect(
			writes().filter((call) => call.path === '/doctor/onboarding/service-pricing')
		).toHaveLength(1);
	});

	it('NIT-1: «Αποθήκευση και έξοδος» while «Επόμενο» saves waits for that write — ONE write — then leaves for the overview', async () => {
		draw('price', { depth: 7 });
		await ready();
		await user().type(screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' }), '60');
		await waitFor(() => expect(next()).not.toBeDisabled());
		next().click();
		screen.getByTestId('doctor-onboarding-save-exit').click();
		await waitFor(() => opened('/doctor/onboarding', 0));
		await new Promise((after) => setTimeout(after, 30));
		expect(writes().map((call) => call.path)).toEqual(['/doctor/onboarding/service-pricing']);
		expect(vi.mocked(goto)).not.toHaveBeenCalledWith(
			'/doctor/onboarding/calendar',
			expect.anything()
		);
	});

	it('NIT-1 / W8-Σ1 (negative): a refused write keeps the page and its words — no exit, never a silent nothing, never «check your connection» for a 4xx', async () => {
		answers['POST /doctor/onboarding/service-pricing'] = () => refusal(422, 'price is invalid');
		draw('price', { depth: 7 });
		await ready();
		await user().type(screen.getByRole('textbox', { name: 'Τιμή σε ευρώ' }), '60');
		await waitFor(() => expect(next()).not.toBeDisabled());
		next().click();
		screen.getByTestId('doctor-onboarding-save-exit').click();
		expect(await screen.findByTestId('doctor-onboarding-save-error')).toHaveTextContent(
			'Ελέγξτε τα στοιχεία που συμπληρώσατε και δοκιμάστε ξανά.'
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});
});

describe('review w3-w6 R1 NIT-1 · «Αποθήκευση και έξοδος» locked through a page’s own chain', () => {
	const exit = () => screen.getByTestId('doctor-onboarding-save-exit');

	it('42: locked through «Ολοκλήρωση εγγραφής» — `activation-intent`, then `complete` — a press does nothing, and the end opens', async () => {
		server = answeredUpTo(['ACTIVATION_INTENT']);
		let releaseIntent = () => {};
		let releaseComplete = () => {};
		answers['POST /doctor/onboarding/activation-intent'] = () =>
			new Promise((done) => {
				releaseIntent = () => done(json(server));
			});
		answers['POST /doctor/onboarding/complete'] = () =>
			new Promise((done) => {
				releaseComplete = () =>
					done(
						json({
							...server,
							state: 'COMPLETED',
							missing: [],
							completedAt: '2026-11-08T10:00:00.000Z'
						})
					);
			});
		draw('access', { depth: 12 });
		await ready();
		await user().type(screen.getByTestId('doctor-onboarding-contact-phone'), '6912345678');
		expect(exit()).not.toBeDisabled();
		next().click();
		await waitFor(() => expect(writes()).toHaveLength(1));
		await waitFor(() => expect(exit()).toBeDisabled());
		exit().click();
		releaseIntent();
		await waitFor(() => expect(writes()).toHaveLength(2));
		expect(exit()).toBeDisabled();
		exit().click();
		releaseComplete();
		await waitFor(() => opened('/doctor/onboarding/done', 12, true));
		expect(writes().map((call) => call.path)).toEqual([
			'/doctor/onboarding/activation-intent',
			'/doctor/onboarding/complete'
		]);
		expect(vi.mocked(goto)).not.toHaveBeenCalledWith('/doctor/onboarding', expect.anything());
	});

	it('41: locked through a version that moved on — the refused write, the version read again, the second write — and «Επόμενο» goes on', async () => {
		let tries = 0;
		answers['POST /doctor/onboarding/liability'] = () => {
			tries += 1;
			if (tries === 1) {
				termsVersion = '2026-12';
				return refusal(400, 'legalAcceptance version is not current');
			}
			return json(server);
		};
		let held = false;
		let releaseRead = () => {};
		answers['GET /content/public/pages/doctor-marketplace-terms'] = () => {
			const answer = json({ slug: 'doctor-marketplace-terms', version: termsVersion });
			if (tries !== 1) return answer;
			held = true;
			return new Promise((done) => {
				releaseRead = () => done(answer);
			});
		};
		draw('terms', { depth: 10 });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-insurance-no'));
		await user().click(screen.getByTestId('doctor-onboarding-terms-accept'));
		expect(exit()).not.toBeDisabled();
		next().click();
		// Between the two writes: none is out, the version is being read again.
		await waitFor(() => expect(held).toBe(true));
		expect(writes()).toHaveLength(1);
		await waitFor(() => expect(exit()).toBeDisabled());
		exit().click();
		releaseRead();
		await waitFor(() => opened('/doctor/onboarding/access', 11));
		expect(writes()).toHaveLength(2);
		expect(vi.mocked(goto)).not.toHaveBeenCalledWith('/doctor/onboarding', expect.anything());
		await waitFor(() => expect(exit()).not.toBeDisabled());
	});
});
