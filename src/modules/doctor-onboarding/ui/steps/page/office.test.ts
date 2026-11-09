import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
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
import type {
	DoctorOnboardingOfficeFacts,
	DoctorOnboardingProgress
} from '$modules/doctor-onboarding/api/progress';
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
	// 🔴 W8-Σ1 / Delta 3: the screen's own rules for a number, not a copy (`use-screen.svelte.ts`).
	toPhoneNumber,
	showPhoneNumber
};

/** An office whose address is saved (made-up facts): no phone yet, no floor (`null`), nothing it has, no way to pay. */
const savedOffice = (overrides: Partial<DoctorOnboardingOfficeFacts> = {}) =>
	({
		streetLine: 'Καραΐσκου 74',
		postalCode: '18532',
		city: 'Πειραιάς',
		latitude: 37.94265,
		longitude: 23.64655,
		placeId: null,
		pinMoved: false,
		phone: null,
		floor: null,
		gettingThere: null,
		parking: false,
		parkingKinds: [],
		disabilityAccess: false,
		accessibleToilet: false,
		accessibleParking: false,
		elevator: false,
		nearPublicTransport: false,
		paymentOptions: [],
		...overrides
	}) satisfies DoctorOnboardingOfficeFacts;

/** A sign-up whose first stage and address are answered: the office's phone and its ways to pay are missing. */
const atTheOffice = (office: Partial<DoctorOnboardingOfficeFacts> = {}) =>
	doctorOnboardingProgressSample({
		missing: ['OFFICE_PHONE', 'OFFICE_PAYMENTS', 'SERVICE_PRICING'],
		basicInfo: {
			firstName: 'Μαρία',
			lastName: 'Τριανταφύλλου',
			dateOfBirth: '1985-04-12',
			gender: 'FEMALE'
		},
		professional: { professionalId: 'p-card', licenseNumber: null, licenseObtainedDate: null },
		office: savedOffice(office)
	});

beforeEach(() => {
	calls = [];
	answers = {};
	server = atTheOffice();
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
const ready = async () => {
	await screen.findByTestId('doctor-onboarding-next');
	await waitFor(() => expect(screen.queryByTestId('doctor-onboarding-loading')).toBeNull());
};
const opened = (path: string, depth: number, replaceState = false) =>
	expect(vi.mocked(goto)).toHaveBeenCalledWith(path, {
		replaceState,
		state: { onboarding: { depth } }
	});
/** U-100 / D-W3-27: nothing of the sign-up's pages takes a colour under the pointer — its controls included. */
const noHover = (root: Element) => {
	for (const node of [root, ...root.querySelectorAll('*')]) {
		expect([...node.classList].filter((name) => name.includes('hover:'))).toEqual([]);
	}
};
const floor = () => screen.getByRole('spinbutton', { name: 'Όροφος' });
const phone = () => screen.getByTestId('doctor-onboarding-office-phone');
const directions = () => screen.getByTestId('doctor-onboarding-getting-there');

describe('38 · «Πώς θα σας βρουν οι ασθενείς;» (record §6.8, U-110.3)', () => {
	it('🔴 D-W3-26: no floor on the server starts on «Ισόγειο» and is sent as 0; «Επόμενο» opens only for a valid phone, writes the `details` group and opens «Τι θα βρουν» as one more page', async () => {
		const { handle } = draw('office', { depth: 4 });
		await ready();
		expect(
			screen.getByRole('heading', { level: 1, name: 'Πώς θα σας βρουν οι ασθενείς;' })
		).toBeInTheDocument();
		expect(floor()).toHaveValue('Ισόγειο');
		expect(floor()).toHaveAttribute('aria-valuetext', 'Ισόγειο');
		expect(floor()).toHaveAttribute('aria-valuenow', '0');
		expect(screen.getByLabelText('Τηλέφωνο ιατρείου')).toBe(phone());
		expect(next()).toBeDisabled();
		await user().type(phone(), '210 412 3456');
		await user().type(directions(), 'Κουδούνι «Ιατρείο».');
		expect(screen.getByTestId('doctor-onboarding-getting-there-counter')).toHaveTextContent(
			'19/1000'
		);
		await waitFor(() => expect(next()).not.toBeDisabled());
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/amenities', 5));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/office',
				method: 'POST',
				body: {
					details: { phone: '+302104123456', floor: 0, gettingThere: 'Κουδούνι «Ιατρείο».' }
				}
			}
		]);
		expect(handle.draft.edits.office).toBeUndefined();
	});

	it('the floor from «Υπόγειο» to «20ος» in the profile’s words, «−» / «+» off at their bound; U-100: nothing under the pointer', async () => {
		server = atTheOffice({ floor: 19, phone: '2104123456' });
		draw('office');
		await ready();
		expect(floor()).toHaveValue('19ος');
		await user().click(screen.getByRole('button', { name: 'Ψηλότερος όροφος' }));
		expect(floor()).toHaveValue('20ος');
		expect(screen.getByRole('button', { name: 'Ψηλότερος όροφος' })).toBeDisabled();
		floor().focus();
		for (let step = 0; step < 21; step += 1) await user().keyboard('{ArrowDown}');
		expect(floor()).toHaveValue('Υπόγειο');
		expect(screen.getByRole('button', { name: 'Χαμηλότερος όροφος' })).toBeDisabled();
		noHover(screen.getByTestId('doctor-onboarding-office'));
	});

	it('W8-Δ4 / U-110.3: the floor is Airbnb’s counter — ONE 64 box, «Όροφος» inside on the left, «−» / «+» in 36 circles — starting on «Ισόγειο»; nothing under the pointer', async () => {
		draw('office');
		await ready();
		const stepper = floor().closest('[data-slot="stepper"]') as HTMLElement;
		expect(stepper).toHaveAttribute('data-variant', 'counter');
		const box = stepper.querySelector('[data-slot="stepper-box"]') as HTMLElement;
		expect(box).toHaveClass('min-h-control-xl');
		expect(box.firstElementChild).toHaveTextContent('Όροφος');
		expect(stepper.querySelectorAll('[data-slot="stepper-round"]')).toHaveLength(2);
		expect(floor()).toHaveValue('Ισόγειο');
		expect(screen.getByRole('button', { name: 'Χαμηλότερος όροφος' })).toBeEnabled();
		noHover(stepper);
	});

	it('🔴 card w3-w5: down to the ground floor while the server keeps an elevator ⇒ the SAME write sends `amenities` with the elevator off', async () => {
		server = atTheOffice({
			phone: '2104123456',
			floor: 1,
			elevator: true,
			parking: true,
			parkingKinds: ['STREET']
		});
		draw('office');
		await ready();
		await user().click(screen.getByRole('button', { name: 'Χαμηλότερος όροφος' }));
		expect(floor()).toHaveValue('Ισόγειο');
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toEqual({
			details: { phone: '+302104123456', floor: 0, gettingThere: null },
			amenities: {
				parking: true,
				parkingKinds: ['STREET'],
				disabilityAccess: false,
				accessibleToilet: false,
				accessibleParking: false,
				elevator: false,
				nearPublicTransport: false
			}
		});
	});

	it('U-65.6 (negative): the phone stops at 16 and a wrong one says «Συμπληρώστε έγκυρο τηλέφωνο.» once left, locked; the directions stop at 1000 — a longer paste is cut in the box too — and stay text', async () => {
		draw('office');
		await ready();
		expect(phone()).toHaveAttribute('maxlength', '16');
		await user().type(phone(), '210abc');
		await user().tab();
		expect(screen.getByText('Συμπληρώστε έγκυρο τηλέφωνο.')).toBeInTheDocument();
		expect(next()).toBeDisabled();
		expect(directions()).toHaveAttribute('maxlength', '1000');
		await fireEvent.input(directions(), {
			target: { value: `<img src=x onerror=alert(1)>${'α'.repeat(1001)}` }
		});
		expect((directions() as HTMLTextAreaElement).value).toHaveLength(1000);
		expect(screen.getByTestId('doctor-onboarding-getting-there-counter')).toHaveTextContent(
			'1000/1000'
		);
		expect(document.querySelector('img')).toBeNull();
		expect(writes()).toEqual([]);
	});

	it('(negative) the server’s refusal keeps every word and says so; nothing moves', async () => {
		answers['POST /doctor/onboarding/office'] = () => refusal(422, 'OFFICE_AMENITY_PARENT_MISSING');
		const { handle } = draw('office');
		await ready();
		await user().type(phone(), '2104123456');
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-save-error')).toBeInTheDocument();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(handle.draft.edits.office).toEqual({ phone: '2104123456' });
	});
});

describe('38 · W-4 / W8-Σ1: w3-b3’s office codes ⇒ the frame’s approved words, never «check your connection» for a 4xx', () => {
	const INVALID = 'Ελέγξτε τα στοιχεία που συμπληρώσατε και δοκιμάστε ξανά.';
	const RATE = 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.';

	for (const [status, message, code, words] of [
		[422, 'Validation Error: OFFICE_AMENITY_PARENT_MISSING: elevator', 'EC422', INVALID],
		[422, 'Validation Error: OFFICE_POINT_OUTSIDE_GREECE', 'EC422', INVALID],
		[409, 'Already exist: DOCTOR_ONBOARDING_OFFICE_ADDRESS_REQUIRED', 'EC415', INVALID],
		[429, 'Too many requests', 'EC429', RATE]
	] as const) {
		it(`W8-Σ1: ${status} ${message.split(': ')[1] ?? message} ⇒ «${words}», the words kept, nothing moves`, async () => {
			answers['POST /doctor/onboarding/office'] = () => refusal(status, message, code);
			const { handle } = draw('office');
			await ready();
			await user().type(phone(), '2104123456');
			await user().click(next());
			const error = await screen.findByTestId('doctor-onboarding-save-error');
			expect(error).toHaveTextContent(words);
			expect(error).not.toHaveTextContent('σύνδεσή');
			expect(error).not.toHaveTextContent('κωδικό');
			expect(screen.queryByText('Συμπληρώστε έγκυρο τηλέφωνο.')).toBeNull();
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
			expect(handle.draft.edits.office).toEqual({ phone: '2104123456' });
		});
	}

	it('W8-Σ1: a lost request (no answer at all) still says «Ελέγξτε τη σύνδεσή σας»', async () => {
		answers['POST /doctor/onboarding/office'] = () => {
			throw new TypeError('Failed to fetch');
		};
		draw('office');
		await ready();
		await user().type(phone(), '2104123456');
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-save-error')).toHaveTextContent(
			'Δεν μπορέσαμε να αποθηκεύσουμε αυτό το βήμα. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
	});
});

describe('W8 Delta 1 · the frame says a state in its own approved words, never «check your connection»', () => {
	const LOCKED_OVERVIEW =
		'Δεν μπορείτε να ξεκινήσετε νέα εγγραφή, γιατί οι προηγούμενες έμειναν ημιτελείς τρεις φορές. Γράψτε μας από το Κέντρο βοήθειας.';

	it('W8 Delta 1: the sign-up locked after three unfinished ones (its `403`) says the locked overview’s words, and the overview opens in this page’s place', async () => {
		answers['POST /doctor/onboarding/office'] = () => {
			server = { ...server, state: 'LOCKED' };
			return refusal(
				403,
				'Forbidden: Doctor registration is locked after repeated incomplete onboarding. Contact support.',
				'EC403'
			);
		};
		draw('office');
		await ready();
		await user().type(phone(), '2104123456');
		await user().click(next());
		const error = await screen.findByTestId('doctor-onboarding-save-error');
		expect(error).toHaveTextContent(LOCKED_OVERVIEW);
		expect(error).not.toHaveTextContent('σύνδεσή');
		await waitFor(() => opened('/doctor/onboarding', 0, true));
	});

	it('W8 Delta 1: the account locked for a while (`USER_LOCKED`) says «Ο λογαριασμός σας είναι προσωρινά κλειδωμένος.»; the sign-up stays open, so the page stays', async () => {
		answers['POST /doctor/onboarding/office'] = () =>
			refusal(403, 'Your account is temporarily locked. Please try again later.', 'USER_LOCKED');
		const { handle } = draw('office');
		await ready();
		await user().type(phone(), '2104123456');
		await user().click(next());
		const error = await screen.findByTestId('doctor-onboarding-save-error');
		expect(error).toHaveTextContent('Ο λογαριασμός σας είναι προσωρινά κλειδωμένος.');
		expect(error).not.toHaveTextContent('σύνδεσή');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(handle.draft.edits.office).toEqual({ phone: '2104123456' });
	});

	it('W8 Delta 1: a sign-up the server says is not started opens the overview (where it starts) in this page’s place, with no words of the frame', async () => {
		answers['POST /doctor/onboarding/office'] = () =>
			refusal(422, 'Validation Error: DOCTOR_ONBOARDING_NOT_STARTED', 'EC422');
		draw('office');
		await ready();
		await user().type(phone(), '2104123456');
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding', 0, true));
		expect(screen.queryByTestId('doctor-onboarding-save-error')).toBeNull();
		expect(screen.queryByText(/σύνδεσή σας/u)).toBeNull();
	});

	it('W8 Delta 1 / Delta 2 (negative): a `403` without the lock’s words is no lock — nothing opens, no lock’s words; it says «Κάτι πήγε στραβά. Δοκιμάστε ξανά.», never «check your connection»', async () => {
		answers['POST /doctor/onboarding/office'] = () =>
			refusal(403, 'Forbidden: Origin is not allowed.', 'EC403');
		draw('office');
		await ready();
		await user().type(phone(), '2104123456');
		await user().click(next());
		const error = await screen.findByTestId('doctor-onboarding-save-error');
		expect(error).toHaveTextContent('Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
		expect(error).not.toHaveTextContent('σύνδεσή');
		expect(error).not.toHaveTextContent(LOCKED_OVERVIEW);
		expect(error).not.toHaveTextContent('κλειδωμένος');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('W8 Delta 2 (negative): any other `4xx` (`404`, `413`) says «Κάτι πήγε στραβά. Δοκιμάστε ξανά.»; only a `5xx` says «…Ελέγξτε τη σύνδεσή σας…»', async () => {
		for (const [status, message, code, words] of [
			[404, 'Not found', 'EC404', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
			[413, 'Request body is too large', 'PAYLOAD_TOO_LARGE', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
			[
				500,
				'Something went wrong',
				'EC500',
				'Δεν μπορέσαμε να αποθηκεύσουμε αυτό το βήμα. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
			]
		] as const) {
			answers['POST /doctor/onboarding/office'] = () => refusal(status, message, code);
			const { view } = draw('office');
			await ready();
			await user().type(phone(), '2104123456');
			await user().click(next());
			expect(await screen.findByTestId('doctor-onboarding-save-error')).toHaveTextContent(words);
			view.unmount();
		}
	});
});

describe('38 · W8-Σ1: the office phone in the server’s form (E.164), its refusal under its field', () => {
	it('W8 Delta 3 (N1): a kept number reads back as a field shows it — «+302101000099» as «2101000099», «+447911123456» as «+44 7911123456» — and an unchanged save sends the same E.164 again', async () => {
		for (const [kept, shown] of [
			['+302101000099', '2101000099'],
			['+447911123456', '+44 7911123456']
		] as const) {
			calls = [];
			server = atTheOffice({ phone: kept, floor: 2 });
			const { view, handle } = draw('office', { depth: 4 });
			await ready();
			expect(phone()).toHaveValue(shown);
			expect(handle.draft.edits.office).toBeUndefined();
			await waitFor(() => expect(next()).not.toBeDisabled());
			await user().click(next());
			await waitFor(() => expect(writes()).toHaveLength(1));
			expect(writes()[0].body).toEqual({
				details: { phone: kept, floor: 2, gettingThere: null }
			});
			view.unmount();
		}
	});

	it('W8-Σ1: a Greek number as the prototype writes it («210 412 3456», no «+30») leaves as «+302104123456»; «+30 …» and «0030…» the same', async () => {
		for (const typed of ['210 412 3456', '+30 210 412 3456', '00302104123456']) {
			calls = [];
			vi.mocked(goto).mockClear();
			const { view } = draw('office', { depth: 4 });
			await ready();
			await user().type(phone(), typed);
			await waitFor(() => expect(next()).not.toBeDisabled());
			await user().click(next());
			await waitFor(() => expect(writes()).toHaveLength(1));
			expect(writes()[0].body).toEqual({
				details: { phone: '+302104123456', floor: 0, gettingThere: null }
			});
			view.unmount();
		}
	});

	it('W8-Σ1 (negative): the server’s 422 on the phone («Μη έγκυρος κωδικός χώρας…») is said UNDER the field with «Συμπληρώστε έγκυρο τηλέφωνο.», never by the frame; nothing moves; a new number takes it away', async () => {
		answers['POST /doctor/onboarding/office'] = () =>
			refusal(422, 'Validation Error: Μη έγκυρος κωδικός χώρας για το τηλέφωνο.', 'EC422');
		const { handle } = draw('office');
		await ready();
		await user().type(phone(), '+999 2104123456');
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(await screen.findByText('Συμπληρώστε έγκυρο τηλέφωνο.')).toBeInTheDocument();
		expect(phone()).toHaveAttribute('aria-invalid', 'true');
		expect(screen.queryByTestId('doctor-onboarding-save-error')).toBeNull();
		expect(screen.queryByText(/σύνδεσή σας/u)).toBeNull();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(writes()[0].body).toEqual({
			details: { phone: '+9992104123456', floor: 0, gettingThere: null }
		});
		expect(handle.draft.edits.office).toEqual({ phone: '+999 2104123456' });
		await user().clear(phone());
		await user().type(phone(), '2104123456');
		expect(screen.queryByText('Συμπληρώστε έγκυρο τηλέφωνο.')).toBeNull();
	});

	it('W8-Σ1 (negative): another message of the phone rule is the field’s too; the schema’s `422` (it names no field) is the frame’s', async () => {
		answers['POST /doctor/onboarding/office'] = () =>
			refusal(422, 'Validation Error: Το τηλέφωνο πρέπει να περιέχει μόνο αριθμούς.', 'EC422');
		const first = draw('office');
		await ready();
		await user().type(phone(), '2104123456');
		await user().click(next());
		expect(await screen.findByText('Συμπληρώστε έγκυρο τηλέφωνο.')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-onboarding-save-error')).toBeNull();
		first.view.unmount();

		answers['POST /doctor/onboarding/office'] = () =>
			refusal(422, 'Validation failed fields: must NOT have more than 32 characters', 'EC422');
		draw('office');
		await ready();
		await user().type(phone(), '2104123456');
		await user().click(next());
		expect(await screen.findByTestId('doctor-onboarding-save-error')).toHaveTextContent(
			'Ελέγξτε τα στοιχεία που συμπληρώσατε και δοκιμάστε ξανά.'
		);
		expect(screen.queryByText('Συμπληρώστε έγκυρο τηλέφωνο.')).toBeNull();
	});

	it('W8-Σ1 (negative): a number the sign-in’s rule cannot compose (16 digits ⇒ 19 with «+30») locks «Επόμενο» and is said once left; nothing is sent', async () => {
		draw('office');
		await ready();
		await user().type(phone(), '1234567890123456');
		await user().tab();
		expect(screen.getByText('Συμπληρώστε έγκυρο τηλέφωνο.')).toBeInTheDocument();
		expect(next()).toBeDisabled();
		expect(writes()).toEqual([]);
	});
});

describe('38 · «Τι θα βρουν οι ασθενείς στο ιατρείο;» (record §6.8, U-110.2 / U-112.1, Ε6)', () => {
	beforeEach(() => {
		server = atTheOffice({ phone: '2104123456', floor: 3 });
		server.missing = ['OFFICE_PAYMENTS', 'SERVICE_PRICING'];
	});

	it('🔴 U-110.2 / U-112.1 / U-100: the choices one under the other in ONE group, all the width, never tiles; the elevator off the ground floor says the floor; nothing under the pointer', async () => {
		draw('amenities');
		await ready();
		const group = screen.getByRole('group', { name: 'Τι έχει το ιατρείο' });
		expect(group).toHaveClass('flex', 'flex-col');
		expect(group.className).not.toMatch(/grid-cols|flex-row|flex-wrap/u);
		expect(
			within(group)
				.getAllByRole('checkbox')
				.map((card) => card.querySelector('.font-semibold')?.textContent)
		).toEqual(['Parking', 'Πρόσβαση ΑμεΑ', 'Ανελκυστήρας', 'Κοντά σε μέσα μεταφοράς']);
		expect(screen.getByText('Το ιατρείο είναι στον 3ο όροφο.')).toBeInTheDocument();
		expect(next()).not.toBeDisabled();
		noHover(screen.getByTestId('doctor-onboarding-amenities'));
	});

	it('record §6.8: on the ground floor there is no elevator to choose; in the basement it says so', async () => {
		server = atTheOffice({ phone: '2104123456', floor: null });
		server.missing = ['OFFICE_PAYMENTS'];
		const first = draw('amenities');
		await ready();
		expect(screen.queryByTestId('doctor-onboarding-amenity-elevator')).toBeNull();
		first.view.unmount();
		server = atTheOffice({ phone: '2104123456', floor: -1 });
		server.missing = ['OFFICE_PAYMENTS'];
		draw('amenities');
		await ready();
		expect(screen.getByText('Το ιατρείο είναι στο υπόγειο.')).toBeInTheDocument();
	});

	it('Parking and «Πρόσβαση ΑμεΑ» open their details under them, 24 in; letting a card go takes its details (Ε6); «Επόμενο» writes the `amenities` group', async () => {
		const { handle } = draw('amenities', { depth: 5 });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-amenity-parking'));
		const kinds = screen.getByRole('group', { name: 'Τι parking υπάρχει;' });
		expect(screen.getByTestId('doctor-onboarding-amenity-parking-details')).toHaveClass('pl-6');
		expect(
			within(kinds)
				.getAllByRole('checkbox')
				.map((row) => row.getAttribute('aria-label'))
		).toEqual(['Ιδιωτικό parking', 'Δημόσιο parking κοντά', 'Στάθμευση στον δρόμο']);
		await user().click(within(kinds).getByRole('checkbox', { name: 'Δημόσιο parking κοντά' }));
		await user().click(screen.getByTestId('doctor-onboarding-amenity-disabilityAccess'));
		await user().click(
			within(screen.getByRole('group', { name: 'Τι άλλο υπάρχει;' })).getByRole('checkbox', {
				name: 'Τουαλέτα ΑμεΑ'
			})
		);
		// Parking let go: its kind goes with it, the card's details close.
		await user().click(screen.getByTestId('doctor-onboarding-amenity-parking'));
		expect(screen.queryByRole('group', { name: 'Τι parking υπάρχει;' })).toBeNull();
		expect(handle.draft.edits.office).toMatchObject({ parking: false, parkingKinds: [] });
		await user().click(screen.getByTestId('doctor-onboarding-amenity-nearPublicTransport'));
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/payments', 6));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/office',
				method: 'POST',
				body: {
					amenities: {
						parking: false,
						parkingKinds: [],
						disabilityAccess: true,
						accessibleToilet: true,
						accessibleParking: false,
						elevator: false,
						nearPublicTransport: true
					}
				}
			}
		]);
		expect(handle.draft.edits.office).toBeUndefined();
	});

	it('Ε6 (negative): a detail without its parent never leaves — a kind kept in the memory with Parking off, a toilet with the access off, an elevator on the ground floor', async () => {
		server = atTheOffice({ phone: '2104123456', floor: 0 });
		server.missing = ['OFFICE_PAYMENTS'];
		draw('amenities', {
			prepare: (handle) =>
				handle.draft.update('office', {
					parking: false,
					parkingKinds: ['PRIVATE', 'STREET'],
					disabilityAccess: false,
					accessibleToilet: true,
					elevator: true
				})
		});
		await ready();
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toEqual({
			amenities: {
				parking: false,
				parkingKinds: [],
				disabilityAccess: false,
				accessibleToilet: false,
				accessibleParking: false,
				elevator: false,
				nearPublicTransport: false
			}
		});
	});

	it('(negative) «Τι θα βρουν» from a link while the phone is missing gives its place to «Πώς θα σας βρουν»', async () => {
		server = atTheOffice();
		draw('amenities');
		await waitFor(() => opened('/doctor/onboarding/office', 0, true));
	});
});

describe('38 · «Πώς μπορούν να πληρώσουν οι ασθενείς;» (record §6.8, 🔴 U-111.2)', () => {
	beforeEach(() => {
		server = atTheOffice({ phone: '2104123456', floor: 3 });
		server.missing = ['OFFICE_PAYMENTS', 'SERVICE_PRICING'];
	});

	it('🔴 U-111.2: exactly the five ways, no online one, one under the other; none chosen ⇒ «Επόμενο» locked; U-100', async () => {
		draw('payments');
		await ready();
		const group = screen.getByRole('group', { name: 'Τρόποι πληρωμής' });
		expect(group).toHaveClass('flex', 'flex-col');
		expect(group.className).not.toMatch(/grid-cols|flex-row|flex-wrap/u);
		const ways = within(group).getAllByRole('checkbox');
		expect(ways.map((way) => way.getAttribute('data-value'))).toEqual([
			'CASH',
			'CARD',
			'IRIS',
			'STUDENT_CARD',
			'UNEMPLOYMENT_CARD'
		]);
		expect(ways.map((way) => way.querySelector('.font-semibold')?.textContent)).toEqual([
			'Μετρητά',
			'Κάρτα',
			'IRIS',
			'Φοιτητική κάρτα',
			'Κάρτα ανεργίας'
		]);
		expect(group.textContent).not.toMatch(/online/iu);
		expect(next()).toBeDisabled();
		noHover(screen.getByTestId('doctor-onboarding-payments'));
	});

	it('the ways chosen go as the `paymentOptions` group, in their order; «Επόμενο» opens the price', async () => {
		draw('payments', { depth: 6 });
		await ready();
		await user().click(screen.getByTestId('doctor-onboarding-payment-IRIS'));
		await user().click(screen.getByTestId('doctor-onboarding-payment-CASH'));
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/price', 7));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/office',
				method: 'POST',
				body: { paymentOptions: ['CASH', 'IRIS'] }
			}
		]);
	});

	it('🔴 U-111.2 (negative): an online way the server still keeps is never shown, never sent back', async () => {
		server = atTheOffice({
			phone: '2104123456',
			paymentOptions: [
				'ONLINE_DOCTOR_PAY',
				'CARD'
			] as unknown as DoctorOnboardingOfficeFacts['paymentOptions']
		});
		server.missing = ['SERVICE_PRICING'];
		draw('payments');
		await ready();
		expect(screen.getByTestId('doctor-onboarding-payment-CARD')).toHaveAttribute(
			'aria-checked',
			'true'
		);
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toEqual({ paymentOptions: ['CARD'] });
	});
});
