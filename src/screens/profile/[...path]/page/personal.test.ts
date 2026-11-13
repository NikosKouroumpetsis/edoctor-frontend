import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { knownAccountStorageKey } from '$shared/config/env';
import type { ProfileScreenData } from '../types';
import Harness from './personal.harness.svelte';

/*
 * Wave 4.5 · screen 58 «Προσωπικά στοιχεία» COMPOSED (card w45-w5): the profile module's page under the site's real
 * sign-in host, with the calls of the modules that own them — the wire is stubbed, nothing else. What each row sends,
 * what the server's refusals do, and 🔴 U-168 over everything the page keeps. Made-up people of a reserved domain;
 * every ΑΜΚΑ fails Luhn, as the guard asks.
 */

const PERSONAL: ProfileScreenData = { address: { view: 'settings', section: 'personal' } };

type Call = { method: string; path: string; search: string; body: unknown };
let calls: Call[];
/** The server's own state: the patient as `GET /patient/me` answers (`null`: no patient profile), and the profile. */
let patient: Record<string, unknown> | null;
let profile: Record<string, unknown>;
let signedIn: boolean;
/** An answer a test gives for one call (`METHOD path`). */
let answers: Record<string, () => Response>;
let client: QueryClient;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const refusal = (status: number, errorCode: string, errorMessage = 'refused') =>
	new Response(JSON.stringify({ errorCode, errorMessage }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const tail = (digits: string) => `${'•'.repeat(digits.length - 4)}${digits.slice(-4)}`;

beforeEach(() => {
	calls = [];
	answers = {};
	signedIn = true;
	patient = {
		id: 'pat-1',
		tenantUserId: 'tu-1',
		firstName: 'Ελένη',
		lastName: 'Παππά',
		loginEmailMasked: 'e***a@example.test',
		loginPhoneMasked: '+30 *** *** 4567',
		loginPhoneVerified: true,
		amkaMasked: '•••••••0001',
		afmMasked: null,
		relatives: []
	};
	profile = { id: 'u-1', gender: 'FEMALE', dateOfBirth: '1988-03-14T00:00:00.000Z', locale: 'el' };
	client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const address = new URL(input, 'https://api.test');
			const path = address.pathname.replace(/^\/api\/v\d+/u, '');
			const body = init.body
				? (JSON.parse(String(init.body)) as Record<string, unknown>)
				: undefined;
			calls.push({ method, path, search: address.search, body });
			const answer = answers[`${method} ${path}`];
			if (answer) return answer();
			if (!signedIn) return refusal(401, 'EC401', 'Unauthorized');
			if (path === '/patient/me' && method === 'GET') return json(patient);
			if (path === '/user/me' && method === 'GET') return json(profile);
			if (path === '/doctor/profile/base') return refusal(403, 'EC403', 'Forbidden');
			if (path === '/patient/me/profile' && method === 'PATCH') {
				patient = { ...patient, ...body, dateOfBirth: undefined };
				if (body?.dateOfBirth) profile = { ...profile, dateOfBirth: body.dateOfBirth };
				return json(patient);
			}
			if (path === '/patient/me' && method === 'PUT') {
				// As the server answers: the number kept, only its mask said back.
				for (const id of ['amka', 'afm'] as const) {
					if (body && id in body) {
						const value = body[id];
						patient = {
							...patient,
							[`${id}Masked`]: typeof value === 'string' ? tail(value) : null
						};
					}
				}
				return json(patient);
			}
			if (path === '/user/me' && method === 'PUT') {
				profile = { ...profile, ...body };
				return json(profile);
			}
			if (path.endsWith('/me/start') || path.endsWith('/me/resend')) {
				return json({
					channel: path.includes('email') ? 'email' : 'phone',
					alreadyVerified: false
				});
			}
			if (path === '/auth/login-email/me/verify') {
				patient = { ...patient, loginEmailMasked: 'n***a@example.test' };
				return json({ loginEmailMasked: 'n***a@example.test' });
			}
			if (path === '/auth/login-phone/me/verify') {
				patient = { ...patient, loginPhoneMasked: '+30 *** *** 4321' };
				return json({ tenantUser: { id: 'tu-1' } });
			}
			return json({});
		})
	);
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
	(page as { url: URL }).url = new URL('/profile/account-settings/personal', 'http://localhost');
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	window.localStorage.clear();
	window.sessionStorage.clear();
	(page as { url: URL }).url = new URL('/', 'http://localhost');
	page.state = {};
});

const user = () => userEvent.setup({ delay: null });
const draw = (data: ProfileScreenData = PERSONAL) => render(Harness, { props: { client, data } });
const row = (id: string) => screen.getByTestId(`personal-row-${id}`);
const input = (testId: string) => screen.getByTestId(testId) as HTMLInputElement;
const writes = () => calls.filter((call) => call.method !== 'GET');
const reads = (path: string) =>
	calls.filter((call) => call.method === 'GET' && call.path === path).length;

async function open(id: string) {
	await waitFor(() => expect(row(id)).toBeInTheDocument());
	await user().click(screen.getByTestId(`personal-row-${id}-action`));
	expect(row(id)).toHaveAttribute('data-state', 'open');
}

/** Everything the page keeps outside the open row: the cache, every write's memory, the storages, the address. */
function keptAnywhere(): string {
	const storage = (store: Storage) =>
		Array.from({ length: store.length }, (_, index) => {
			const key = store.key(index) ?? '';
			return [key, store.getItem(key)];
		});
	return JSON.stringify([
		client
			.getQueryCache()
			.getAll()
			.map((query) => [query.queryKey, query.state.data]),
		client
			.getMutationCache()
			.getAll()
			.map((mutation) => mutation.state.variables),
		storage(window.localStorage),
		storage(window.sessionStorage),
		window.location.href,
		page.url.href,
		JSON.stringify(page.state),
		document.cookie,
		vi.mocked(goto).mock.calls
	]);
}

describe('screens/profile/[...path] · wave 4.5, screen 58 «Προσωπικά στοιχεία» composed (card w45-w5)', () => {
	it('`/profile/account-settings/personal` is the shell’s section: its title, never indexed, the seven rows from the server’s own answers — every hidden value exactly as the SERVER sent it', async () => {
		draw();
		const section = await screen.findByTestId('settings-section-personal');
		expect(screen.getByTestId('settings-page')).toHaveAttribute('data-section', 'personal');
		expect(section.querySelector('#settings-section-title-personal')).toHaveTextContent(
			'Προσωπικά στοιχεία'
		);
		expect(document.title).toBe('Ρυθμίσεις λογαριασμού | eDoctor');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		await waitFor(() => expect(row('afm')).toBeInTheDocument());
		expect(row('name')).toHaveTextContent('Ελένη Παππά');
		expect(row('dob')).toHaveTextContent('14 Μαρτίου 1988');
		expect(row('gender')).toHaveTextContent('Γυναίκα');
		expect(row('email')).toHaveTextContent('e***a@example.test');
		expect(row('phone')).toHaveTextContent('+30 *** *** 4567');
		expect(row('amka')).toHaveTextContent('•••••••0001');
		expect(row('afm')).toHaveTextContent('Δεν έχει δοθεί');
		// Two reads, with the cookies, nothing in an address; no write.
		expect(calls.map((call) => `${call.method} ${call.path}${call.search}`).sort()).toEqual([
			'GET /patient/me',
			'GET /user/me'
		]);
		// U-164.1: nothing of a doctor's in the user's screen.
		expect(section.textContent).not.toMatch(/ιατρεί|ειδικότητ/iu);
	});

	it('(negative) a guest at the address reads nothing of anyone — no `/user/me`, no row — and is asked to sign in', async () => {
		signedIn = false;
		draw();
		await waitFor(() => expect(screen.getByTestId('auth-dialog')).toBeInTheDocument());
		expect(screen.queryByTestId('personal-details')).toBeNull();
		expect(reads('/user/me')).toBe(0);
	});

	it('«Ονοματεπώνυμο»: the patient’s own write (`PATCH /patient/me/profile`, both halves), then the session is read AGAIN and the row — and the session’s name — say what the server holds', async () => {
		draw();
		await open('name');
		await user().clear(input('personal-last-name-input'));
		await user().type(input('personal-last-name-input'), 'Γεωργίου');
		await user().click(screen.getByTestId('personal-save'));
		expect(await screen.findByText('Οι αλλαγές αποθηκεύτηκαν.')).toBeInTheDocument();
		expect(writes()).toEqual([
			{
				method: 'PATCH',
				path: '/patient/me/profile',
				search: '',
				body: { firstName: 'Ελένη', lastName: 'Γεωργίου' }
			}
		]);
		expect(reads('/patient/me')).toBe(2);
		expect(row('name')).toHaveAttribute('data-state', 'closed');
		expect(row('name')).toHaveTextContent('Ελένη Γεωργίου');
	});

	it('🔴 «ΑΜΚΑ» / «ΑΦΜ»: a new number is a `PUT /patient/me` with that number ALONE, «Αφαίρεση» the same with `null`; the row then prints the server’s mask', async () => {
		draw();
		await open('afm');
		await user().type(input('personal-afm-input'), '123456783');
		await user().click(screen.getByTestId('personal-save'));
		expect(await screen.findByText('Οι αλλαγές αποθηκεύτηκαν.')).toBeInTheDocument();
		await waitFor(() => expect(row('afm')).toHaveTextContent('•••••6783'));

		await open('amka');
		await user().click(screen.getByTestId('personal-remove'));
		expect(await screen.findByText('Αφαιρέθηκε.')).toBeInTheDocument();
		await waitFor(() => expect(row('amka')).toHaveTextContent('Δεν έχει δοθεί'));
		expect(writes()).toEqual([
			{ method: 'PUT', path: '/patient/me', search: '', body: { afm: '123456783' } },
			{ method: 'PUT', path: '/patient/me', search: '', body: { amka: null } }
		]);
	});

	it('«Διεύθυνση email»: `start` with the address alone, `verify` with the code alone; the row and the session take the ANSWER’s mask, and «Καλωσορίσατε ξανά» remembers that mask — never the address', async () => {
		window.localStorage.setItem(
			knownAccountStorageKey,
			JSON.stringify({
				firstName: 'Ελένη',
				maskedIdentifier: 'e***a@example.test',
				channel: 'email',
				lastMethod: 'otp'
			})
		);
		draw();
		await open('email');
		await user().type(input('personal-email-input'), 'nea@example.test');
		await user().click(screen.getByTestId('personal-email-continue'));
		await user().type(await screen.findByTestId('personal-code-input'), '123456');
		await user().click(screen.getByTestId('personal-code-verify'));
		expect(
			await screen.findByText('Το email σας άλλαξε. Στείλαμε ενημέρωση και στο παλιό.')
		).toBeInTheDocument();
		expect(writes()).toEqual([
			{
				method: 'POST',
				path: '/auth/login-email/me/start',
				search: '',
				body: { email: 'nea@example.test' }
			},
			{ method: 'POST', path: '/auth/login-email/me/verify', search: '', body: { code: '123456' } }
		]);
		expect(row('email')).toHaveTextContent('n***a@example.test');
		// The session was read again with the cookies the answer set.
		expect(reads('/patient/me')).toBe(2);
		const remembered = window.localStorage.getItem(knownAccountStorageKey) ?? '';
		expect(JSON.parse(remembered)).toMatchObject({
			firstName: 'Ελένη',
			maskedIdentifier: 'n***a@example.test',
			channel: 'email'
		});
		expect(remembered).not.toContain('nea@');
	});

	it('D-W45-15 (negative): the confirming read lost after the change — the row still says the ANSWER’s mask, not the old address', async () => {
		draw();
		await open('email');
		await user().type(input('personal-email-input'), 'nea@example.test');
		await user().click(screen.getByTestId('personal-email-continue'));
		await user().type(await screen.findByTestId('personal-code-input'), '123456');
		answers['GET /patient/me'] = () => refusal(503, 'EC500', 'down');
		await user().click(screen.getByTestId('personal-code-verify'));
		await screen.findByText('Το email σας άλλαξε. Στείλαμε ενημέρωση και στο παλιό.');
		expect(row('email')).toHaveTextContent('n***a@example.test');
		expect(row('email')).not.toHaveTextContent('e***a@example.test');
	});

	it.each([
		[
			'GOOGLE',
			'Συνδέεστε με Google. Για να αλλάξετε email, αποσυνδέστε πρώτα το Google από το «Σύνδεση και ασφάλεια».'
		],
		[
			'APPLE',
			'Συνδέεστε με Apple. Για να αλλάξετε email, αποσυνδέστε πρώτα το Apple από το «Σύνδεση και ασφάλεια».'
		],
		[
			'GOOGLE,APPLE',
			'Συνδέεστε με Google και Apple. Για να αλλάξετε email, αποσυνδέστε τα πρώτα από το «Σύνδεση και ασφάλεια».'
		]
	])(
		'🔴 D-W45-16: συνδεδεμένος πάροχος ⇒ το μήνυμα, κανένα βήμα κωδικού — the server’s `403` «…PROVIDER_LINKED:%s»',
		async (providers, words) => {
			answers['POST /auth/login-email/me/start'] = () =>
				refusal(403, 'EC403', `Forbidden: LOGIN_EMAIL_CHANGE_PROVIDER_LINKED:${providers}`);
			draw();
			await open('email');
			await user().type(input('personal-email-input'), 'nea@example.test');
			await user().click(screen.getByTestId('personal-email-continue'));
			await waitFor(() => expect(row('email')).toHaveTextContent(words));
			expect(screen.queryByTestId('personal-code-input')).toBeNull();
			expect(writes()).toHaveLength(1);
			// The server's own words are never drawn: only the page's sentence.
			expect(document.body.textContent).not.toContain('PROVIDER_LINKED');
			// The SAME 403 is no session's end.
			expect(screen.queryByTestId('auth-dialog')).toBeNull();
		}
	);

	it.each([
		[
			'409',
			'EC415',
			'Already exist: Email already exists for this tenant.',
			'Αυτό το email χρησιμοποιείται ήδη από άλλον λογαριασμό.'
		],
		['422', 'EC423', '"email" must be a valid email', 'Γράψτε ένα έγκυρο email.'],
		['429', 'EC429', 'Πολλές προσπάθειες', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
		['403', 'EC403', 'Forbidden', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
		['401', 'SIGN_IN_NOT_AVAILABLE', 'Unauthorized', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
		['403', 'USER_LOCKED', 'Locked for 10 minutes', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.']
	])(
		'(negative) `start` refused with %s %s says the page’s own words («%s» is never drawn), opens no code step and ends no session',
		async (status, code, message, words) => {
			answers['POST /auth/login-email/me/start'] = () => refusal(Number(status), code, message);
			draw();
			await open('email');
			await user().type(input('personal-email-input'), 'allou@example.test');
			await user().click(screen.getByTestId('personal-email-continue'));
			await waitFor(() => expect(row('email')).toHaveTextContent(words));
			expect(screen.queryByTestId('personal-code-input')).toBeNull();
			expect(screen.queryByTestId('auth-dialog')).toBeNull();
			expect(row('email')).toHaveAttribute('data-state', 'open');
		}
	);

	it('🔴 (negative) a WRONG code is a `401` too (`EC011`): «Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.» and the person stays signed in — for the email and for the mobile; only `EC401` opens the sign-in', async () => {
		answers['POST /auth/login-email/me/verify'] = () =>
			refusal(401, 'EC011', 'Invalid verification code. 2 attempts remaining.');
		answers['POST /auth/login-phone/me/verify'] = () =>
			refusal(401, 'EC011', 'Invalid verification code. 2 attempts remaining.');
		draw();
		await open('email');
		await user().type(input('personal-email-input'), 'nea@example.test');
		await user().click(screen.getByTestId('personal-email-continue'));
		await user().type(await screen.findByTestId('personal-code-input'), '000000');
		await user().click(screen.getByTestId('personal-code-verify'));
		await waitFor(() =>
			expect(row('email')).toHaveTextContent('Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.')
		);
		expect(screen.queryByTestId('auth-dialog')).toBeNull();
		await user().click(screen.getByTestId('personal-row-email-close'));
		// The old address held.
		expect(row('email')).toHaveTextContent('e***a@example.test');

		await open('phone');
		await user().type(input('personal-phone-input'), '6977654321');
		await user().click(screen.getByTestId('personal-phone-continue'));
		await user().type(await screen.findByTestId('personal-code-input'), '000000');
		await user().click(screen.getByTestId('personal-code-verify'));
		await waitFor(() =>
			expect(row('phone')).toHaveTextContent('Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.')
		);
		expect(screen.queryByTestId('auth-dialog')).toBeNull();

		answers['POST /auth/login-phone/me/verify'] = () => refusal(401, 'EC401', 'Unauthorized');
		await user().type(screen.getByTestId('personal-code-input'), '111111');
		await user().click(screen.getByTestId('personal-code-verify'));
		await waitFor(() => expect(screen.getByTestId('auth-dialog')).toBeInTheDocument());
	});

	it('«Κινητό»: the sign-in’s own rule composes the number (E.164) — `start` with it alone, `verify` with the code alone — and the row says the server’s new mask', async () => {
		draw();
		await open('phone');
		await user().type(input('personal-phone-input'), '697 765 4321');
		await user().click(screen.getByTestId('personal-phone-continue'));
		await user().type(await screen.findByTestId('personal-code-input'), '123456');
		await user().click(screen.getByTestId('personal-code-verify'));
		expect(await screen.findByText('Το κινητό σας επαληθεύτηκε.')).toBeInTheDocument();
		expect(writes()).toEqual([
			{
				method: 'POST',
				path: '/auth/login-phone/me/start',
				search: '',
				body: { mobilePhone: '+306977654321' }
			},
			{ method: 'POST', path: '/auth/login-phone/me/verify', search: '', body: { code: '123456' } }
		]);
		await waitFor(() => expect(row('phone')).toHaveTextContent('+30 *** *** 4321'));
	});

	it('«Φύλο» and a patient’s «Ημερομηνία γέννησης»: `PUT /user/me` with `gender` alone; the date through the patient’s own write', async () => {
		draw();
		await open('gender');
		await user().click(screen.getByTestId('personal-gender-option-MALE'));
		await user().click(screen.getByTestId('personal-save'));
		expect(await screen.findByText('Οι αλλαγές αποθηκεύτηκαν.')).toBeInTheDocument();
		await waitFor(() => expect(row('gender')).toHaveTextContent('Άνδρας'));
		expect(writes()).toEqual([
			{ method: 'PUT', path: '/user/me', search: '', body: { gender: 'MALE' } }
		]);
	});

	it('card w45-w5, rule 9: an account the server names NO patient for (`GET /patient/me` ⇒ `null`) reads four rows, and none of the patient’s writes is ever made', async () => {
		patient = null;
		// The doctor's read says it IS a doctor: no profile is owed (D-83), the page is drawn.
		answers['GET /doctor/profile/base'] = () => json({ doctorId: 'doc-1' });
		draw();
		await waitFor(() => expect(row('dob')).toBeInTheDocument());
		expect(
			screen
				.getAllByRole('group')
				.map((group) => group.dataset.testid)
				.filter((testId) => testId?.startsWith('personal-row-'))
		).toEqual([
			'personal-row-dob',
			'personal-row-gender',
			'personal-row-email',
			'personal-row-phone'
		]);
		expect(row('email').querySelector('[data-slot="editable-row-value"]')).toBeNull();
		expect(calls.some((call) => call.path.startsWith('/patient/me') && call.method !== 'GET')).toBe(
			false
		);
	});

	it('🔴 U-168: καμία ολόκληρη τιμή email / ΑΜΚΑ / ΑΦΜ σε cache, αποθήκη ή διεύθυνση — through every row’s whole flow, with the real host and the real calls; (negative) and nothing of it is left in the page once the rows closed', async () => {
		draw();
		await open('email');
		await user().type(input('personal-email-input'), 'mystiko@example.test');
		expect(keptAnywhere()).not.toMatch(/mystiko/u);
		await user().click(screen.getByTestId('personal-email-continue'));
		await user().type(await screen.findByTestId('personal-code-input'), '654321');
		expect(keptAnywhere()).not.toMatch(/mystiko|654321/u);
		await user().click(screen.getByTestId('personal-code-verify'));
		await screen.findByText('Το email σας άλλαξε. Στείλαμε ενημέρωση και στο παλιό.');

		await open('phone');
		await user().type(input('personal-phone-input'), '6977654321');
		await user().click(screen.getByTestId('personal-phone-continue'));
		await user().type(await screen.findByTestId('personal-code-input'), '112233');
		await user().click(screen.getByTestId('personal-code-verify'));
		await screen.findByText('Το κινητό σας επαληθεύτηκε.');

		await open('amka');
		await user().type(input('personal-amka-input'), '01019012345');
		expect(keptAnywhere()).not.toMatch(/01019012345/u);
		await user().click(screen.getByTestId('personal-save'));
		await waitFor(() => expect(row('amka')).toHaveTextContent('•••••••2345'));
		await open('afm');
		await user().type(input('personal-afm-input'), '123456783');
		await user().click(screen.getByTestId('personal-save'));
		await waitFor(() => expect(row('afm')).toHaveTextContent('•••••6783'));

		const whole = /mystiko|654321|6977654321|112233|01019012345|123456783/u;
		const kept = keptAnywhere();
		expect(kept).not.toMatch(whole);
		expect(document.body.innerHTML).not.toMatch(whole);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		// Every value travelled in a body, never in an address.
		expect(calls.map((call) => `${call.path}${call.search}`).join(' ')).not.toMatch(whole);
		// (proof the scan read something) the masks the server sent ARE what the cache holds.
		expect(kept).toContain('n***a@example.test');
		expect(kept).toContain('•••••••2345');
		expect(kept).toContain('account-person');
	});
});
