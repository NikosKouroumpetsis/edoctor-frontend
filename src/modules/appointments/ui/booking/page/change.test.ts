import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { afterNavigate, goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import { bookingDoctorSample } from '$modules/appointments/lib/booking/booking.sample';
import { BookingDraft } from '$modules/appointments/ui/booking-draft';
import Harness from './booking.harness.svelte';
import type { BookingMobileParser } from '../types';

const SLUG = 'maria-triantafyllou';
const HINTS = 'office=off-a&date=2026-11-08&time=09%3A30&service=svc-simple';
const REVIEW = `/doctors/${SLUG}/booking?${HINTS}`;
const at = (step: string) => `/doctors/${SLUG}/booking/${step}?${HINTS}`;
const PROFILE = `/doctors/${SLUG}?${HINTS}`;

/** The draft as screen 30 left it: this doctor, this hour (a «Αλλαγή» is opened from there). */
function entered() {
	const draft = new BookingDraft();
	draft.enter(SLUG, { office: 'off-a', date: '2026-11-08', time: '09:30', service: 'svc-simple' });
	return draft;
}

type Step =
	| 'service'
	| 'for-whom'
	| 'relative'
	| 'details/phone'
	| 'details/code'
	| 'details/name'
	| 'details/birth-date';
type Call = { url: string; method: string; body?: Record<string, unknown> };
let calls: Call[];
let patient: Record<string, unknown>;
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

/** The sign-in's rule as the screen composes it, made simple: Greek mobiles only (69 + 8 digits). */
const toMobilePhone: BookingMobileParser = (dialCode, typed) => {
	const digits = typed.replace(/\D/gu, '');
	return dialCode === '+30' && /^69\d{8}$/u.test(digits) ? `+30${digits}` : null;
};

beforeEach(() => {
	calls = [];
	patient = {
		id: 'pat-1',
		firstName: 'Ελένη',
		lastName: 'Παππά',
		loginPhoneVerified: false,
		loginPhoneMasked: null,
		relatives: [{ id: 'rel-1', firstName: 'Πέτρος', lastName: 'Μάρκου' }]
	};
	answers = {};
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
			const path = new URL(url, 'https://api.test').pathname;
			const answer = answers[`${method} ${path.replace(/^\/api\/v\d+/u, '')}`];
			if (answer) return answer();
			if (path.endsWith('/patient/me')) return json(patient);
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
	step: Step,
	{
		start = 'member',
		draft = entered(),
		toasts = new ToastState(),
		depth = 0,
		doctor = bookingDoctorSample
	}: {
		start?: SessionStatus;
		draft?: BookingDraft;
		toasts?: ToastState;
		depth?: number;
		doctor?: typeof bookingDoctorSample;
	} = {}
) {
	const handle: { session?: Session; signIn?: () => void } = {};
	page.url = new URL(`https://edoctor.test${at(step)}`) as typeof page.url;
	page.state = depth ? { booking: { depth } } : {};
	const go = vi.spyOn(history, 'go').mockImplementation(() => {});
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				start,
				draft,
				toasts,
				onReady: (ready: { session: Session; signIn: () => void }) => Object.assign(handle, ready),
				change: {
					step,
					props: {
						slug: SLUG,
						locale: 'el',
						href: (path: string) => path,
						profileHref: PROFILE,
						serviceId: 'svc-simple',
						doctor,
						toMobilePhone
					}
				}
			}
		}
	});
	return { draft, toasts, go, handle };
}

const user = () => userEvent.setup({ delay: null });
const save = () => screen.getByTestId('booking-save');
const cancel = () => screen.getByTestId('booking-cancel');
const writes = () => calls.filter((call) => call.method !== 'GET');
const noHover = (root: Element) => {
	for (const node of [root, ...root.querySelectorAll('*')]) {
		expect([...node.classList].filter((name) => name.includes('hover:'))).toEqual([]);
	}
};

describe('«Επιλέξτε υπηρεσία» (record §3.3, U-103.2)', () => {
	it('W8-Δ1: a short «Αλλαγή» screen is white to the bottom — the screen’s height below 744, less the bar’s from 744', () => {
		draw('service');
		expect(document.querySelector('[data-slot="booking-change-screen"]')).toHaveClass(
			'bg-card',
			'min-h-dvh',
			'tablet:min-h-page'
		);
	});

	it('U-102 / U-110.2 / U-104.2 / D-W3-27: a screen of its own — ONE choice, a card per service one under the other, its length and fee; «Αποθήκευση» fully round; no colour under the pointer', () => {
		draw('service');
		expect(
			screen.getByRole('heading', { level: 1, name: 'Επιλέξτε υπηρεσία' })
		).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).toBeNull();
		const group = screen.getByRole('radiogroup', { name: 'Επιλέξτε υπηρεσία' });
		expect(group).toHaveClass('flex', 'flex-col');
		expect(group.className).not.toMatch(/grid-cols/u);
		const cards = within(group).getAllByRole('radio');
		expect(cards.map((card) => card.getAttribute('aria-checked'))).toEqual([
			'true',
			'false',
			'false'
		]);
		expect(cards[0]).toHaveTextContent('Απλή επίσκεψη');
		expect(cards[0]).toHaveTextContent('30 λεπτά');
		expect(cards[0]).toHaveTextContent('140');
		expect(cards[1]).toHaveTextContent('60 λεπτά');
		noHover(group);
		noHover(document.querySelector('[data-slot="booking-change-bar"]') as Element);
		expect(save()).toHaveClass('rounded-full');
	});

	it('«Αποθήκευση» writes the service into the draft and goes back one step (screen 30 checks the hour again)', async () => {
		const { draft, go } = draw('service', { depth: 1 });
		await user().click(screen.getByRole('radio', { name: /Πλήρης έλεγχος/u }));
		expect(draft.serviceId).toBe('svc-simple');
		await user().click(save());
		expect(draft.serviceId).toBe('svc-full');
		expect(go).toHaveBeenCalledWith(-1);
	});

	it('🔴 review w3-w3 R1 MINOR-5 (U-112.2, D-W3-31): after a reload the entry still knows its step — «Αποθήκευση» goes BACK to screen 30, never a second entry the browser’s «back» would undo', async () => {
		history.replaceState({ 'sveltekit:states': { booking: { depth: 1 } } }, '');
		try {
			const { draft, go } = draw('service', { depth: 0 });
			await user().click(screen.getByRole('radio', { name: /Πλήρης έλεγχος/u }));
			await user().click(save());
			expect(draft.serviceId).toBe('svc-full');
			expect(go).toHaveBeenCalledWith(-1);
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
		} finally {
			history.replaceState(null, '');
		}
	});

	it('«Άκυρο» writes nothing; opened from a link it gives its place to screen 30', async () => {
		const { draft } = draw('service');
		await user().click(screen.getByRole('radio', { name: /Πλήρης έλεγχος/u }));
		await user().click(cancel());
		expect(draft.serviceId).toBe('svc-simple');
		expect(vi.mocked(goto)).toHaveBeenCalledWith(REVIEW, { replaceState: true });
	});

	it('U-34.4 (negative): a guest sees the services with the lock, never an amount', () => {
		draw('service', { start: 'guest', doctor: { ...bookingDoctorSample, pricingVisible: false } });
		const group = screen.getByRole('radiogroup');
		expect(group).not.toHaveTextContent('€');
		expect(within(group).getAllByText('Συνδεθείτε για κόστος')).toHaveLength(3);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});
});

describe('«Για ποιον είναι το ραντεβού;» (record §3.3)', () => {
	it('«Για μένα» and every relative, one under the other; another one saved becomes the visitor', async () => {
		const { draft, go } = draw('for-whom', { depth: 1 });
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		expect(
			within(group)
				.getAllByRole('radio')
				.map((card) => card.textContent?.trim())
		).toEqual(['Για μένα', 'Πέτρος Μάρκου']);
		await user().click(within(group).getByRole('radio', { name: 'Πέτρος Μάρκου' }));
		await user().click(save());
		expect(draft.visitor).toEqual({ kind: 'relative', relativeId: 'rel-1' });
		expect(go).toHaveBeenCalledWith(-1);
	});

	it('🔴 U-139.5 (P-W4 Σ-15, the application’s booking): a relative wears the word of their relationship and gender under the name; «Για μένα» alone; (negative) a relative without a relationship has no line', async () => {
		patient.relatives = [
			{ id: 'rel-1', firstName: 'Πέτρος', lastName: 'Μάρκου' },
			{
				id: 'rel-2',
				firstName: 'Άννα',
				lastName: 'Παππά',
				relationship: 'PARENT',
				gender: 'FEMALE'
			},
			{
				id: 'rel-3',
				firstName: 'Άλεξ',
				lastName: 'Παππά',
				relationship: 'CHILD',
				gender: 'NON_BINARY'
			}
		];
		draw('for-whom', { depth: 1 });
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		expect(
			within(group)
				.getAllByRole('radio')
				.map((card) => card.textContent?.replace(/\s+/gu, ' ').trim())
		).toEqual(['Για μένα', 'Πέτρος Μάρκου', 'Άννα Παππά Μητέρα', 'Άλεξ Παππά Παιδί']);
	});

	it('U-102: «Προσθήκη συγγενή» is a link to «Νέος συγγενής», opened as one more step', async () => {
		draw('for-whom', { depth: 1 });
		const add = await screen.findByRole('link', { name: 'Προσθήκη συγγενή' });
		expect(add).toHaveAttribute('href', at('relative'));
		await user().click(add);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(at('relative'), {
			state: { booking: { depth: 2 } }
		});
	});

	it('the relative just added is chosen until «Αποθήκευση»; «Άκυρο» keeps nobody new', async () => {
		const draft = entered();
		draft.pendingVisitor = 'rel-1';
		draw('for-whom', { draft, depth: 1 });
		expect(await screen.findByRole('radio', { name: 'Πέτρος Μάρκου' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		await user().click(cancel());
		expect(draft.pendingVisitor).toBeNull();
		expect(draft.visitor).toEqual({ kind: 'self' });
	});

	it('(negative) a guest has no one to choose: the screen gives its place to screen 30, whose button signs in', async () => {
		draw('for-whom', { start: 'guest' });
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(REVIEW, { replaceState: true })
		);
		expect(calls).toEqual([]);
	});
});

describe('«Νέος συγγενής» (record §3.3, P-A3 Σ5)', () => {
	async function fill(values: Record<string, string>) {
		const u = user();
		for (const [testId, value] of Object.entries(values)) {
			await u.type(screen.getByTestId(`booking-relative-${testId}`), value);
		}
	}
	async function choose(testId: string, option: string) {
		await user().click(screen.getByTestId(`booking-relative-${testId}`));
		await user().click(await screen.findByRole('option', { name: option }));
	}

	it('every refusal is said before the write — the names, the relationship, the gender — and nothing is sent', async () => {
		draw('relative', { depth: 2 });
		await user().click(save());
		expect(screen.getByText('Συμπληρώστε το όνομα.')).toBeInTheDocument();
		expect(screen.getByText('Συμπληρώστε το επώνυμο.')).toBeInTheDocument();
		expect(screen.getByText('Επιλέξτε σχέση.')).toBeInTheDocument();
		expect(screen.getByText('Επιλέξτε φύλο.')).toBeInTheDocument();
		expect(writes()).toEqual([]);
	});

	it('a saved relative goes back to «Για ποιον…» CHOSEN, with «Ο/Η … προστέθηκε και επιλέχθηκε.»', async () => {
		answers['POST /patient/pat-1/relatives'] = () =>
			json({ id: 'rel-2', patientId: 'pat-1', firstName: 'Άννα', lastName: 'Παππά' }, 201);
		const { draft, toasts, go } = draw('relative', { depth: 2 });
		await screen.findByTestId('booking-relative-first-name');
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		// U-121.3: a synthetic ΑΜΚΑ of a real date (01/01) whose last digit fails Luhn (never a person's number).
		await fill({ 'first-name': '  Άννα ', 'last-name': 'Παππά', amka: '01019012345' });
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Γυναίκα');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toEqual({
			firstName: 'Άννα',
			lastName: 'Παππά',
			relationship: 'CHILD',
			gender: 'FEMALE',
			phone: null,
			email: null,
			amka: '01019012345',
			afm: null
		});
		await waitFor(() => expect(draft.pendingVisitor).toBe('rel-2'));
		expect(toasts.current?.message).toBe('Ο/Η Άννα Παππά προστέθηκε και επιλέχθηκε.');
		expect(go).toHaveBeenCalledWith(-1);
	});

	it('🔴 U-139.5: the toast says the new relative with the article of the gender the server keeps — «Η Άννα Παππά προστέθηκε και επιλέχθηκε.»', async () => {
		answers['POST /patient/pat-1/relatives'] = () =>
			json(
				{
					id: 'rel-2',
					patientId: 'pat-1',
					firstName: 'Άννα',
					lastName: 'Παππά',
					relationship: 'CHILD',
					gender: 'FEMALE'
				},
				201
			);
		const { toasts } = draw('relative', { depth: 2 });
		await screen.findByTestId('booking-relative-first-name');
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		await fill({ 'first-name': 'Άννα', 'last-name': 'Παππά' });
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Γυναίκα');
		await user().click(save());
		await waitFor(() =>
			expect(toasts.current?.message).toBe('Η Άννα Παππά προστέθηκε και επιλέχθηκε.')
		);
	});

	it('🔴 U-139.6: under the mobile, who it is for — the office calls the relative, the notifications reach the account', () => {
		draw('relative', { depth: 2 });
		expect(screen.getByTestId('booking-relative')).toHaveTextContent(
			'Για να μπορεί το ιατρείο να καλέσει τον συγγενή σας. Τις ειδοποιήσεις για το ραντεβού τις λαμβάνετε εσείς.'
		);
	});

	it('🔴 U-65.6 (negative): hostile names stay text and stop at 100; a wrong ΑΜΚΑ, ΑΦΜ, email or mobile is said, nothing is sent', async () => {
		draw('relative', { depth: 2 });
		const first = screen.getByTestId('booking-relative-first-name');
		expect(first).toHaveAttribute('maxlength', '100');
		// W8 Delta 2 (MINOR-1, the orchestrator's): ΑΜΚΑ / ΑΦΜ stop at 11 / 9 by keeping their digits, never by a
		// `maxlength` that would cut a pasted «123 456 783» before its spaces go (the paste tests below hold the limit).
		expect(screen.getByTestId('booking-relative-amka')).not.toHaveAttribute('maxlength');
		expect(screen.getByTestId('booking-relative-afm')).not.toHaveAttribute('maxlength');
		await fill({
			'first-name': '<img src=x onerror=alert(1)>',
			'last-name': 'Παππά',
			amka: '123',
			afm: '12a',
			email: 'not-an-email',
			phone: '12345'
		});
		await choose('relationship', 'Γονέας');
		await choose('gender', 'Άλλο');
		await user().click(save());
		expect(first).toHaveValue('<img src=x onerror=alert(1)>');
		expect(document.querySelector('img[src="x"]')).toBeNull();
		expect(screen.getByText('Το ΑΜΚΑ έχει 11 ψηφία.')).toBeInTheDocument();
		expect(screen.getByText('Το ΑΦΜ έχει 9 ψηφία.')).toBeInTheDocument();
		expect(screen.getByText('Συμπληρώστε ένα έγκυρο email.')).toBeInTheDocument();
		expect(screen.getByText('Συμπληρώστε έγκυρο αριθμό κινητού.')).toBeInTheDocument();
		expect(writes()).toEqual([]);
	});

	it('MINOR-3 / U-65.6: the mobile stops at 16 and the email at 120', () => {
		draw('relative', { depth: 2 });
		expect(screen.getByTestId('booking-relative-phone')).toHaveAttribute('maxlength', '16');
		expect(screen.getByTestId('booking-relative-email')).toHaveAttribute('maxlength', '120');
	});

	it('🔴 review w3-w3 R1 MAJOR-1 (U-84, U-112.2): a 401 on «Αποθήκευση» opens the sign-in over the form — what was typed stays, there and after it', async () => {
		answers['POST /patient/pat-1/relatives'] = () => refusal(401, 'Unauthorized');
		const { handle } = draw('relative', { depth: 2 });
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		await fill({ 'first-name': 'Άννα', 'last-name': 'Παππά', email: 'anna@example.test' });
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Γυναίκα');
		await user().click(save());
		await waitFor(() => expect(handle.session?.flowOpen).toBe(true));
		expect(handle.session?.status).toBe('guest');
		handle.signIn?.();
		await waitFor(() => expect(handle.session?.status).toBe('member'));
		expect(screen.getByTestId('booking-relative-first-name')).toHaveValue('Άννα');
		expect(screen.getByTestId('booking-relative-last-name')).toHaveValue('Παππά');
		expect(screen.getByTestId('booking-relative-email')).toHaveValue('anna@example.test');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 D-W3-32 / A-4: the 21st relative (422 + its marker) has its own words; any other 422 the general ones; too many writes theirs — nobody is chosen', async () => {
		const { draft } = draw('relative', { depth: 2 });
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		await fill({ 'first-name': 'Άννα', 'last-name': 'Παππά' });
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Γυναίκα');
		for (const [answer, words] of [
			[
				() => refusal(422, 'Too many relatives: PATIENT_RELATIVES_LIMIT_REACHED'),
				'Έχετε φτάσει τον μέγιστο αριθμό συγγενών.'
			],
			[
				() => refusal(422, 'amka must match pattern'),
				'Ελέγξτε τα στοιχεία που συμπληρώσατε και δοκιμάστε ξανά.'
			],
			[() => refusal(429, 'Too many requests'), 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.']
		] as const) {
			answers['POST /patient/pat-1/relatives'] = answer;
			await user().click(save());
			await waitFor(() =>
				expect(screen.getByTestId('booking-relative-failure')).toHaveTextContent(words)
			);
		}
		expect(draft.pendingVisitor).toBeNull();
	});

	it('🔴 W8-Σ2 (negative): a last name the server refuses («μόνο γράμματα», it names no field) marks the names where they are and keeps its words below; a changed name lets its mark go; a refused ΑΜΚΑ marks only itself; the phone’s rule says the mobile’s own words — nobody is chosen', async () => {
		const { draft } = draw('relative', { depth: 2 });
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		// U-121.2: «Κύματος Τρία» is refused before the write now (its own test below); names the client takes, which the
		// server still refuses here, keep the server's words read where they are.
		await fill({ 'first-name': 'Δοκιμή', 'last-name': 'Κύματος' });
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Άλλο');
		const field = (testId: string) => screen.getByTestId(`booking-relative-${testId}`);
		const general = 'Ελέγξτε τα στοιχεία που συμπληρώσατε και δοκιμάστε ξανά.';

		answers['POST /patient/pat-1/relatives'] = () =>
			refusal(422, 'Entity Validation Error: Το πεδίο μπορεί να περιέχει μόνο γράμματα.');
		await user().click(save());
		await waitFor(() =>
			expect(screen.getByTestId('booking-relative-failure')).toHaveTextContent(general)
		);
		expect(field('first-name')).toHaveAttribute('aria-invalid', 'true');
		expect(field('last-name')).toHaveAttribute('aria-invalid', 'true');
		expect(field('amka')).not.toHaveAttribute('aria-invalid');
		expect(field('email')).not.toHaveAttribute('aria-invalid');
		await user().clear(field('last-name'));
		await user().type(field('last-name'), 'Τρία');
		expect(field('last-name')).not.toHaveAttribute('aria-invalid');
		expect(field('first-name')).toHaveAttribute('aria-invalid', 'true');

		answers['POST /patient/pat-1/relatives'] = () =>
			refusal(422, 'Entity Validation Error: amka has an invalid date prefix.');
		await user().type(field('amka'), '01019012345');
		await user().click(save());
		await waitFor(() => expect(field('amka')).toHaveAttribute('aria-invalid', 'true'));
		expect(field('first-name')).not.toHaveAttribute('aria-invalid');
		expect(field('last-name')).not.toHaveAttribute('aria-invalid');
		expect(screen.getByTestId('booking-relative-failure')).toHaveTextContent(general);

		answers['POST /patient/pat-1/relatives'] = () =>
			refusal(422, 'Entity Validation Error: Μη έγκυρος κωδικός χώρας για το τηλέφωνο.');
		await user().clear(field('amka'));
		await user().type(field('phone'), '6912345678');
		await user().click(save());
		expect(await screen.findByText('Συμπληρώστε έγκυρο αριθμό κινητού.')).toBeInTheDocument();
		expect(field('amka')).not.toHaveAttribute('aria-invalid');
		expect(draft.pendingVisitor).toBeNull();
	});

	/** The words under a field: the message its `aria-describedby` names (none when it names nothing). */
	const messageOf = (input: HTMLElement) =>
		document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent?.trim() ??
		'';

	it('🔴 U-121.2 (negative): two names, a hyphen or an apostrophe is said under ITS field before the write — «Συμπληρώστε ένα … μόνο με γράμματα.» — nothing is sent; an emptied name keeps «Συμπληρώστε το …»; one word each is sent', async () => {
		answers['POST /patient/pat-1/relatives'] = () =>
			json({ id: 'rel-4', patientId: 'pat-1', firstName: 'Άννα', lastName: 'Κύματος' }, 201);
		draw('relative', { depth: 2 });
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		const first = screen.getByTestId('booking-relative-first-name');
		const last = screen.getByTestId('booking-relative-last-name');
		await fill({ 'first-name': 'Anna-Maria', 'last-name': 'Κύματος Τρία' });
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Γυναίκα');
		await user().click(save());
		expect(messageOf(first)).toBe('Συμπληρώστε ένα όνομα, μόνο με γράμματα.');
		expect(messageOf(last)).toBe('Συμπληρώστε ένα επώνυμο, μόνο με γράμματα.');
		expect(first).toHaveAttribute('aria-invalid', 'true');
		expect(last).toHaveAttribute('aria-invalid', 'true');
		expect(screen.queryByText('Όπως αναγράφεται στην ταυτότητα.')).toBeNull();
		expect(writes()).toEqual([]);

		await user().clear(first);
		await user().type(first, "O'Brien");
		await user().click(save());
		expect(messageOf(first)).toBe('Συμπληρώστε ένα όνομα, μόνο με γράμματα.');
		await user().clear(last);
		expect(messageOf(last)).toBe('Συμπληρώστε το επώνυμο.');
		expect(writes()).toEqual([]);

		await user().clear(first);
		await user().type(first, ' Άννα ');
		await user().type(last, 'Κύματος');
		expect(messageOf(first)).toBe('');
		expect(last).not.toHaveAttribute('aria-invalid');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toMatchObject({ firstName: 'Άννα', lastName: 'Κύματος' });
	});

	it('🔴 U-121.3 (negative): an ΑΜΚΑ with no real date or an ΑΦΜ with a wrong check digit is said under it before the write — nothing is sent; 29 February and the right check digit are sent (synthetic numbers only)', async () => {
		answers['POST /patient/pat-1/relatives'] = () =>
			json({ id: 'rel-5', patientId: 'pat-1', firstName: 'Άννα', lastName: 'Παππά' }, 201);
		draw('relative', { depth: 2 });
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		const amka = screen.getByTestId('booking-relative-amka');
		const afm = screen.getByTestId('booking-relative-afm');
		await fill({
			'first-name': 'Άννα',
			'last-name': 'Παππά',
			amka: '30029012345',
			afm: '123456789'
		});
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Γυναίκα');
		await user().click(save());
		expect(messageOf(amka)).toBe('Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.');
		expect(messageOf(afm)).toBe('Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.');
		expect(amka).toHaveAttribute('aria-invalid', 'true');
		expect(afm).toHaveAttribute('aria-invalid', 'true');
		expect(writes()).toEqual([]);

		// A wrong length still says the length's words, first.
		await user().clear(amka);
		await user().type(amka, '3002901234');
		expect(messageOf(amka)).toBe('Το ΑΜΚΑ έχει 11 ψηφία.');
		await user().clear(amka);
		await user().type(amka, '13139012345');
		await user().click(save());
		expect(messageOf(amka)).toBe('Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.');
		expect(writes()).toEqual([]);

		await user().clear(amka);
		await user().type(amka, '29029012345');
		await user().clear(afm);
		await user().type(afm, '123456783');
		// Valid again: the helper line is back under each.
		expect(messageOf(amka)).toBe('11 ψηφία.');
		expect(messageOf(afm)).toBe('9 ψηφία.');
		expect(afm).not.toHaveAttribute('aria-invalid');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toMatchObject({ amka: '29029012345', afm: '123456783' });
	});

	// Rewrites «W8 Delta 1 (negative): a ΑΜΚΑ the server refuses (its date) says «Το ΑΜΚΑ έχει 11 ψηφία.» …»: U-121.3
	// gives the date its own words.
	it('U-121.3 (negative): a ΑΜΚΑ the server refuses for its date says «Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.» UNDER it, marked, until it changes; for its length «Το ΑΜΚΑ έχει 11 ψηφία.»; a refusal of another field (ΑΦΜ) never says either — nobody is chosen', async () => {
		const { draft } = draw('relative', { depth: 2 });
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		const amka = screen.getByTestId('booking-relative-amka');
		const invalid = 'Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.';
		await fill({ 'first-name': 'Άννα', 'last-name': 'Παππά', amka: '01a019012345' });
		expect(amka).toHaveValue('01019012345');
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Γυναίκα');
		answers['POST /patient/pat-1/relatives'] = () =>
			refusal(422, 'Entity Validation Error: amka has an invalid date prefix.');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toMatchObject({ amka: '01019012345' });
		expect(await screen.findByText(invalid)).toBeInTheDocument();
		expect(messageOf(amka)).toBe(invalid);
		expect(amka).toHaveAttribute('aria-invalid', 'true');
		await user().clear(amka);
		await user().type(amka, '02029012345');
		expect(screen.queryByText(invalid)).toBeNull();
		expect(amka).not.toHaveAttribute('aria-invalid');

		answers['POST /patient/pat-1/relatives'] = () =>
			refusal(422, 'Entity Validation Error: amka must be exactly 11 digits.');
		await user().click(save());
		await waitFor(() => expect(messageOf(amka)).toBe('Το ΑΜΚΑ έχει 11 ψηφία.'));
		expect(amka).toHaveAttribute('aria-invalid', 'true');

		answers['POST /patient/pat-1/relatives'] = () =>
			refusal(422, 'Entity Validation Error: afm is not a valid Greek tax identification number.');
		await user().clear(amka);
		await user().type(amka, '03039012345');
		await user().type(screen.getByTestId('booking-relative-afm'), '123456783');
		await user().click(save());
		expect(
			await screen.findByText('Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.')
		).toBeInTheDocument();
		expect(screen.queryByText(invalid)).toBeNull();
		expect(screen.queryByText('Το ΑΜΚΑ έχει 11 ψηφία.')).toBeNull();
		expect(amka).not.toHaveAttribute('aria-invalid');
		expect(draft.pendingVisitor).toBeNull();
	});

	// Rewrites «W8 Delta 1 (negative): … a ΑΦΜ the server refuses (its check digit) says «Το ΑΦΜ έχει 9 ψηφία.» …»:
	// U-121.3 gives the check digit its own words; the numbers are synthetic (the rule's), never a real one.
	it('U-121.3 (negative): the ΑΦΜ takes only digits as it is typed or pasted; a ΑΦΜ the server refuses (its check digit) says «Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.» UNDER it, marked, until it changes — nobody is chosen', async () => {
		const { draft } = draw('relative', { depth: 2 });
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		const afm = screen.getByTestId('booking-relative-afm');
		const invalid = 'Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.';
		await user().type(afm, '12a3');
		expect(afm).toHaveValue('123');
		// W8 Delta 2: a real paste of «123 456 783» (11 characters) keeps its 9 digits; one too long stops at 9 (U-65.6).
		await user().clear(afm);
		await user().paste('123 456 783');
		expect(afm).toHaveValue('123456783');
		await user().clear(afm);
		await user().paste('EL 123-456 783 999');
		expect(afm).toHaveValue('123456783');
		await fill({ 'first-name': 'Άννα', 'last-name': 'Παππά' });
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Γυναίκα');
		answers['POST /patient/pat-1/relatives'] = () =>
			refusal(422, 'Entity Validation Error: afm is not a valid Greek tax identification number.');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toMatchObject({ afm: '123456783' });
		expect(await screen.findByText(invalid)).toBeInTheDocument();
		expect(messageOf(afm)).toBe(invalid);
		expect(afm).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByTestId('booking-relative-failure')).toHaveTextContent(
			'Ελέγξτε τα στοιχεία που συμπληρώσατε και δοκιμάστε ξανά.'
		);
		await user().clear(afm);
		await user().type(afm, '111111114');
		expect(screen.queryByText(invalid)).toBeNull();
		expect(screen.queryByText('Το ΑΦΜ έχει 9 ψηφία.')).toBeNull();
		expect(afm).not.toHaveAttribute('aria-invalid');
		expect(draft.pendingVisitor).toBeNull();
	});

	it('A7 (negative): the ΑΜΚΑ takes only digits as it is typed or pasted — «12a3» shows «123», a pasted «1204-8512 345x» its eleven digits — and only those are sent', async () => {
		answers['POST /patient/pat-1/relatives'] = () =>
			json({ id: 'rel-3', patientId: 'pat-1', firstName: 'Άννα', lastName: 'Παππά' }, 201);
		draw('relative', { depth: 2 });
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		const amka = screen.getByTestId('booking-relative-amka');
		await user().type(amka, '12a3');
		expect(amka).toHaveValue('123');
		// W8 Delta 2: a real paste, spaces and dashes in it, and one too long: its digits, eleven at most (U-65.6).
		await user().clear(amka);
		await user().paste('1204851234567890');
		expect(amka).toHaveValue('12048512345');
		await user().clear(amka);
		await user().paste('1204-8512 345x');
		expect(amka).toHaveValue('12048512345');
		await fill({ 'first-name': 'Άννα', 'last-name': 'Παππά' });
		await choose('relationship', 'Παιδί');
		await choose('gender', 'Γυναίκα');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toMatchObject({ amka: '12048512345', afm: null });
	});
});

describe('«Το κινητό σας» and «Επιβεβαιώστε το κινητό σας» (record §3.3, D-04 / D-05)', () => {
	it('(negative) a number the sign-in would refuse is said under the field; nothing is sent', async () => {
		draw('details/phone', { depth: 1 });
		expect(save()).toHaveTextContent('Συνέχεια');
		await user().type(screen.getByLabelText('Κινητό τηλέφωνο'), '12345');
		await user().click(save());
		expect(screen.getByText('Συμπληρώστε έγκυρο κινητό τηλέφωνο.')).toBeInTheDocument();
		expect(writes()).toEqual([]);
	});

	it('🔴 D-47: a code goes to the number; only its MASK stays, and the code screen opens one more step on', async () => {
		answers['POST /auth/login-phone/me/start'] = () => json({ alreadyVerified: false });
		const { draft } = draw('details/phone', { depth: 1 });
		await user().type(screen.getByLabelText('Κινητό τηλέφωνο'), '6912345678');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toEqual({ mobilePhone: '+306912345678' });
		await waitFor(() => expect(draft.phoneDestination).toBe('+30 69•• ••• 678'));
		expect(JSON.stringify(draft)).not.toContain('6912345678');
		expect(vi.mocked(goto)).toHaveBeenCalledWith(at('details/code'), {
			state: { booking: { depth: 2 } }
		});
	});

	it('record §3.3: a number of another account (409) is said under the field', async () => {
		answers['POST /auth/login-phone/me/start'] = () => refusal(409, 'Conflict');
		draw('details/phone', { depth: 1 });
		await user().type(screen.getByLabelText('Κινητό τηλέφωνο'), '6912345678');
		await user().click(save());
		expect(
			await screen.findByText('Αυτό το κινητό χρησιμοποιείται ήδη σε άλλον λογαριασμό.')
		).toBeInTheDocument();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('a number already the account’s sends no code: straight back to screen 30, told so', async () => {
		answers['POST /auth/login-phone/me/start'] = () => json({ alreadyVerified: true });
		const { toasts, go } = draw('details/phone', { depth: 1 });
		await user().type(screen.getByLabelText('Κινητό τηλέφωνο'), '6912345678');
		await user().click(save());
		await waitFor(() =>
			expect(toasts.current?.message).toBe('Το κινητό σας είναι ήδη επιβεβαιωμένο.')
		);
		expect(go).toHaveBeenCalledWith(-1);
	});

	it('the code: the mask in the sentence, «Επιβεβαίωση» locked until 6 digits; a spent code goes back to screen 30 — two steps — told so', async () => {
		answers['POST /auth/login-phone/me/verify'] = () => json({});
		const draft = entered();
		draft.phoneDestination = '+30 69•• ••• 678';
		draft.phoneResendAt = Date.now() + 60_000;
		const toasts = new ToastState();
		const { go } = draw('details/code', { draft, toasts, depth: 2 });
		expect(
			screen.getByText('Στείλαμε έναν κωδικό 6 ψηφίων στο +30 69•• ••• 678.')
		).toBeInTheDocument();
		expect(save()).toBeDisabled();
		await user().type(screen.getByTestId('booking-code-input'), '123456');
		expect(save()).toBeEnabled();
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toEqual({ code: '123456' });
		await waitFor(() =>
			expect(toasts.current?.message).toBe(
				'Το κινητό σας επιβεβαιώθηκε. Δεν θα σας το ξαναζητήσουμε.'
			)
		);
		expect(go).toHaveBeenCalledWith(-2);
		expect(draft.phoneDestination).toBeNull();
	});

	it('(negative) a wrong code is said and the boxes empty; a lock is said too', async () => {
		const draft = entered();
		draft.phoneDestination = '+30 69•• ••• 678';
		draw('details/code', { draft, depth: 2 });
		for (const [answer, words] of [
			[
				() => refusal(400, 'Invalid code', 'EC011'),
				'Ο κωδικός δεν είναι σωστός. Ελέγξτε τον και δοκιμάστε ξανά.'
			],
			[
				() => refusal(403, 'Locked', 'USER_LOCKED'),
				'Ο λογαριασμός σας είναι προσωρινά κλειδωμένος.'
			]
		] as const) {
			answers['POST /auth/login-phone/me/verify'] = answer;
			await user().type(screen.getByTestId('booking-code-input'), '000000');
			await user().click(save());
			await waitFor(() =>
				expect(screen.getByTestId('booking-code-error')).toHaveTextContent(words)
			);
			expect(screen.getByTestId('booking-code-input')).toHaveValue('');
		}
	});

	it('«Αποστολή νέου κωδικού»: 60″ apart by our own clock — before that it says the seconds and sends nothing', async () => {
		answers['POST /auth/login-phone/me/resend'] = () => json({ alreadyVerified: false });
		const draft = entered();
		draft.phoneDestination = '+30 69•• ••• 678';
		draft.phoneResendAt = Date.now() + 30_000;
		draw('details/code', { draft, depth: 2 });
		await user().click(screen.getByTestId('booking-code-resend'));
		expect(screen.getByTestId('booking-code-feedback')).toHaveTextContent(
			/Περιμένετε (29|30) δευτερόλεπτα για νέο κωδικό\./u
		);
		expect(writes()).toEqual([]);
		draft.phoneResendAt = Date.now() - 1;
		await user().click(screen.getByTestId('booking-code-resend'));
		await waitFor(() =>
			expect(screen.getByTestId('booking-code-feedback')).toHaveTextContent('Στάλθηκε νέος κωδικός')
		);
		expect(writes()).toHaveLength(1);
		expect(draft.phoneResendAt).toBeGreaterThan(Date.now() + 55_000);
	});

	it('a reload of the code (no code sent behind it) gives its place to «Το κινητό σας» — 🔴 D-W3-31 (review w3-w3 R1 MINOR-1): only after the page’s first navigation, never while it loads', async () => {
		draw('details/code', { depth: 0 });
		await Promise.resolve();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		const [[afterFirst]] = vi.mocked(afterNavigate).mock.calls as unknown as [[() => void]];
		afterFirst();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(at('details/phone'), { replaceState: true })
		);
		afterFirst();
		await Promise.resolve();
		expect(vi.mocked(goto)).toHaveBeenCalledTimes(1);
	});

	it('MINOR-3 / U-65.6: the mobile stops at 16 characters', () => {
		draw('details/phone', { depth: 1 });
		expect(screen.getByLabelText('Κινητό τηλέφωνο')).toHaveAttribute('maxlength', '16');
	});

	it('🔴 review w3-w3 R1 MAJOR-1 (U-84, U-112.2): a 401 on «Συνέχεια» opens the sign-in over the screen — the number stays typed, and after the sign-in it is still there', async () => {
		answers['POST /auth/login-phone/me/start'] = () => refusal(401, 'Unauthorized');
		const { handle } = draw('details/phone', { depth: 1 });
		const field = screen.getByLabelText('Κινητό τηλέφωνο');
		await user().type(field, '6912345678');
		await user().click(save());
		await waitFor(() => expect(handle.session?.flowOpen).toBe(true));
		expect(handle.session?.status).toBe('guest');
		await Promise.resolve();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		handle.signIn?.();
		await waitFor(() => expect(handle.session?.status).toBe('member'));
		expect(screen.getByLabelText('Κινητό τηλέφωνο')).toHaveValue('6912345678');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});
});

describe('«Το ονοματεπώνυμό σας» and «Ημερομηνία γέννησης (προαιρετικό)» (record §3.3)', () => {
	it('the name: the halves the person has fill in; both are written together, then back to screen 30', async () => {
		patient = { ...patient, firstName: 'Ελένη', lastName: null };
		const { go } = draw('details/name', { depth: 1 });
		await waitFor(() => expect(screen.getByTestId('booking-name-first')).toHaveValue('Ελένη'));
		await user().click(save());
		expect(screen.getByText('Συμπληρώστε το επώνυμό σας.')).toBeInTheDocument();
		expect(writes()).toEqual([]);
		await user().type(screen.getByTestId('booking-name-last'), '  Παππά ');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0]).toMatchObject({
			method: 'PATCH',
			body: { firstName: 'Ελένη', lastName: 'Παππά' }
		});
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
	});

	it('D-05: the date of birth is optional — no date writes NOTHING and goes back', async () => {
		const { go } = draw('details/birth-date', { depth: 1 });
		expect(
			screen.getByRole('heading', { level: 1, name: 'Ημερομηνία γέννησης (προαιρετικό)' })
		).toBeInTheDocument();
		await user().click(save());
		expect(writes()).toEqual([]);
		expect(go).toHaveBeenCalledWith(-1);
	});

	it('review w3-w3 R1 MINOR-4: a date left half or wrong is said and stays — nothing is written and the screen does not leave', async () => {
		const { go } = draw('details/birth-date', { depth: 1 });
		const u = user();
		// U-129.1: ONE date field (`type="date"`); «12/03/198» left half is the browser's `badInput`, no value.
		const field = screen.getByLabelText('Ημερομηνία γέννησης') as HTMLInputElement;
		expect(field).toHaveAttribute('type', 'date');
		Object.defineProperty(field, 'validity', {
			configurable: true,
			get: () => ({ badInput: true })
		});
		field.dispatchEvent(new Event('input', { bubbles: true }));
		Reflect.deleteProperty(field, 'validity');
		await u.click(save());
		expect(await screen.findByText('Δώστε μια έγκυρη ημερομηνία')).toBeInTheDocument();
		expect(writes()).toEqual([]);
		expect(go).not.toHaveBeenCalled();
	});

	it('🔴 U-65.6 (negative, MINOR-3): a name made of a tag stops at 100 and travels as text', async () => {
		patient = { ...patient, firstName: null, lastName: null };
		draw('details/name', { depth: 1 });
		const first = screen.getByTestId('booking-name-first');
		expect(first).toHaveAttribute('maxlength', '100');
		expect(screen.getByTestId('booking-name-last')).toHaveAttribute('maxlength', '100');
		await user().type(first, '<img src=x onerror=alert(1)>');
		await user().type(screen.getByTestId('booking-name-last'), 'Παππά');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toEqual({
			firstName: '<img src=x onerror=alert(1)>',
			lastName: 'Παππά'
		});
		expect(document.querySelector('img[src="x"]')).toBeNull();
	});

	it('🔴 review w3-w3 R1 MAJOR-1: a 401 on the name keeps both halves typed through the sign-in', async () => {
		patient = { ...patient, firstName: null, lastName: null };
		answers['PATCH /patient/me/profile'] = () => refusal(401, 'Unauthorized');
		const { handle } = draw('details/name', { depth: 1 });
		await user().type(screen.getByTestId('booking-name-first'), 'Ελένη');
		await user().type(screen.getByTestId('booking-name-last'), 'Παππά');
		await user().click(save());
		await waitFor(() => expect(handle.session?.flowOpen).toBe(true));
		handle.signIn?.();
		await waitFor(() => expect(handle.session?.status).toBe('member'));
		expect(screen.getByTestId('booking-name-first')).toHaveValue('Ελένη');
		expect(screen.getByTestId('booking-name-last')).toHaveValue('Παππά');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('(negative) a visitor who came as a guest still gives the screen’s place to screen 30', async () => {
		draw('details/name', { start: 'guest', depth: 1 });
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(REVIEW, { replaceState: true })
		);
	});

	it('a date travels as that day’s instant; the server’s refusal of it is said', async () => {
		answers['PATCH /patient/me/profile'] = () =>
			refusal(422, 'dateOfBirth is not a valid date of birth.');
		draw('details/birth-date', { depth: 1 });
		const u = user();
		await u.type(screen.getByLabelText('Ημερομηνία γέννησης'), '1988-03-12');
		await u.click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toEqual({ dateOfBirth: '1988-03-12T00:00:00.000Z' });
		expect(
			await screen.findByText(
				'Μη έγκυρη ημερομηνία γέννησης. Επιλέξτε ημερομηνία έως σήμερα και όχι παλαιότερη από 120 χρόνια.'
			)
		).toBeInTheDocument();
	});
});
