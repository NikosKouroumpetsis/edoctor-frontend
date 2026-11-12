import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync, type Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import type { ProfileScreenData } from '../types';
import HostedHarness from './hosted.harness.svelte';
import Harness from './screen.harness.svelte';

/*
 * The «Προφίλ» route (D-W4-51): the tab at `/profile`, and screen 55 composed under it — the relatives read from a
 * stubbed API, the deletion window's upcoming visit named with its doctor's public profile (D-W4-29). Made-up people.
 */

const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

type Call = { url: string; method: string; credentials?: RequestCredentials };
let calls: Call[];
/** Who the server answers for (`/patient/me`), and the relatives it keeps for that person. */
let person: string;
/** The answer of a write (`POST` / `PATCH` / `DELETE`), when the test gives one. */
let written: (() => Response) | null;
/** What every write carried, in order. */
let bodies: unknown[];

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

beforeEach(() => {
	calls = [];
	person = 'pat-1';
	written = null;
	bodies = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init: RequestInit = {}) => {
			calls.push({ url: input, method: init.method ?? 'GET', credentials: init.credentials });
			const path = new URL(input, 'https://api.test').pathname.replace(/^\/api\/v\d+/u, '');
			if (init.method && init.method !== 'GET') {
				bodies.push(init.body ? JSON.parse(String(init.body)) : null);
				if (written) return written();
			}
			if (path === '/patient/me') return json({ id: person, firstName: 'Ελένη', relatives: [] });
			if (path === '/patient/pat-2/relatives') return json([]);
			if (path === '/patient/pat-1/relatives') {
				return json([
					{
						id: ID,
						patientId: 'pat-1',
						firstName: 'Γιώργος',
						lastName: 'Παππάς',
						relationship: 'CHILD',
						gender: 'MALE'
					}
				]);
			}
			if (path === '/appointment/appointments') {
				return json({
					items: [
						{
							id: 'ap-1',
							doctorId: 'doc-athina',
							officeId: 'off-1',
							patientId: 'pat-1',
							officeTimeZone: 'Europe/Athens',
							status: 'booked',
							bookedForType: 'RELATIVE',
							relativeId: ID,
							startTime: '2026-11-24T15:30:00.000Z'
						}
					],
					nextCursor: null,
					total: 1
				});
			}
			if (path.startsWith('/doctor/public/doctors/')) {
				return json({
					doctor: { doctorId: 'doc-athina', slug: 'dr-athina', fullName: 'Αθηνά Παπαδοπούλου' }
				});
			}
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
	visit('/');
	page.state = {};
});

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

function draw(data: ProfileScreenData, start: SessionStatus = 'member') {
	return render(QueryHarness, {
		props: { component: Harness as unknown as Component<never>, props: { data, start } }
	});
}

type Handle = {
	session: Session;
	signIn: () => void;
	otherSignsIn: () => void;
	go: (next: ProfileScreenData) => void;
};

/** The screen with the harness's session in hand: what a `401`, a sign-in or another account do to it. */
function drawWithSession(data: ProfileScreenData, start: SessionStatus = 'member') {
	let handle: Handle | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { data, start, onReady: (found: Handle) => (handle = found) }
		}
	});
	return () => handle as Handle;
}

describe('screens/profile/[...path] (D-W4-51: one route in the place of `/profile`)', () => {
	it('U-81.1: `/profile` is still the application’s «Προφίλ» tab, and asks the server nothing of the relatives', () => {
		visit('/profile');
		draw({ address: { view: 'tab' } });
		expect(screen.getByRole('heading', { level: 1, name: 'Προφίλ' })).toBeInTheDocument();
		expect(screen.getByTestId('profile-page')).toBeInTheDocument();
		expect(screen.queryByTestId('relatives-page')).toBeNull();
		expect(document.title).toBe('Προφίλ | eDoctor');
		expect(calls).toEqual([]);
	});

	it('D-W4-56: a member’s «Οι συγγενείς μου» row leads to screen 55', () => {
		visit('/profile');
		draw({ address: { view: 'tab' } });
		expect(screen.getByRole('link', { name: /Οι συγγενείς μου/u })).toHaveAttribute(
			'href',
			'/profile/relatives'
		);
	});

	it('🔴 U-65.6: «Οι συγγενείς μου» and its form name themselves in the tab, never a relative, never indexed; (negative) no relative’s id is drawn', async () => {
		for (const address of [
			{ view: 'relatives' },
			{ view: 'relative-new' },
			{ view: 'relative-edit', relativeId: ID }
		] as const) {
			visit('/profile/relatives');
			const view = draw({ address });
			expect(document.title, address.view).toBe('Οι συγγενείς μου | eDoctor');
			expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
				'content',
				'noindex'
			);
			expect(screen.getByTestId('relatives-page')).toHaveAttribute('data-view', address.view);
			expect(screen.queryByTestId('profile-page')).toBeNull();
			await waitFor(() => expect(screen.getAllByText(/Γιώργος/u).length).toBeGreaterThan(0));
			expect(document.title).not.toMatch(/Γιώργος|Παππάς/u);
			expect(document.body.textContent).not.toContain(ID);
			view.unmount();
		}
	});

	it('🔴 D-W4-63 (negative): an address made by hand — `?done=del&name=…` — says nothing: «… διαγράφηκε.» comes from the page’s memory alone, never from what an address carries', async () => {
		visit(
			'/profile/relatives?done=del&name=%CE%93%CE%B9%CF%8E%CF%81%CE%B3%CE%BF%CF%82&gender=MALE'
		);
		draw({ address: { view: 'relatives' } });
		await waitFor(() => expect(screen.getAllByText(/Γιώργος/u).length).toBeGreaterThan(0));
		expect(screen.queryByTestId('relatives-done')).toBeNull();
		expect(screen.getByTestId('relatives-page')).not.toHaveTextContent('διαγράφηκε');
	});

	it('U-80.1 Ε6 · U-139.1: a guest asks the server nothing and reads «Συνδεθείτε για τους συγγενείς σας»', () => {
		visit('/profile/relatives');
		draw({ address: { view: 'relatives' } }, 'guest');
		expect(screen.getByTestId('relatives-guest')).toBeInTheDocument();
		expect(screen.getByTestId('relatives-split')).toHaveAttribute('data-solo');
		expect(calls).toEqual([]);
	});

	it('🔴 D-W4-21 · D-W4-29 composed: the deletion window reads the upcoming once and names the first visit’s doctor from ONE public profile, anonymous', async () => {
		visit(`/profile/relatives/${ID}`);
		draw({ address: { view: 'relative-edit', relativeId: ID } });
		await waitFor(() => expect(screen.getByTestId('relatives-delete')).toBeInTheDocument());
		expect(calls.filter((call) => call.url.includes('/doctor/public/'))).toEqual([]);
		await userEvent.setup({ delay: null }).click(screen.getByTestId('relatives-delete'));
		const dialog = await screen.findByRole('dialog', { name: 'Διαγραφή συγγενή;' });
		await waitFor(() =>
			expect(within(dialog).getByTestId('relatives-delete-upcoming')).toHaveTextContent(
				'Έχει 1 επερχόμενο ραντεβού, που θα γίνει κανονικά: Τρίτη 24 Νοεμβρίου · 17:30 · Dr. Αθηνά Παπαδοπούλου.'
			)
		);
		const doctors = calls.filter((call) => call.url.includes('/doctor/public/'));
		expect(doctors).toHaveLength(1);
		expect(doctors[0].credentials).toBe('omit');
		expect(calls.filter((call) => call.url.includes('/appointment/appointments'))).toHaveLength(1);
	});
});

describe('screens/profile/[...path] · 🔴 D-W4-78 (review w4-w9-r1 MAJOR-1, U-84): a session that ends on an open form of screen 55', () => {
	const NEW: ProfileScreenData = { address: { view: 'relative-new' } };
	const EDIT: ProfileScreenData = { address: { view: 'relative-edit', relativeId: ID } };
	const WORDS = 'Δοκιμαστικός';
	const press = () => userEvent.setup({ delay: null });
	const unauthorized = () =>
		new Response(JSON.stringify({ errorCode: 'EC401', errorMessage: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	const firstName = () => screen.getByTestId('relatives-form-first-name');
	const lastName = () => screen.getByTestId('relatives-form-last-name');
	/** Nothing of the person who left: no relative's name, no word typed — in no text and in no field. */
	const nothingOfTheirs = () => {
		const body = document.body.textContent ?? '';
		for (const word of ['Γιώργος', 'Παππάς', WORDS]) expect(body, word).not.toContain(word);
		for (const field of document.body.querySelectorAll('input, textarea')) {
			const value = (field as HTMLInputElement).value;
			for (const word of ['Γιώργος', 'Παππάς', WORDS]) expect(value, word).not.toContain(word);
		}
	};
	const relativesReads = () =>
		calls.filter((call) => call.method === 'GET' && call.url.includes('/relatives'));

	/** The relative on file with a new last name typed, saved, and refused with `401`: the session ends as the site's. */
	async function expireOnEdit() {
		visit(`/profile/relatives/${ID}`);
		const handle = drawWithSession(EDIT);
		await waitFor(() => expect(firstName()).toHaveValue('Γιώργος'));
		await press().clear(lastName());
		await press().type(lastName(), WORDS);
		written = unauthorized;
		await press().click(screen.getByTestId('booking-save'));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		await Promise.resolve();
		flushSync();
		return { handle, field: lastName() };
	}

	it('55 · «Νέος συγγενής», the `401` of «Αποθήκευση»: the very same form with what was typed stays under the sign-in, the address is NOT replaced with the list’s; signed in again the same fields, and the save goes through', async () => {
		visit('/profile/relatives/new');
		const handle = drawWithSession(NEW);
		await screen.findByRole('heading', { level: 2, name: 'Νέος συγγενής' });
		await waitFor(() => expect(relativesReads().length).toBeGreaterThan(0));
		await press().type(firstName(), 'Μαρία');
		await press().type(lastName(), WORDS);
		await press().click(screen.getByTestId('relatives-form-relationship'));
		await press().click(await screen.findByRole('option', { name: 'Παιδί' }));
		await press().click(screen.getByTestId('relatives-form-gender'));
		await press().click(await screen.findByRole('option', { name: 'Γυναίκα' }));
		const field = lastName();
		written = unauthorized;
		await press().click(screen.getByTestId('booking-save'));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		await Promise.resolve();
		flushSync();
		expect(lastName()).toBe(field);
		expect(field).toHaveValue(WORDS);
		expect(firstName()).toHaveValue('Μαρία');
		expect(handle().session.status).toBe('guest');
		expect(handle().session.expired).toBe(true);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(screen.getByTestId('relatives-split')).toHaveAttribute('data-open');

		const asked = relativesReads().length;
		handle().signIn();
		flushSync();
		expect(lastName()).toBe(field);
		await waitFor(() => expect(relativesReads().length).toBeGreaterThan(asked));
		await Promise.resolve();
		flushSync();
		expect(lastName()).toBe(field);
		expect(field).toHaveValue(WORDS);
		expect(firstName()).toHaveValue('Μαρία');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();

		written = () =>
			json(
				{
					id: 'rel-new',
					patientId: 'pat-1',
					firstName: 'Μαρία',
					lastName: WORDS,
					relationship: 'CHILD',
					gender: 'FEMALE'
				},
				201
			);
		await waitFor(() => expect(screen.getByTestId('booking-save')).toBeEnabled());
		await press().click(screen.getByTestId('booking-save'));
		await waitFor(() => expect(bodies).toHaveLength(2));
		expect(bodies[1]).toEqual(bodies[0]);
		expect(bodies[1]).toMatchObject({ firstName: 'Μαρία', lastName: WORDS });
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
		);
	});

	it('55 · the relative on file and «Διαγραφή συγγενή;», the `401` of «Διαγραφή»: the window is NOT lost — it stays open over the same form, with what was typed — and the address stays; signed in again the window reads the upcoming anew and ONE press deletes', async () => {
		visit(`/profile/relatives/${ID}`);
		const handle = drawWithSession(EDIT);
		await waitFor(() => expect(firstName()).toHaveValue('Γιώργος'));
		await press().clear(lastName());
		await press().type(lastName(), WORDS);
		const field = lastName();
		await press().click(screen.getByTestId('relatives-delete'));
		const dialog = await screen.findByRole('dialog', { name: 'Διαγραφή συγγενή;' });
		const confirm = within(dialog).getByTestId('relatives-delete-confirm');
		await waitFor(() => expect(confirm).toBeEnabled());
		written = unauthorized;
		await press().click(confirm);
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		await Promise.resolve();
		flushSync();
		expect(screen.getByRole('dialog', { name: 'Διαγραφή συγγενή;' })).toBe(dialog);
		expect(dialog).toHaveTextContent('Ο Γιώργος Παππάς θα αφαιρεθεί');
		expect(lastName()).toBe(field);
		expect(field).toHaveValue(WORDS);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();

		const scans = () => calls.filter((call) => call.url.includes('/appointment/appointments'));
		const scanned = scans().length;
		handle().signIn();
		await waitFor(() => expect(scans().length).toBeGreaterThan(scanned));
		await waitFor(() =>
			expect(within(dialog).getByTestId('relatives-delete-upcoming')).toHaveTextContent(
				'Έχει 1 επερχόμενο ραντεβού'
			)
		);
		expect(screen.getByRole('dialog', { name: 'Διαγραφή συγγενή;' })).toBe(dialog);
		expect(lastName()).toBe(field);
		expect(field).toHaveValue(WORDS);

		written = () => json({ id: ID });
		await waitFor(() => expect(confirm).toBeEnabled());
		await press().click(confirm);
		await waitFor(() => expect(calls.filter((call) => call.method === 'DELETE')).toHaveLength(2));
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
		);
	});

	it('(negative · α) 🔴 D-W4-64 as it is: a guest who OPENS a form’s address is taken to the list’s, with the guest’s «Σύνδεση» — no form, nothing asked, and no session «ended» here', async () => {
		for (const data of [NEW, EDIT]) {
			vi.mocked(goto).mockClear();
			visit('/profile/relatives/new');
			const handle = drawWithSession(data, 'guest');
			await waitFor(() =>
				expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
			);
			expect(handle().session.expired).toBe(false);
			expect(screen.getByTestId('relatives-guest')).toBeInTheDocument();
			expect(screen.queryByTestId('relatives-form')).toBeNull();
			expect(calls).toEqual([]);
			cleanup();
		}
	});

	it('(negative · β) a sign-out BY HAND on the open form, words typed: the form leaves at once for the list’s address and its guest’s page — nothing of the relative, no word typed, nothing more asked', async () => {
		visit(`/profile/relatives/${ID}`);
		const handle = drawWithSession(EDIT);
		await waitFor(() => expect(firstName()).toHaveValue('Γιώργος'));
		await press().clear(lastName());
		await press().type(lastName(), WORDS);
		const asked = calls.length;
		await handle().session.signOut();
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
		);
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		expect(screen.getByTestId('relatives-guest')).toBeInTheDocument();
		nothingOfTheirs();
		await Promise.resolve();
		expect(calls).toHaveLength(asked);
	});

	it('(negative · γ) the sign-in CLOSED without signing in: the list’s address and its guest’s page — no form, no window, nothing of the relative, no word typed, nothing asked', async () => {
		const { handle, field } = await expireOnEdit();
		expect(field).toHaveValue(WORDS);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		const asked = calls.length;
		handle().session.cancelSignIn();
		flushSync();
		expect(handle().session.expired).toBe(false);
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		expect(screen.getByTestId('relatives-guest')).toBeInTheDocument();
		nothingOfTheirs();
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
		);
		expect(calls).toHaveLength(asked);
	});

	it('(negative · δ) ANOTHER account signs in over the ended session: the last person’s form and words are gone the moment that account is known; the new one’s relatives are read and the address gives way to its list — never the old form', async () => {
		const { handle, field } = await expireOnEdit();
		expect(field).toHaveValue(WORDS);
		person = 'pat-2';
		handle().otherSignsIn();
		flushSync();
		expect(handle().session.expired).toBe(false);
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		nothingOfTheirs();
		await waitFor(() =>
			expect(calls.some((call) => call.url.includes('/patient/pat-2/relatives'))).toBe(true)
		);
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
		);
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		nothingOfTheirs();
	});

	it('(negative · β) another account in the same tab on the open form (no session ended): the last person’s form and words leave at once', async () => {
		visit(`/profile/relatives/${ID}`);
		const handle = drawWithSession(EDIT);
		await waitFor(() => expect(firstName()).toHaveValue('Γιώργος'));
		await press().clear(lastName());
		await press().type(lastName(), WORDS);
		person = 'pat-2';
		handle().otherSignsIn();
		flushSync();
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		nothingOfTheirs();
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
		);
		nothingOfTheirs();
	});

	/*
	 * Review w4-w10-r2 MINOR-2 · «Νέος συγγενής» is the ONE address every account shares (`/profile/relatives/new`, the
	 * key `new`): nothing of the address tells the first person's half-written form from the next account's.
	 */
	/** What the first person typed (made up; the ΑΜΚΑ fails Luhn, as every one a spec writes). */
	const TYPED = {
		firstName: 'Μαρία',
		lastName: WORDS,
		phone: '6941234567',
		email: 'maria@example.test',
		amka: '14031512345'
	};
	/** Theirs: what they typed, and the relative the server keeps for them. */
	const THEIRS = [...Object.values(TYPED), 'Γιώργος', 'Παππάς'];
	const field = (name: string) => screen.getByTestId(`relatives-form-${name}`) as HTMLInputElement;
	const TYPED_FIELDS = [
		['first-name', TYPED.firstName],
		['last-name', TYPED.lastName],
		['phone', TYPED.phone],
		['email', TYPED.email],
		['amka', TYPED.amka]
	] as const;

	/** «Νέος συγγενής» of the first person, every field of it typed and both choices made — nothing saved yet. */
	async function halfWritten() {
		visit('/profile/relatives/new');
		const handle = drawWithSession(NEW);
		await screen.findByRole('heading', { level: 2, name: 'Νέος συγγενής' });
		await waitFor(() => expect(relativesReads().length).toBeGreaterThan(0));
		for (const [name, value] of TYPED_FIELDS) await press().type(field(name), value);
		await press().click(field('relationship'));
		await press().click(await screen.findByRole('option', { name: 'Παιδί' }));
		await press().click(field('gender'));
		await press().click(await screen.findByRole('option', { name: 'Γυναίκα' }));
		for (const [name, value] of TYPED_FIELDS) expect(field(name), name).toHaveValue(value);
		expect(field('relationship')).toHaveTextContent('Παιδί');
		expect(field('gender')).toHaveTextContent('Γυναίκα');
		return { handle, fields: TYPED_FIELDS.map(([name]) => field(name)) };
	}

	/** What is theirs on the page right now: in a text, an attribute or the tab's title, and in what a field holds. */
	function theirsOnPage(): string[] {
		const drawn = `${document.title}\n${document.body.innerHTML}`;
		const held = [...document.body.querySelectorAll('input, textarea, select')].map((input) =>
			(input as HTMLInputElement).value.replace(/\s/gu, '')
		);
		return THEIRS.flatMap((word) => [
			...(drawn.includes(word) ? [`drawn: ${word}`] : []),
			...(held.some((value) => value.includes(word)) ? [`in a field: ${word}`] : [])
		]);
	}
	const TYPED_SIGHTINGS = Object.values(TYPED).map((word) => `in a field: ${word}`);

	/** Reads the page at every change of it from here on: `found` is every sighting of theirs — none, for «never». */
	function watchForTheirs() {
		const found = new Set<string>();
		const observer = new MutationObserver(() => {
			for (const sighting of theirsOnPage()) found.add(sighting);
		});
		observer.observe(document.body, {
			subtree: true,
			childList: true,
			attributes: true,
			characterData: true
		});
		onTestFinished(() => observer.disconnect());
		return { found: () => [...found] };
	}

	/** The other account's own «Νέος συγγενής»: another form than the one that was there, with nothing in it. */
	async function expectTheirOwnEmptyForm(old: HTMLInputElement[]) {
		await waitFor(() =>
			expect(calls.some((call) => call.url.includes('/patient/pat-2/relatives'))).toBe(true)
		);
		await screen.findByRole('heading', { level: 2, name: 'Νέος συγγενής' });
		for (const [index, [name]] of TYPED_FIELDS.entries()) {
			expect(field(name), name).not.toBe(old[index]);
			expect(old[index].isConnected, name).toBe(false);
			expect(field(name), name).toHaveValue('');
		}
		expect(field('relationship')).not.toHaveTextContent('Παιδί');
		expect(field('gender')).not.toHaveTextContent('Γυναίκα');
	}

	it('(negative · δ, review w4-w10-r2 MINOR-2) 🔴 «Νέος συγγενής»: the session ends on the half-written form (`401` of «Αποθήκευση»), then ANOTHER account signs in: the form is gone the moment that account is known and nothing the first person typed is EVER drawn again — the form the other account then gets is its own, another one, empty', async () => {
		const { handle, fields } = await halfWritten();
		written = unauthorized;
		await press().click(screen.getByTestId('booking-save'));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		await Promise.resolve();
		flushSync();
		// The form under the sign-in is the same one, with what was typed (D-W4-78): the test starts from a kept form.
		expect(handle().session.expired).toBe(true);
		expect(handle().session.status).toBe('guest');
		for (const [index, [name, value]] of TYPED_FIELDS.entries()) {
			expect(field(name), name).toBe(fields[index]);
			expect(field(name), name).toHaveValue(value);
		}
		expect(bodies).toHaveLength(1);
		const sent = JSON.stringify(bodies[0]);
		for (const value of Object.values(TYPED)) expect(sent, value).toContain(value);

		// The reader of the page itself: on the kept form it finds every word typed, each in its field.
		expect(theirsOnPage()).toEqual(expect.arrayContaining(TYPED_SIGHTINGS));

		const watch = watchForTheirs();
		person = 'pat-2';
		handle().otherSignsIn();
		flushSync();
		expect(handle().session.expired).toBe(false);
		expect(handle().session.status).toBe('member');
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		expect(theirsOnPage()).toEqual([]);

		await expectTheirOwnEmptyForm(fields);
		expect(theirsOnPage()).toEqual([]);
		expect(watch.found()).toEqual([]);
		expect(bodies).toHaveLength(1);
	});

	it('(negative · β, review w4-w10-r2 MINOR-2) 🔴 «Νέος συγγενής»: ANOTHER account in the same tab on the half-written form (no session ended): the same — gone at once, nothing of it ever drawn again, the other account’s form its own and empty', async () => {
		const { handle, fields } = await halfWritten();
		expect(theirsOnPage()).toEqual(expect.arrayContaining(TYPED_SIGHTINGS));

		const watch = watchForTheirs();
		person = 'pat-2';
		handle().otherSignsIn();
		flushSync();
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		expect(theirsOnPage()).toEqual([]);

		await expectTheirOwnEmptyForm(fields);
		expect(theirsOnPage()).toEqual([]);
		expect(watch.found()).toEqual([]);
		expect(bodies).toEqual([]);
	});

	describe('🔴 U-153 (card w4-w12; live check w4-live-web-3 Δ5): screen 55’s form under the sign-in of an ended session, when the browser puts the page back from its back/forward cache — under the site’s REAL host', () => {
		/** The browser shows the page: put back from its back/forward cache as it was left (`persisted`), or loaded. */
		function pageShown(persisted: boolean) {
			const event = new Event('pageshow');
			Object.defineProperty(event, 'persisted', { value: persisted });
			window.dispatchEvent(event);
		}
		const signIn = () => screen.queryByTestId('auth-dialog');

		/** The relative on file with a new last name typed, saved, and refused with `401`: the site's sign-in over it. */
		async function endOnEdit() {
			visit(`/profile/relatives/${ID}`);
			render(QueryHarness, {
				props: { component: HostedHarness as unknown as Component<never>, props: { data: EDIT } }
			});
			await waitFor(() => expect(firstName()).toHaveValue('Γιώργος'));
			await press().clear(lastName());
			await press().type(lastName(), WORDS);
			const field = lastName();
			written = unauthorized;
			await press().click(screen.getByTestId('booking-save'));
			await waitFor(() => expect(signIn()).toHaveAttribute('data-state', 'open'));
			await Promise.resolve();
			flushSync();
			expect(lastName()).toBe(field);
			expect(field).toHaveValue(WORDS);
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
			return field;
		}

		it('55 · put back with the ended session under its sign-in: the list’s address and its guest’s page as by «×» — the sign-in closed, no form, nothing of the relative, no word typed', async () => {
			await endOnEdit();
			pageShown(true);
			await waitFor(() => expect(screen.getByTestId('relatives-guest')).toBeInTheDocument());
			expect(screen.queryByTestId('relatives-form')).toBeNull();
			await waitFor(() => expect(signIn()).not.toBeInTheDocument());
			nothingOfTheirs();
			await waitFor(() =>
				expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
			);
		});

		it('(negative) merely shown (`persisted` false): the form stays under the sign-in — the very same field, the word typed, the address its own', async () => {
			const field = await endOnEdit();
			pageShown(false);
			await new Promise((done) => setTimeout(done, 0));
			flushSync();
			expect(lastName()).toBe(field);
			expect(field).toHaveValue(WORDS);
			expect(signIn()).toHaveAttribute('data-state', 'open');
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
		});
	});
});
