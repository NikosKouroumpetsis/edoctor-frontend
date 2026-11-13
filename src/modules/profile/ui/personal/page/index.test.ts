import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import type { Session, SessionMember, SessionStatus } from '$shared/state/session';
import type { PersonalChallengeFailure, PersonalWriteFailure } from '$modules/profile/types';
import type { PersonalChallengePort, PersonalPorts } from '../types';
import Harness from './personal.harness.svelte';

/*
 * Wave 4.5 · screen 58 «Προσωπικά στοιχεία» (record §5.3; U-168, D-W45-14 … 16): seven rows that open in their place,
 * each with its own form. The calls other modules own are the page's PORTS — stood in for here; the account's own
 * (`GET` / `PUT /user/me`) are stubbed at the network. Made-up people; every ΑΜΚΑ fails Luhn, as the guard asks.
 */

const ELENI: SessionMember = {
	firstName: 'Ελένη',
	lastName: 'Παππά',
	maskedLoginEmail: 'e***a@example.gr',
	maskedLoginPhone: '+30 *** *** 4567',
	maskedAmka: '•••••••0001',
	maskedAfm: null,
	hasPatientProfile: true
};

type Call = { method: string; path: string; search: string; body: unknown };
let calls: Call[];
let stored: () => Response | Promise<Response>;
let written: () => Response | Promise<Response>;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });
const refusal = (status: number, errorMessage = 'refused', errorCode = 'EC000') =>
	new Response(JSON.stringify({ errorCode, errorMessage }), { status });
const profile = (overrides: Record<string, unknown> = {}) => ({
	id: 'u-1',
	gender: 'FEMALE',
	dateOfBirth: '1988-03-14T00:00:00.000Z',
	locale: 'el',
	...overrides
});

/** A refusal as a port reads it: the kind its owner module would tell. */
const refused = (kind: PersonalChallengeFailure | PersonalWriteFailure) => ({ kind });
const kindOf = (error: unknown) => (error as { kind?: string }).kind ?? 'unknown';

function challenge(): PersonalChallengePort & {
	start: ReturnType<typeof vi.fn>;
	resend: ReturnType<typeof vi.fn>;
	verify: ReturnType<typeof vi.fn>;
} {
	return {
		start: vi.fn(async () => ({ alreadyVerified: false })),
		resend: vi.fn(async () => undefined),
		verify: vi.fn(async () => undefined),
		failureOf: (error) => kindOf(error) as PersonalChallengeFailure
	};
}

function makePorts() {
	return {
		saveProfile: vi.fn(async () => undefined),
		saveIdentifier: vi.fn(async () => undefined),
		writeFailureOf: (error: unknown) => kindOf(error) as PersonalWriteFailure,
		email: challenge(),
		phone: challenge(),
		toMobilePhone: (dialCode: string, typed: string) => {
			const digits = typed.replace(/\D/gu, '');
			return digits.length === 10 ? `${dialCode}${digits}` : null;
		},
		refresh: vi.fn(async () => undefined)
	} satisfies PersonalPorts;
}

type Handle = {
	session: Session;
	status: () => SessionStatus;
	answer: (next: SessionMember) => void;
};

let ports: ReturnType<typeof makePorts>;
let client: QueryClient;
const user = () => userEvent.setup({ delay: null });

beforeEach(() => {
	calls = [];
	stored = () => json(profile());
	written = () => json(profile());
	ports = makePorts();
	client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const address = new URL(url, 'https://api.test');
			calls.push({
				method,
				path: address.pathname.replace(/^\/api\/v\d+/u, ''),
				search: address.search,
				body: init.body ? JSON.parse(String(init.body)) : undefined
			});
			return method === 'GET' ? stored() : written();
		})
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

async function draw(
	options: { member?: SessionMember; locale?: 'el' | 'en'; offline?: boolean } = {}
) {
	let handle: Handle | undefined;
	render(Harness, {
		props: {
			member: options.member ?? ELENI,
			ports,
			client,
			locale: options.locale ?? 'el',
			offline: options.offline ?? false,
			onReady: (found: Handle) => (handle = found)
		}
	});
	return () => handle as Handle;
}

const row = (id: string) => screen.getByTestId(`personal-row-${id}`);
const action = (id: string) => screen.getByTestId(`personal-row-${id}-action`);
const input = (testId: string) => screen.getByTestId(testId) as HTMLInputElement;
const writes = () => calls.filter((call) => call.method !== 'GET');

async function open(id: string) {
	await waitFor(() =>
		expect(screen.getByTestId('personal-details')).toHaveAttribute('data-view', 'ready')
	);
	await user().click(action(id));
	expect(row(id)).toHaveAttribute('data-state', 'open');
}

/** What the page keeps anywhere but the open row: the cache, the two storages, the address. */
function keptAnywhere(): string {
	const cache = client
		.getQueryCache()
		.getAll()
		.map((query) => [query.queryKey, query.state.data]);
	const storage = (store: Storage) =>
		Array.from({ length: store.length }, (_, index) => {
			const key = store.key(index) ?? '';
			return [key, store.getItem(key)];
		});
	return JSON.stringify([
		cache,
		client
			.getMutationCache()
			.getAll()
			.map((mutation) => mutation.state.variables),
		storage(window.localStorage),
		storage(window.sessionStorage),
		window.location.href,
		document.cookie
	]);
}

describe('profile/ui/personal · the rows (record §5.3)', () => {
	it('seven rows «title · value · Επεξεργασία» — or «Δεν έχει δοθεί · Προσθήκη» — in the record’s order, then the two boxes, word for word', async () => {
		await draw();
		await waitFor(() => expect(row('name')).toBeInTheDocument());
		const rows = screen
			.getAllByRole('group')
			.filter((group) => group.dataset.testid?.startsWith('personal-row-'));
		expect(
			rows.map((group) => [
				group.dataset.testid,
				group.querySelector('h2')?.textContent?.trim(),
				group.querySelector('[data-slot="editable-row-value"]')?.textContent?.trim(),
				group.querySelector('[data-slot="editable-row-action"]')?.textContent?.trim()
			])
		).toEqual([
			['personal-row-name', 'Ονοματεπώνυμο', 'Ελένη Παππά', 'Επεξεργασία'],
			['personal-row-dob', 'Ημερομηνία γέννησης', '14 Μαρτίου 1988', 'Επεξεργασία'],
			['personal-row-gender', 'Φύλο', 'Γυναίκα', 'Επεξεργασία'],
			['personal-row-email', 'Διεύθυνση email', 'e***a@example.gr', 'Επεξεργασία'],
			['personal-row-phone', 'Κινητό', '+30 *** *** 4567', 'Επεξεργασία'],
			['personal-row-amka', 'ΑΜΚΑ', '•••••••0001', 'Επεξεργασία'],
			['personal-row-afm', 'ΑΦΜ', 'Δεν έχει δοθεί', 'Προσθήκη']
		]);
		expect(screen.getByTestId('personal-note-masked')).toHaveTextContent(
			'Γιατί δεν φαίνονται ολόκληρα; Κρύβουμε μέρος του email, του κινητού, του ΑΜΚΑ και του ΑΦΜ σας για να προστατεύσουμε τον λογαριασμό σας.'
		);
		expect(screen.getByTestId('personal-note-visibility')).toHaveTextContent(
			'Ποιος βλέπει τα στοιχεία σας; Μόνο οι γιατροί στους οποίους κλείνετε ραντεβού, και μόνο όσα χρειάζονται για το ραντεβού.'
		);
		// The page read the account's own profile once, with nothing in its address.
		expect(calls).toEqual([{ method: 'GET', path: '/user/me', search: '', body: undefined }]);
	});

	it('the rows wait for the account’s read; a read with no answer says so, and «Δοκιμάστε ξανά» asks again', async () => {
		let answer: (response: Response) => void = () => undefined;
		stored = () => new Promise<Response>((resolve) => (answer = resolve));
		await draw();
		expect(screen.getByTestId('personal-details-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.queryByTestId('personal-row-name')).toBeNull();
		answer(refusal(503));
		expect(await screen.findByTestId('personal-details-failed')).toHaveTextContent(
			'Δεν ήταν δυνατή η φόρτωση των στοιχείων σας'
		);
		stored = () => json(profile());
		await user().click(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(await screen.findByTestId('personal-row-name')).toBeInTheDocument();
	});

	it('card w45-w5, rule 9: an account with NO patient profile reads four rows — no name, ΑΜΚΑ or ΑΦΜ — and its date of birth is the account’s own write (`PUT /user/me`), never the patient’s', async () => {
		await draw({
			member: { firstName: null, hasPatientProfile: false, maskedLoginEmail: null }
		});
		await waitFor(() => expect(row('dob')).toBeInTheDocument());
		for (const id of ['name', 'amka', 'afm']) {
			expect(screen.queryByTestId(`personal-row-${id}`), id).toBeNull();
		}
		// No value the page cannot know: the title alone, and the way in.
		expect(row('email').querySelector('[data-slot="editable-row-value"]')).toBeNull();
		expect(action('email')).toHaveTextContent('Επεξεργασία');
		await open('dob');
		const date = row('dob').querySelector('[data-slot="date-of-birth-field-input"]') as HTMLElement;
		await fireEvent.input(date, { target: { value: '1990-01-02' } });
		await user().click(screen.getByTestId('personal-save'));
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0]).toMatchObject({
			method: 'PUT',
			path: '/user/me',
			body: { dateOfBirth: '1990-01-02T00:00:00.000Z' }
		});
		expect(ports.saveProfile).not.toHaveBeenCalled();
	});

	it('ONE row open at a time: the others fade and take no press; «Ακύρωση» or Escape closes, the focus back on the row’s link', async () => {
		await draw();
		await open('name');
		for (const id of ['dob', 'gender', 'email', 'phone', 'amka', 'afm']) {
			expect(row(id), id).toHaveAttribute('data-dimmed', 'true');
			expect(action(id), id).toHaveAttribute('aria-disabled', 'true');
		}
		expect(screen.getByTestId('personal-row-name-close')).toHaveTextContent('Ακύρωση');
		expect(row('name')).toHaveTextContent('Όπως θα το βλέπει ο γιατρός στα ραντεβού σας.');
		// The focus went into the first field as the row opened.
		expect(document.activeElement).toBe(input('personal-first-name-input'));
		await user().keyboard('{Escape}');
		expect(row('name')).toHaveAttribute('data-state', 'closed');
		expect(document.activeElement).toBe(action('name'));
		expect(row('dob')).not.toHaveAttribute('data-dimmed');
	});

	it('🔴 U-168: τα πεδία ανοίγουν άδεια — the email, the mobile, the ΑΜΚΑ and the ΑΦΜ open EMPTY, never with a mask or a value in them', async () => {
		await draw({ member: { ...ELENI, maskedAfm: '•••••6783' } });
		for (const [id, testId] of [
			['email', 'personal-email-input'],
			['phone', 'personal-phone-input'],
			['amka', 'personal-amka-input'],
			['afm', 'personal-afm-input']
		]) {
			await open(id);
			expect(input(testId).value, id).toBe('');
			expect(input(testId).getAttribute('value') ?? '', id).toBe('');
			await user().click(screen.getByTestId(`personal-row-${id}-close`));
		}
	});

	it('«Ακύρωση» drops whatever was typed: the row opens again as it is on file (a name) or empty (an ΑΜΚΑ), and nothing was sent', async () => {
		await draw();
		await open('name');
		await user().clear(input('personal-first-name-input'));
		await user().type(input('personal-first-name-input'), 'Άλλη');
		await user().click(screen.getByTestId('personal-row-name-close'));
		await open('name');
		expect(input('personal-first-name-input').value).toBe('Ελένη');
		await user().click(screen.getByTestId('personal-row-name-close'));

		await open('amka');
		await user().type(input('personal-amka-input'), '01019012345');
		await user().click(screen.getByTestId('personal-row-amka-close'));
		await open('amka');
		expect(input('personal-amka-input').value).toBe('');
		expect(ports.saveProfile).not.toHaveBeenCalled();
		expect(ports.saveIdentifier).not.toHaveBeenCalled();
		expect(writes()).toEqual([]);
	});

	it('in English the rows, the links and the boxes say the application’s words', async () => {
		await draw({ locale: 'en' });
		await waitFor(() => expect(row('afm')).toBeInTheDocument());
		expect(row('name')).toHaveTextContent('Full name');
		expect(row('afm')).toHaveTextContent('Tax number (AFM) Not provided Add');
		expect(action('email')).toHaveTextContent('Edit');
		expect(screen.getByTestId('personal-note-visibility')).toHaveTextContent(
			'Who sees your details? Only the doctors you book with, and only what the appointment needs.'
		);
	});
});

describe('profile/ui/personal · «Ονοματεπώνυμο», «Ημερομηνία γέννησης», «Φύλο»', () => {
	it('a changed name is saved — both halves, trimmed, ONE request for two presses — the reads are asked again, the row closes and the page says «Οι αλλαγές αποθηκεύτηκαν.»', async () => {
		let release: () => void = () => undefined;
		ports.saveProfile.mockImplementation(
			() => new Promise<undefined>((resolve) => (release = () => resolve(undefined)))
		);
		const handle = await draw();
		await open('name');
		await user().clear(input('personal-last-name-input'));
		await user().type(input('personal-last-name-input'), ' Γεωργίου ');
		const save = screen.getByTestId('personal-save');
		await user().click(save);
		await user().click(save);
		expect(ports.saveProfile).toHaveBeenCalledTimes(1);
		expect(ports.saveProfile).toHaveBeenCalledWith({ firstName: 'Ελένη', lastName: 'Γεωργίου' });
		// What the refresh brings back is what the row shows — never what was typed.
		ports.refresh.mockImplementation(async () => {
			handle().answer({ ...ELENI, lastName: 'Γεωργίου' });
		});
		release();
		expect(await screen.findByText('Οι αλλαγές αποθηκεύτηκαν.')).toBeInTheDocument();
		expect(ports.refresh).toHaveBeenCalledTimes(1);
		expect(row('name')).toHaveAttribute('data-state', 'closed');
		expect(row('name')).toHaveTextContent('Ελένη Γεωργίου');
	});

	it('(negative) an empty half is said under it — «Γράψτε το όνομά σας.» / «Γράψτε το επώνυμό σας.» — the focus goes to the first wrong field and nothing is sent; a name that did not change closes the row with no request', async () => {
		await draw();
		await open('name');
		await user().clear(input('personal-first-name-input'));
		await user().clear(input('personal-last-name-input'));
		await user().click(screen.getByTestId('personal-save'));
		expect(row('name')).toHaveTextContent('Γράψτε το όνομά σας.');
		expect(row('name')).toHaveTextContent('Γράψτε το επώνυμό σας.');
		const first = input('personal-first-name-input');
		expect(first).toHaveAttribute('aria-invalid', 'true');
		expect(document.getElementById(first.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
			'Γράψτε το όνομά σας.'
		);
		await waitFor(() => expect(document.activeElement).toBe(first));
		expect(ports.saveProfile).not.toHaveBeenCalled();
		// 🔴 U-65.6: each half stops at the server's 100.
		expect(first).toHaveAttribute('maxlength', '100');

		await user().type(first, 'Ελένη');
		await user().type(input('personal-last-name-input'), 'Παππά');
		await user().click(screen.getByTestId('personal-save'));
		expect(row('name')).toHaveAttribute('data-state', 'closed');
		expect(ports.saveProfile).not.toHaveBeenCalled();
		expect(screen.queryByText('Οι αλλαγές αποθηκεύτηκαν.')).toBeNull();
	});

	it('(negative) a refused write says so in the row and keeps it open with what was typed; 🔴 U-84: a session that ended opens the sign-in', async () => {
		ports.saveProfile.mockRejectedValueOnce(refused('unknown'));
		const handle = await draw();
		await open('name');
		await user().type(input('personal-first-name-input'), 'α');
		await user().click(screen.getByTestId('personal-save'));
		expect(await screen.findByTestId('personal-failure')).toHaveTextContent(
			'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
		);
		expect(row('name')).toHaveAttribute('data-state', 'open');
		expect(input('personal-first-name-input').value).toBe('Ελένηα');
		expect(ports.refresh).not.toHaveBeenCalled();

		ports.saveProfile.mockRejectedValueOnce(refused('session'));
		await user().click(screen.getByTestId('personal-save'));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		expect(handle().status()).toBe('guest');
	});

	it('the date of birth: the kit’s ONE date field, saved as the day’s instant through the patient’s own write; the server’s 120 years are said under the field', async () => {
		await draw();
		await open('dob');
		const date = row('dob').querySelector(
			'[data-slot="date-of-birth-field-input"]'
		) as HTMLInputElement;
		expect(date).toHaveAttribute('type', 'date');
		expect(date.value).toBe('1988-03-14');
		ports.saveProfile.mockRejectedValueOnce(refused('birth-date'));
		await fireEvent.input(date, { target: { value: '1890-01-02' } });
		await user().click(screen.getByTestId('personal-save'));
		await waitFor(() =>
			expect(row('dob')).toHaveTextContent(
				'Μη έγκυρη ημερομηνία γέννησης. Επιλέξτε ημερομηνία έως σήμερα και όχι παλαιότερη από 120 χρόνια.'
			)
		);
		expect(ports.saveProfile).toHaveBeenLastCalledWith({
			dateOfBirth: '1890-01-02T00:00:00.000Z'
		});
		await fireEvent.input(date, { target: { value: '1990-01-02' } });
		await user().click(screen.getByTestId('personal-save'));
		expect(await screen.findByText('Οι αλλαγές αποθηκεύτηκαν.')).toBeInTheDocument();
		expect(ports.saveProfile).toHaveBeenLastCalledWith({
			dateOfBirth: '1990-01-02T00:00:00.000Z'
		});
		expect(writes()).toEqual([]);
	});

	it('(negative) the date of birth is not removed: an emptied field is refused before any request; the same day closes the row with none', async () => {
		await draw();
		await open('dob');
		const date = row('dob').querySelector(
			'[data-slot="date-of-birth-field-input"]'
		) as HTMLInputElement;
		await fireEvent.input(date, { target: { value: '' } });
		await user().click(screen.getByTestId('personal-save'));
		expect(row('dob')).toHaveTextContent('Μη έγκυρη ημερομηνία γέννησης.');
		expect(row('dob')).toHaveAttribute('data-state', 'open');
		await fireEvent.input(date, { target: { value: '1988-03-14' } });
		await user().click(screen.getByTestId('personal-save'));
		expect(row('dob')).toHaveAttribute('data-state', 'closed');
		expect(ports.saveProfile).not.toHaveBeenCalled();
	});

	it('🔴 U-112: «Φύλο» is four choices one under the other; a press marks one, «Αποθήκευση» writes `gender` ALONE (`PUT /user/me`) — never the same one again', async () => {
		await draw();
		await open('gender');
		const group = within(row('gender')).getByRole('radiogroup', { name: 'Φύλο' });
		expect(group).toHaveClass('flex-col');
		expect(
			within(group)
				.getAllByRole('radio')
				.map((radio) => radio.textContent?.trim())
		).toEqual(['Γυναίκα', 'Άνδρας', 'Μη δυαδικό', 'Άλλο']);
		expect(screen.getByTestId('personal-gender-option-FEMALE')).toHaveAttribute(
			'aria-checked',
			'true'
		);
		// The one on file again: no request (the server answers 422 to a write that changes nothing).
		await user().click(screen.getByTestId('personal-save'));
		expect(writes()).toEqual([]);
		expect(row('gender')).toHaveAttribute('data-state', 'closed');

		await open('gender');
		await user().click(screen.getByTestId('personal-gender-option-NON_BINARY'));
		expect(row('gender')).toHaveAttribute('data-state', 'open');
		stored = () => json(profile({ gender: 'NON_BINARY' }));
		await user().click(screen.getByTestId('personal-save'));
		expect(await screen.findByText('Οι αλλαγές αποθηκεύτηκαν.')).toBeInTheDocument();
		expect(writes()).toEqual([
			{ method: 'PUT', path: '/user/me', search: '', body: { gender: 'NON_BINARY' } }
		]);
		await waitFor(() => expect(row('gender')).toHaveTextContent('Μη δυαδικό'));
	});

	it('(negative) no gender chosen says «Επιλέξτε ένα.»; a refused write keeps the row open; `401` opens the sign-in', async () => {
		stored = () => json(profile({ gender: null }));
		const handle = await draw();
		await open('gender');
		await user().click(screen.getByTestId('personal-save'));
		expect(screen.getByTestId('personal-gender-error')).toHaveTextContent('Επιλέξτε ένα.');
		expect(writes()).toEqual([]);
		await user().click(screen.getByTestId('personal-gender-option-MALE'));
		written = () => refusal(500);
		await user().click(screen.getByTestId('personal-save'));
		expect(await screen.findByTestId('personal-failure')).toHaveTextContent(
			'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
		);
		written = () => refusal(401, 'Unauthorized', 'EC401');
		await user().click(screen.getByTestId('personal-save'));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
	});
});

describe('profile/ui/personal · «ΑΜΚΑ», «ΑΦΜ» (U-168, D-W45-10)', () => {
	it('a new ΑΜΚΑ: «Νέο ΑΜΚΑ · 11 ψηφία» over the empty field, digits only, saved through the patient’s own write; the row then shows the SERVER’s mask', async () => {
		const handle = await draw();
		await open('amka');
		const field = input('personal-amka-input');
		expect(within(row('amka')).getByLabelText('Νέο ΑΜΚΑ · 11 ψηφία')).toBe(field);
		expect(field).toHaveAttribute('inputmode', 'numeric');
		expect(field).toHaveAttribute('autocomplete', 'off');
		await user().type(field, '0101-90 12345xyz');
		expect(field.value).toBe('01019012345');
		ports.refresh.mockImplementation(async () => {
			handle().answer({ ...ELENI, maskedAmka: '•••••••2345' });
		});
		await user().click(screen.getByTestId('personal-save'));
		expect(await screen.findByText('Οι αλλαγές αποθηκεύτηκαν.')).toBeInTheDocument();
		expect(ports.saveIdentifier).toHaveBeenCalledTimes(1);
		expect(ports.saveIdentifier).toHaveBeenCalledWith('amka', '01019012345');
		expect(row('amka')).toHaveTextContent('•••••••2345');
		expect(document.body.textContent).not.toContain('01019012345');
	});

	it('🔴 «Αφαίρεση» only when one is on file: it sends `null` and the page says «Αφαιρέθηκε.»; an ΑΦΜ never given has no «Αφαίρεση» and its label is «9 ψηφία»', async () => {
		const handle = await draw();
		await open('afm');
		expect(within(row('afm')).getByLabelText('9 ψηφία')).toBe(input('personal-afm-input'));
		expect(screen.queryByTestId('personal-remove')).toBeNull();
		await user().click(screen.getByTestId('personal-row-afm-close'));

		await open('amka');
		ports.refresh.mockImplementation(async () => {
			handle().answer({ ...ELENI, maskedAmka: null });
		});
		await user().click(screen.getByTestId('personal-remove'));
		expect(await screen.findByText('Αφαιρέθηκε.')).toBeInTheDocument();
		expect(ports.saveIdentifier).toHaveBeenCalledWith('amka', null);
		expect(row('amka')).toHaveTextContent('Δεν έχει δοθεί');
		expect(action('amka')).toHaveTextContent('Προσθήκη');
	});

	it.each([
		['amka', '0101901234', 'Το ΑΜΚΑ έχει 11 ψηφία.'],
		['amka', '', 'Το ΑΜΚΑ έχει 11 ψηφία.'],
		['amka', '32139012345', 'Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'],
		['afm', '12345678', 'Το ΑΦΜ έχει 9 ψηφία.'],
		['afm', '123456789', 'Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.']
	] as const)(
		'(negative) %s «%s» is refused before any request: «%s»',
		async (kind, typed, words) => {
			await draw();
			await open(kind);
			const field = input(`personal-${kind}-input`);
			if (typed) await user().type(field, typed);
			await user().click(screen.getByTestId('personal-save'));
			expect(row(kind)).toHaveTextContent(words);
			expect(field).toHaveAttribute('aria-invalid', 'true');
			await waitFor(() => expect(document.activeElement).toBe(field));
			expect(ports.saveIdentifier).not.toHaveBeenCalled();
		}
	);

	it('(negative) a number the SERVER refuses says «δεν είναι έγκυρο» under the field; another refusal the general words; `401` opens the sign-in', async () => {
		const handle = await draw();
		await open('afm');
		await user().type(input('personal-afm-input'), '123456783');
		ports.saveIdentifier.mockRejectedValueOnce(refused('invalid'));
		await user().click(screen.getByTestId('personal-save'));
		await waitFor(() =>
			expect(row('afm')).toHaveTextContent('Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.')
		);
		ports.saveIdentifier.mockRejectedValueOnce(refused('unknown'));
		await user().click(screen.getByTestId('personal-save'));
		expect(await screen.findByTestId('personal-failure')).toHaveTextContent(
			'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
		);
		ports.saveIdentifier.mockRejectedValueOnce(refused('session'));
		await user().click(screen.getByTestId('personal-save'));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
	});
});

describe('profile/ui/personal · «Διεύθυνση email» (D-W45-15, D-W45-16, U-163)', () => {
	async function toCode(address = 'nea@example.test') {
		await open('email');
		await user().type(input('personal-email-input'), address);
		await user().click(screen.getByTestId('personal-email-continue'));
		await waitFor(() => expect(screen.getByTestId('personal-code-input')).toBeInTheDocument());
	}

	it('two steps: «Νέο email» + «Συνέχεια» sends the address ONCE, then «Στείλαμε έναν κωδικό 6 ψηφίων στο …» with what was just typed, the code’s field focused and the help gone; the right code changes it', async () => {
		const handle = await draw();
		await open('email');
		const field = input('personal-email-input');
		expect(within(row('email')).getByLabelText('Νέο email')).toBe(field);
		expect(field).toHaveAttribute('type', 'email');
		expect(field).toHaveAttribute('autocomplete', 'email');
		expect(field).toHaveAttribute('maxlength', '254');
		expect(row('email')).toHaveTextContent('μέχρι να τον δώσετε, ισχύει το παλιό.');
		await user().type(field, ' nea@example.test ');
		await user().click(screen.getByTestId('personal-email-continue'));
		const code = await screen.findByTestId('personal-code-input');
		expect(ports.email.start).toHaveBeenCalledTimes(1);
		expect(ports.email.start).toHaveBeenCalledWith('nea@example.test');
		expect(screen.getByTestId('personal-code-sent')).toHaveTextContent(
			'Στείλαμε έναν κωδικό 6 ψηφίων στο nea@example.test.'
		);
		expect(row('email')).not.toHaveTextContent('μέχρι να τον δώσετε');
		expect(within(row('email')).getByLabelText('Κωδικός επαλήθευσης')).toBe(code);
		expect(code).toHaveAttribute('autocomplete', 'one-time-code');
		expect(code).toHaveAttribute('inputmode', 'numeric');
		await waitFor(() => expect(document.activeElement).toBe(code));
		// Until the right code the old address holds: the session was not asked again.
		expect(ports.refresh).not.toHaveBeenCalled();

		await user().type(code, '12a34-56789');
		expect((code as HTMLInputElement).value).toBe('123456');
		ports.refresh.mockImplementation(async () => {
			handle().answer({ ...ELENI, maskedLoginEmail: 'n***a@example.test' });
		});
		await user().click(screen.getByTestId('personal-code-verify'));
		expect(
			await screen.findByText('Το email σας άλλαξε. Στείλαμε ενημέρωση και στο παλιό.')
		).toBeInTheDocument();
		expect(ports.email.verify).toHaveBeenCalledTimes(1);
		expect(ports.email.verify).toHaveBeenCalledWith('123456');
		expect(row('email')).toHaveAttribute('data-state', 'closed');
		// The row shows the SERVER's mask of the new address, never the address typed.
		expect(row('email')).toHaveTextContent('n***a@example.test');
		expect(document.body.textContent).not.toContain('nea@example.test');
	});

	it.each([
		'',
		'nea',
		'nea@',
		'nea@example',
		'δύο λέξεις@example.test',
		`${'a'.repeat(250)}@example.test`
	])(
		'(negative) «%s» is no address: «Γράψτε ένα έγκυρο email.» under the field, the focus on it, no request',
		async (typed) => {
			await draw();
			await open('email');
			const field = input('personal-email-input');
			if (typed) await fireEvent.input(field, { target: { value: typed } });
			await user().click(screen.getByTestId('personal-email-continue'));
			expect(row('email')).toHaveTextContent('Γράψτε ένα έγκυρο email.');
			expect(field).toHaveAttribute('aria-invalid', 'true');
			expect(
				document.getElementById(field.getAttribute('aria-describedby') ?? '')
			).toHaveTextContent('Γράψτε ένα έγκυρο email.');
			await waitFor(() => expect(document.activeElement).toBe(field));
			expect(ports.email.start).not.toHaveBeenCalled();
		}
	);

	it('`alreadyVerified`: «Αυτό είναι ήδη το email σας.» under the field, and NO code step', async () => {
		ports.email.start.mockResolvedValueOnce({ alreadyVerified: true });
		await draw();
		await open('email');
		await user().type(input('personal-email-input'), 'idio@example.test');
		await user().click(screen.getByTestId('personal-email-continue'));
		await waitFor(() => expect(row('email')).toHaveTextContent('Αυτό είναι ήδη το email σας.'));
		expect(screen.queryByTestId('personal-code-input')).toBeNull();
	});

	it.each([
		['taken', 'Αυτό το email χρησιμοποιείται ήδη από άλλον λογαριασμό.'],
		['invalid-value', 'Γράψτε ένα έγκυρο email.'],
		['rate-limited', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.']
	] as const)(
		'(negative) a start refused as «%s» says «%s» under the field — before any code is sent, and no code step opens',
		async (kind, words) => {
			ports.email.start.mockRejectedValueOnce(refused(kind));
			await draw();
			await open('email');
			const field = input('personal-email-input');
			await user().type(field, 'allou@example.test');
			await user().click(screen.getByTestId('personal-email-continue'));
			await waitFor(() => expect(row('email')).toHaveTextContent(words));
			expect(field).toHaveAttribute('aria-invalid', 'true');
			expect(screen.queryByTestId('personal-code-input')).toBeNull();
			// What was typed stays for the person to correct.
			expect(field.value).toBe('allou@example.test');
		}
	);

	it.each([
		[
			'provider-google',
			'Συνδέεστε με Google. Για να αλλάξετε email, αποσυνδέστε πρώτα το Google από το «Σύνδεση και ασφάλεια».'
		],
		[
			'provider-apple',
			'Συνδέεστε με Apple. Για να αλλάξετε email, αποσυνδέστε πρώτα το Apple από το «Σύνδεση και ασφάλεια».'
		],
		[
			'provider-both',
			'Συνδέεστε με Google και Apple. Για να αλλάξετε email, αποσυνδέστε τα πρώτα από το «Σύνδεση και ασφάλεια».'
		]
	] as const)(
		'🔴 D-W45-16: συνδεδεμένος πάροχος ⇒ το μήνυμα, κανένα βήμα κωδικού (%s)',
		async (kind, words) => {
			ports.email.start.mockRejectedValueOnce(refused(kind));
			await draw();
			await open('email');
			await user().type(input('personal-email-input'), 'nea@example.test');
			await user().click(screen.getByTestId('personal-email-continue'));
			await waitFor(() => expect(row('email')).toHaveTextContent(words));
			expect(screen.queryByTestId('personal-code-input')).toBeNull();
			expect(screen.queryByTestId('personal-code-verify')).toBeNull();
			expect(ports.email.verify).not.toHaveBeenCalled();
			expect(row('email')).toHaveAttribute('data-state', 'open');
		}
	);

	it('(negative) a start that did not go through (a closed channel, a lock, an outage) says the general words with no detail; `EC401` opens the sign-in', async () => {
		ports.email.start.mockRejectedValueOnce(refused('unknown'));
		const handle = await draw();
		await open('email');
		await user().type(input('personal-email-input'), 'nea@example.test');
		await user().click(screen.getByTestId('personal-email-continue'));
		expect(await screen.findByTestId('personal-failure')).toHaveTextContent(
			'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
		);
		expect(screen.queryByTestId('personal-code-input')).toBeNull();
		ports.email.start.mockRejectedValueOnce(refused('session'));
		await user().click(screen.getByTestId('personal-email-continue'));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
	});

	it('(negative) the code: fewer than six digits is «Ο κωδικός έχει 6 ψηφία.» with no request; a wrong one «Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.», the field emptied and focused, the old address still in force', async () => {
		await draw();
		await toCode();
		const code = input('personal-code-input');
		await user().type(code, '1234');
		await user().click(screen.getByTestId('personal-code-verify'));
		expect(row('email')).toHaveTextContent('Ο κωδικός έχει 6 ψηφία.');
		expect(ports.email.verify).not.toHaveBeenCalled();

		ports.email.verify.mockRejectedValueOnce(refused('invalid-code'));
		await user().type(code, '56');
		await user().click(screen.getByTestId('personal-code-verify'));
		await waitFor(() =>
			expect(row('email')).toHaveTextContent('Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.')
		);
		expect(code.value).toBe('');
		expect(code).toHaveAttribute('aria-invalid', 'true');
		await waitFor(() => expect(document.activeElement).toBe(code));
		expect(ports.refresh).not.toHaveBeenCalled();
		expect(row('email')).toHaveAttribute('data-state', 'open');
	});

	it('(negative) a spent or expired code goes BACK to step 1 with the address still typed and «Ο κωδικός έληξε. Ζητήστε καινούριο.»; an address taken meanwhile says so under its field', async () => {
		await draw();
		await toCode('nea@example.test');
		ports.email.verify.mockRejectedValueOnce(refused('stale-code'));
		await user().type(input('personal-code-input'), '123456');
		await user().click(screen.getByTestId('personal-code-verify'));
		expect(await screen.findByTestId('personal-failure')).toHaveTextContent(
			'Ο κωδικός έληξε. Ζητήστε καινούριο.'
		);
		const field = input('personal-email-input');
		expect(field.value).toBe('nea@example.test');
		expect(screen.queryByTestId('personal-code-input')).toBeNull();
		await waitFor(() => expect(document.activeElement).toBe(field));

		await user().click(screen.getByTestId('personal-email-continue'));
		ports.email.verify.mockRejectedValueOnce(refused('taken'));
		await user().type(await screen.findByTestId('personal-code-input'), '123456');
		await user().click(screen.getByTestId('personal-code-verify'));
		await waitFor(() =>
			expect(row('email')).toHaveTextContent(
				'Αυτό το email χρησιμοποιείται ήδη από άλλον λογαριασμό.'
			)
		);
		expect(screen.queryByTestId('personal-code-input')).toBeNull();
	});

	it('«Αποστολή ξανά» waits its 60 seconds (the page’s own clock names them), then sends ONE request and says «Στείλαμε νέο κωδικό.»; a `429` says the limit’s words', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));
		await draw();
		await toCode();
		const resend = screen.getByTestId('personal-code-resend');
		expect(resend).toHaveTextContent('Αποστολή ξανά');
		await user().click(resend);
		expect(screen.getByTestId('personal-code-resend-wait')).toHaveTextContent(
			'Περιμένετε 60 δευτερόλεπτα για νέο κωδικό.'
		);
		expect(ports.email.resend).not.toHaveBeenCalled();

		vi.setSystemTime(new Date('2026-11-12T10:01:00Z'));
		await user().click(resend);
		expect(await screen.findByText('Στείλαμε νέο κωδικό.')).toBeInTheDocument();
		expect(ports.email.resend).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('personal-code-resend-wait')).toBeNull();

		vi.setSystemTime(new Date('2026-11-12T10:02:00Z'));
		ports.email.resend.mockRejectedValueOnce(refused('rate-limited'));
		await user().click(resend);
		await waitFor(() =>
			expect(screen.getByTestId('personal-code-resend-wait')).toHaveTextContent(
				'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
			)
		);
	});

	it('«Άλλο email» goes back to step 1 — the help back, the address still typed, the code gone — and «Ακύρωση» then leaves nothing of either', async () => {
		await draw();
		await toCode('nea@example.test');
		await user().type(input('personal-code-input'), '123');
		await user().click(screen.getByTestId('personal-code-other'));
		const field = await screen.findByTestId('personal-email-input');
		expect((field as HTMLInputElement).value).toBe('nea@example.test');
		expect(row('email')).toHaveTextContent('μέχρι να τον δώσετε, ισχύει το παλιό.');
		await user().click(screen.getByTestId('personal-email-continue'));
		expect(input('personal-code-input').value).toBe('');

		await user().click(screen.getByTestId('personal-row-email-close'));
		await open('email');
		expect(input('personal-email-input').value).toBe('');
		expect(screen.queryByTestId('personal-code-input')).toBeNull();
	});

	it('🔴 U-168: καμία ολόκληρη τιμή email / ΑΜΚΑ / ΑΦΜ σε cache, αποθήκη ή διεύθυνση — neither while it is typed, nor at the code step, nor after the change', async () => {
		const handle = await draw();
		await toCode('mystiko@example.test');
		expect(keptAnywhere()).not.toMatch(/mystiko/u);
		await user().type(input('personal-code-input'), '654321');
		expect(keptAnywhere()).not.toMatch(/654321/u);
		ports.refresh.mockImplementation(async () => {
			handle().answer({ ...ELENI, maskedLoginEmail: 'm***o@example.test' });
		});
		await user().click(screen.getByTestId('personal-code-verify'));
		await screen.findByText('Το email σας άλλαξε. Στείλαμε ενημέρωση και στο παλιό.');

		await open('amka');
		await user().type(input('personal-amka-input'), '01019012345');
		expect(keptAnywhere()).not.toMatch(/01019012345/u);
		await user().click(screen.getByTestId('personal-save'));
		await screen.findByText('Οι αλλαγές αποθηκεύτηκαν.');
		await open('afm');
		await user().type(input('personal-afm-input'), '123456783');
		await user().click(screen.getByTestId('personal-save'));
		await waitFor(() => expect(ports.saveIdentifier).toHaveBeenCalledWith('afm', '123456783'));
		await waitFor(() => expect(row('afm')).toHaveAttribute('data-state', 'closed'));

		const kept = keptAnywhere();
		expect(kept).not.toMatch(/mystiko|654321|01019012345|123456783/u);
		expect(document.body.innerHTML).not.toMatch(/mystiko|654321|01019012345|123456783/u);
		// (proof the scan read something) the cache does hold the account's own read.
		expect(kept).toContain('account-person');
	});
});

describe('profile/ui/personal · «Κινητό» IN the row, at every width (U-168.3)', () => {
	it('no sheet and no window: the country and the number as one control in the row, «Συνέχεια», then the code in the same row; the right code says «Το κινητό σας επαληθεύτηκε.»', async () => {
		const handle = await draw();
		await open('phone');
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		const field = input('personal-phone-input');
		expect(row('phone')).toContainElement(field);
		expect(field).toHaveAttribute('autocomplete', 'tel-national');
		expect(field).toHaveAttribute('maxlength', '16');
		expect(row('phone')).toHaveTextContent(
			'Θα στείλουμε έναν κωδικό με SMS για να το επαληθεύσουμε.'
		);
		await user().type(field, '6977654321');
		await user().click(screen.getByTestId('personal-phone-continue'));
		const code = await screen.findByTestId('personal-code-input');
		expect(row('phone')).toContainElement(code);
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(ports.phone.start).toHaveBeenCalledTimes(1);
		expect(ports.phone.start).toHaveBeenCalledWith('+306977654321');
		// Where it went: the country and the last four digits of what was just typed.
		expect(screen.getByTestId('personal-code-sent')).toHaveTextContent(
			'Στείλαμε έναν κωδικό 6 ψηφίων στο +30 *** *** 4321.'
		);
		expect(screen.getByTestId('personal-code-other')).toHaveTextContent('Άλλος αριθμός');
		ports.refresh.mockImplementation(async () => {
			handle().answer({ ...ELENI, maskedLoginPhone: '+30 *** *** 4321' });
		});
		await user().type(code, '123456');
		await user().click(screen.getByTestId('personal-code-verify'));
		expect(await screen.findByText('Το κινητό σας επαληθεύτηκε.')).toBeInTheDocument();
		expect(ports.phone.verify).toHaveBeenCalledWith('123456');
		expect(row('phone')).toHaveTextContent('+30 *** *** 4321');
		expect(keptAnywhere()).not.toMatch(/6977654321/u);
		// There is no removal of a mobile.
		expect(screen.queryByTestId('personal-remove')).toBeNull();
	});

	it('(negative) a number the sign-in’s rule refuses: «Γράψτε ένα έγκυρο κινητό, π.χ. 6941234567.» and no request; another account’s number, an already verified one and the limit are said under the field', async () => {
		await draw();
		await open('phone');
		const field = input('personal-phone-input');
		await user().type(field, '697');
		await user().click(screen.getByTestId('personal-phone-continue'));
		expect(row('phone')).toHaveTextContent('Γράψτε ένα έγκυρο κινητό, π.χ. 6941234567.');
		expect(ports.phone.start).not.toHaveBeenCalled();

		await user().type(field, '7654321');
		ports.phone.start.mockRejectedValueOnce(refused('taken'));
		await user().click(screen.getByTestId('personal-phone-continue'));
		await waitFor(() =>
			expect(row('phone')).toHaveTextContent(
				'Αυτό το κινητό χρησιμοποιείται ήδη σε άλλον λογαριασμό.'
			)
		);
		ports.phone.start.mockResolvedValueOnce({ alreadyVerified: true });
		await user().click(screen.getByTestId('personal-phone-continue'));
		await waitFor(() =>
			expect(row('phone')).toHaveTextContent('Το κινητό σας είναι ήδη επιβεβαιωμένο.')
		);
		ports.phone.start.mockRejectedValueOnce(refused('rate-limited'));
		await user().click(screen.getByTestId('personal-phone-continue'));
		await waitFor(() =>
			expect(row('phone')).toHaveTextContent('Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.')
		);
		expect(screen.queryByTestId('personal-code-input')).toBeNull();
	});

	it('(negative) a wrong code keeps the old number; 🔴 U-84: a session that ended at the code step opens the sign-in and the page keeps nothing typed', async () => {
		const handle = await draw();
		await open('phone');
		await user().type(input('personal-phone-input'), '6977654321');
		await user().click(screen.getByTestId('personal-phone-continue'));
		const code = await screen.findByTestId('personal-code-input');
		ports.phone.verify.mockRejectedValueOnce(refused('invalid-code'));
		await user().type(code, '000000');
		await user().click(screen.getByTestId('personal-code-verify'));
		await waitFor(() =>
			expect(row('phone')).toHaveTextContent('Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.')
		);
		expect(ports.refresh).not.toHaveBeenCalled();
		ports.phone.verify.mockRejectedValueOnce(refused('session'));
		await user().type(code, '111111');
		await user().click(screen.getByTestId('personal-code-verify'));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		expect(screen.queryByTestId('personal-details')).toBeNull();
		expect(document.body.innerHTML).not.toMatch(/6977654321|111111/u);
	});
});

describe('profile/ui/personal · 🔴 U-65.6: what a person or a server says is drawn as text', () => {
	it('(negative) markup in a name or in a mask is words, never elements; no raw HTML in the slice', async () => {
		await draw({
			member: {
				...ELENI,
				firstName: '<img src=x onerror=alert(1)>',
				maskedLoginEmail: '<b>e***a</b>@example.gr'
			}
		});
		await waitFor(() => expect(row('name')).toBeInTheDocument());
		expect(row('name')).toHaveTextContent('<img src=x onerror=alert(1)> Παππά');
		expect(row('name').querySelector('img')).toBeNull();
		expect(row('email').querySelector('b')).toBeNull();
	});
});
