import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { onlineManager, type QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import type { RelativesAddress } from '../types';
import Harness from './relatives.harness.svelte';

/*
 * Screen 55 «Οι συγγενείς μου» (record §11, U-139; P-W4 §4.6): the list, a relative's form (new or on file), the
 * deletion asked in a window with the relative's upcoming visits, the page's memory after a write. The server's answers
 * are stubbed; made-up people.
 */

const GIORGOS = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a01';
const ANNA = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a02';
const NIKOS = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a03';
const MARIA = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a04';

/** A relative as the server answers it (`RelativeView`). */
const relativeView = (id: string, extra: Record<string, unknown> = {}) => ({
	id,
	patientId: 'pat-1',
	firstName: 'Γιώργος',
	lastName: 'Παππάς',
	relationship: 'CHILD',
	gender: 'MALE',
	phone: null,
	email: null,
	amka: null,
	afm: null,
	...extra
});

/** One upcoming visit as the list answers it (only what the window reads: whose it is, when, which doctor). */
const visit = (id: string, relativeId: string | null, startTime: string) => ({
	id,
	doctorId: 'doc-athina',
	officeId: 'off-1',
	patientId: 'pat-1',
	officeTimeZone: 'Europe/Athens',
	status: 'booked',
	bookedForType: relativeId ? 'RELATIVE' : 'SELF',
	relativeId,
	startTime,
	endTime: startTime
});

type Call = { url: string; method: string; body?: Record<string, unknown> };
let calls: Call[];
let relatives: ReturnType<typeof relativeView>[];
let upcoming: ReturnType<typeof visit>[];
/** The upcoming scan answered page by page (its `cursor`), when a test tells the pages apart. */
let scanPages: ((cursor: string | null) => Response | Promise<Response>) | null;
let answers: Record<string, () => Response>;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const refusal = (status: number, errorMessage: string) =>
	new Response(JSON.stringify({ errorCode: 'EC000', errorMessage }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

beforeEach(() => {
	calls = [];
	answers = {};
	scanPages = null;
	relatives = [
		relativeView(GIORGOS, { amka: '14031512345' }),
		relativeView(ANNA, {
			firstName: 'Άννα',
			lastName: 'Παππά',
			relationship: 'PARENT',
			gender: 'FEMALE',
			phone: '+306941234567',
			email: 'anna@example.test'
		}),
		relativeView(NIKOS, {
			firstName: 'Νίκος',
			lastName: 'Δημητρίου',
			relationship: 'SPOUSE',
			gender: 'MALE'
		})
	];
	upcoming = [
		visit('ap-1', GIORGOS, '2026-11-24T15:30:00.000Z'),
		visit('ap-2', null, '2026-11-25T09:00:00.000Z')
	];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
			const path = new URL(url, 'https://api.test').pathname.replace(/^\/api\/v\d+/u, '');
			const answer = answers[`${method} ${path}`];
			if (answer) return answer();
			if (path === '/patient/me') return json({ id: 'pat-1', firstName: 'Ελένη', relatives: [] });
			if (path === '/patient/pat-1/relatives' && method === 'GET') return json(relatives);
			// The server keeps what was written: the next read of the list says it (a new one is always «Μαρία»'s id).
			const body = init.body ? JSON.parse(String(init.body)) : {};
			if (path === '/patient/pat-1/relatives' && method === 'POST') {
				const made = relativeView(MARIA, body);
				relatives = [...relatives, made];
				return json(made, 201);
			}
			const one = path.match(/^\/patient\/pat-1\/relatives\/([^/]+)$/u)?.[1];
			if (one && method === 'PATCH') {
				relatives = relatives.map((entry) => (entry.id === one ? { ...entry, ...body } : entry));
				return json(relatives.find((entry) => entry.id === one));
			}
			if (one && method === 'DELETE') {
				const gone = relatives.find((entry) => entry.id === one);
				relatives = relatives.filter((entry) => entry.id !== one);
				return json(gone);
			}
			if (path === '/appointment/appointments') {
				const cursor = new URL(url, 'https://api.test').searchParams.get('cursor');
				if (scanPages) return scanPages(cursor);
				return json({ items: upcoming, nextCursor: null, total: upcoming.length });
			}
			return json({});
		})
	);
	narrow();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	page.state = {};
});

const media = (matches: boolean) =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
const narrow = () => media(false);
const wide = () => media(true);

const user = () => userEvent.setup({ delay: null });

function draw(
	address: RelativesAddress,
	{
		start = 'member',
		depth = 0,
		hasPatientProfile = true,
		offline = false
	}: { start?: SessionStatus; depth?: number; hasPatientProfile?: boolean; offline?: boolean } = {}
) {
	page.state = depth ? { relatives: { depth } } : {};
	const go = vi.spyOn(history, 'go').mockImplementation(() => {});
	const handle: {
		session?: Session;
		client?: QueryClient;
		go?: (next: RelativesAddress) => void;
		signOut?: () => void;
	} = {};
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				start,
				address,
				hasPatientProfile,
				offline,
				doctors: { 'doc-athina': 'Αθηνά Παπαδοπούλου' },
				onReady: (ready: Required<typeof handle>) => Object.assign(handle, ready)
			}
		}
	});
	return { go, handle };
}

const LIST: RelativesAddress = { view: 'list' };
const NEW: RelativesAddress = { view: 'new' };
const edit = (relativeId: string): RelativesAddress => ({ view: 'edit', relativeId });

const split = () => screen.getByTestId('relatives-split');
const listColumn = () => screen.getByTestId('relatives-list');
const rows = () => screen.queryAllByTestId('relatives-row');
const save = () => screen.getByTestId('booking-save');
const writes = () => calls.filter((call) => call.method !== 'GET');
const reads = (part: string) =>
	calls.filter((call) => call.method === 'GET' && call.url.includes(part));

describe('screen 55 · «Οι συγγενείς μου» (record §11.2, U-139)', () => {
	it('the list: «←» to the «Προφίλ», the title, the lead, a row per relative — its initial, name and word (🔴 U-139.5) — and «Προσθήκη συγγενή»; below 950 the list alone', async () => {
		draw(LIST);
		await waitFor(() => expect(rows()).toHaveLength(3));
		expect(screen.getByTestId('relatives-back')).toHaveAttribute('href', '/profile');
		expect(screen.getByTestId('relatives-back')).toHaveClass('split:hidden');
		expect(screen.getByRole('heading', { level: 1, name: 'Οι συγγενείς μου' })).toBeInTheDocument();
		expect(listColumn()).toHaveTextContent('Τα άτομα για τα οποία κλείνετε ραντεβού.');
		expect(rows().map((row) => row.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'Γ Γιώργος Παππάς Γιος',
			'Ά Άννα Παππά Μητέρα',
			'Ν Νίκος Δημητρίου Σύζυγος'
		]);
		expect(rows()[1]).toHaveAttribute('href', `/profile/relatives/${ANNA}`);
		expect(screen.getByTestId('relatives-add')).toHaveAttribute('href', '/profile/relatives/new');
		expect(split()).not.toHaveAttribute('data-solo');
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		// U-80.1 Ε6: the person's relatives, with the cookies, once.
		expect(reads('/patient/pat-1/relatives')).toHaveLength(1);
	});

	it('🔴 U-139.5 (negative): «Μη δυαδικό», «Άλλο» or no gender read the neutral word, and «Άλλη σχέση» stays', async () => {
		relatives = [
			relativeView(GIORGOS, { gender: 'NON_BINARY' }),
			relativeView(ANNA, { relationship: 'SIBLING', gender: 'OTHER_GENE' }),
			relativeView(NIKOS, { relationship: 'OTHER_RELE', gender: 'FEMALE' })
		];
		draw(LIST);
		await waitFor(() => expect(rows()).toHaveLength(3));
		expect(rows().map((row) => row.querySelectorAll('span')[3]?.textContent?.trim())).toEqual([
			'Παιδί',
			'Αδελφός/ή',
			'Άλλη σχέση'
		]);
	});

	it('the limit (record §11.2): at 20 «Προσθήκη συγγενή» sleeps with «Έχετε φτάσει τον μέγιστο αριθμό συγγενών.»; (negative) at 19 it opens', async () => {
		relatives = Array.from({ length: 20 }, (_, index) =>
			relativeView(`0193a1b2-7c3d-7e4f-8a9b-${String(index).padStart(12, '0')}`)
		);
		const view = draw(LIST);
		await waitFor(() => expect(rows()).toHaveLength(20));
		expect(screen.getByTestId('relatives-add')).toHaveAttribute('aria-disabled', 'true');
		expect(screen.getByTestId('relatives-add')).not.toHaveAttribute('href');
		expect(screen.getByTestId('relatives-limit')).toHaveTextContent(
			'Έχετε φτάσει τον μέγιστο αριθμό συγγενών.'
		);
		view.go.mockRestore();
		cleanup();
		relatives = relatives.slice(1);
		draw(LIST);
		await waitFor(() => expect(rows()).toHaveLength(19));
		expect(screen.getByTestId('relatives-add')).not.toHaveAttribute('aria-disabled');
		expect(screen.queryByTestId('relatives-limit')).toBeNull();
	});

	it('U-102: a row opens the relative’s form one step on (`relatives.depth` 1), «Προσθήκη συγγενή» the new one; a new tab keeps the link', async () => {
		draw(LIST);
		await waitFor(() => expect(rows()).toHaveLength(3));
		await user().click(rows()[1]);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/profile/relatives/${ANNA}`, {
			state: { relatives: { depth: 1 } }
		});
		await user().click(screen.getByTestId('relatives-add'));
		expect(vi.mocked(goto)).toHaveBeenLastCalledWith('/profile/relatives/new', {
			state: { relatives: { depth: 1 } }
		});
		vi.mocked(goto).mockClear();
		await fireEvent.click(rows()[0], { ctrlKey: true });
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});
});

describe('🔴 U-139.1 · from 950: two columns while relatives are listed, else ONE in the middle', () => {
	it('U-139.2: the list on the left and its first relative open beside it at once, in place of the list’s address (`rel.js:163`), its row framed', async () => {
		wide();
		draw(LIST);
		await waitFor(() => expect(screen.getByTestId('relatives-form')).toBeInTheDocument());
		expect(split()).not.toHaveAttribute('data-solo');
		expect(split()).toHaveAttribute('data-open');
		expect(
			screen.getByRole('heading', { level: 2, name: 'Επεξεργασία συγγενή' })
		).toBeInTheDocument();
		expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Γιώργος');
		expect(rows()[0]).toHaveAttribute('aria-current', 'page');
		expect(rows()[1]).not.toHaveAttribute('aria-current');
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/profile/relatives/${GIORGOS}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
		// `55-relatives/appt.css:468`: beside the list «←» hides — its rows are the way back.
		expect(screen.getByTestId('booking-back').parentElement).toHaveClass('split:hidden');
	});

	it('a relative of the address opens beside the list; a row there opens in place (the list keeps its scroll and focus)', async () => {
		wide();
		draw(edit(NIKOS), { depth: 1 });
		await waitFor(() =>
			expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Νίκος')
		);
		expect(rows()[2]).toHaveAttribute('aria-current', 'page');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		await user().click(rows()[1]);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/profile/relatives/${ANNA}`, {
			state: { relatives: { depth: 1 } },
			noScroll: true,
			keepFocus: true
		});
	});

	it('(negative) a guest asks nothing and reads ONE column in the middle with «Σύνδεση» over the page; no form, no auto-open', async () => {
		wide();
		const { handle } = draw(LIST, { start: 'guest' });
		expect(split()).toHaveAttribute('data-solo');
		expect(split()).not.toHaveAttribute('data-open');
		const guest = screen.getByTestId('relatives-guest');
		expect(guest).toHaveTextContent('Συνδεθείτε για τους συγγενείς σας');
		await user().click(within(guest).getByRole('button', { name: 'Σύνδεση' }));
		expect(handle.session?.flowOpen).toBe(true);
		expect(calls).toEqual([]);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('(negative) the wait, a failure, and an account with no patient: ONE column in the middle, its words; «Δοκιμάστε ξανά» reads again', async () => {
		wide();
		const waiting = render(QueryHarness, {
			props: {
				component: Harness as unknown as Component<never>,
				props: { start: 'unknown', address: edit(GIORGOS) }
			}
		});
		expect(screen.getByTestId('relatives-loading')).toBeInTheDocument();
		expect(split()).toHaveAttribute('data-solo');
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		waiting.unmount();

		answers['GET /patient/pat-1/relatives'] = () => json({}, 500);
		draw(LIST);
		const error = await screen.findByTestId('relatives-error');
		expect(error).toHaveTextContent('Δεν ήταν δυνατή η φόρτωση των συγγενών');
		expect(split()).toHaveAttribute('data-solo');
		delete answers['GET /patient/pat-1/relatives'];
		await user().click(within(error).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await waitFor(() => expect(rows()).toHaveLength(3));
		cleanup();
		calls = [];

		draw(LIST, { hasPatientProfile: false });
		expect(screen.getByTestId('relatives-error')).toHaveTextContent(
			'Φορτώνουμε ακόμη τον λογαριασμό σας. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(split()).toHaveAttribute('data-solo');
		expect(reads('/patient')).toEqual([]);
	});

	it('🔴 review w4-w7 R1 MINOR-1 (negative): «Δοκιμάστε ξανά» of an account with no patient asks the session again — the server is never asked for the relatives of nobody (`/patient//relatives`)', async () => {
		const { handle } = draw(LIST, { hasPatientProfile: false });
		const again = vi.spyOn(handle.session as Session, 'retryRead');
		const error = screen.getByTestId('relatives-error');
		await user().click(within(error).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await Promise.resolve();
		expect(again).toHaveBeenCalledOnce();
		expect(calls).toEqual([]);
	});

	it('review w4-w7 R1 MINOR-1 (negative): the person’s own read failed ⇒ «Δοκιμάστε ξανά» asks the PERSON again, never the relatives of an empty id', async () => {
		answers['GET /patient/me'] = () => json({}, 500);
		draw(LIST);
		const error = await screen.findByTestId('relatives-error');
		delete answers['GET /patient/me'];
		await user().click(within(error).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await waitFor(() => expect(rows()).toHaveLength(3));
		expect(reads('/patient/me')).toHaveLength(2);
		expect(calls.filter((call) => /\/patient\/\/|\/patient\/relatives/u.test(call.url))).toEqual(
			[]
		);
	});

	it('🔴 D-W4-62: the action of the guest’s, the failed, the «no patient» and the empty list is the DARK button of the approved prototype (`contrast`), never the outline', async () => {
		const tone = (testId: string, role: 'button' | 'link', name: string) =>
			within(screen.getByTestId(testId)).getByRole(role, { name });
		draw(LIST, { start: 'guest' });
		expect(tone('relatives-guest', 'button', 'Σύνδεση')).toHaveAttribute('data-tone', 'contrast');
		cleanup();
		answers['GET /patient/pat-1/relatives'] = () => json({}, 500);
		draw(LIST);
		await screen.findByTestId('relatives-error');
		expect(tone('relatives-error', 'button', 'Δοκιμάστε ξανά')).toHaveAttribute(
			'data-tone',
			'contrast'
		);
		cleanup();
		delete answers['GET /patient/pat-1/relatives'];
		draw(LIST, { hasPatientProfile: false });
		expect(tone('relatives-error', 'button', 'Δοκιμάστε ξανά')).toHaveAttribute(
			'data-tone',
			'contrast'
		);
		cleanup();
		relatives = [];
		draw(LIST);
		const empty = await screen.findByTestId('relatives-empty');
		expect(
			within(empty).getByText('Προσθήκη συγγενή').closest('[data-slot="button"]')
		).toHaveAttribute('data-tone', 'contrast');
	});

	it('🔴 D-W4-64: a guest at a relative’s form address (`…/new`, `…/<id>`) is taken to the LIST’s address, which shows the guest’s «Σύνδεση» — never a form with no way to sign in; the server is asked nothing', async () => {
		for (const address of [NEW, edit(GIORGOS)]) {
			vi.mocked(goto).mockClear();
			draw(address, { start: 'guest' });
			await waitFor(() =>
				expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
			);
			expect(
				within(screen.getByTestId('relatives-guest')).getByRole('button', { name: 'Σύνδεση' })
			).toBeInTheDocument();
			expect(screen.queryByTestId('relatives-form')).toBeNull();
			expect(
				screen.queryByText('Φορτώνουμε ακόμη τον λογαριασμό σας. Δοκιμάστε ξανά σε λίγο.')
			).toBeNull();
			expect(calls).toEqual([]);
			cleanup();
		}
	});

	it('D-W4-64 (negative): while the session is still read nobody is moved — a member’s own address is kept; the list’s address moves nobody', async () => {
		draw(NEW, { start: 'unknown' });
		await Promise.resolve();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		cleanup();
		draw(LIST, { start: 'guest' });
		await Promise.resolve();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('(negative) no relative yet: ONE column in the middle with «Δεν έχετε προσθέσει κανέναν ακόμη» and «Προσθήκη συγγενή»; its first «Νέος συγγενής» alone in the middle too, with «←»', async () => {
		wide();
		relatives = [];
		draw(LIST);
		const empty = await screen.findByTestId('relatives-empty');
		expect(empty).toHaveTextContent('Δεν έχετε προσθέσει κανέναν ακόμη');
		expect(split()).toHaveAttribute('data-solo');
		expect(screen.getByRole('heading', { level: 1 })).toHaveClass('split:justify-center');
		await user().click(within(empty).getByRole('button', { name: 'Προσθήκη συγγενή' }));
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives/new', {
			state: { relatives: { depth: 1 } },
			noScroll: true,
			keepFocus: true
		});
		cleanup();
		draw(NEW, { depth: 1 });
		const form = await screen.findByTestId('relatives-form');
		expect(split()).toHaveAttribute('data-solo');
		expect(split()).toHaveAttribute('data-open');
		expect(form).toHaveAttribute('data-placement', 'solo');
		expect(screen.getByTestId('booking-back').parentElement).not.toHaveClass('split:hidden');
	});
});

describe('the relative’s form (record §11.2: the fields of screen 30)', () => {
	it('on file: its values first — the names, the relationship, the gender, the mobile split by its country, the email; «Αποθήκευση» asleep until something changes', async () => {
		draw(edit(ANNA), { depth: 1 });
		await waitFor(() =>
			expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Άννα')
		);
		expect(
			screen.getByRole('heading', { level: 2, name: 'Επεξεργασία συγγενή' })
		).toBeInTheDocument();
		expect(screen.getByTestId('relatives-form-last-name')).toHaveValue('Παππά');
		expect(screen.getByTestId('relatives-form-relationship')).toHaveTextContent('Γονέας');
		expect(screen.getByTestId('relatives-form-gender')).toHaveTextContent('Γυναίκα');
		expect(screen.getByTestId('relatives-form-phone')).toHaveValue('6941234567');
		expect(screen.getByTestId('relatives-form-email')).toHaveValue('anna@example.test');
		// 🔴 U-139.6: who the mobile is for.
		expect(screen.getByTestId('relatives-form')).toHaveTextContent(
			'Για να μπορεί το ιατρείο να καλέσει τον συγγενή σας. Τις ειδοποιήσεις για το ραντεβού τις λαμβάνετε εσείς.'
		);
		expect(save()).toBeDisabled();
		// Below 950 a page of its own: «←» and «Άκυρο» go back the step they came, nothing is sent.
		expect(split()).toHaveAttribute('data-open');
		expect(screen.getByTestId('relatives-form')).toHaveAttribute('data-placement', 'pane');
		await user().type(screen.getByTestId('relatives-form-email'), 'x');
		expect(save()).toBeEnabled();
		await user().clear(screen.getByTestId('relatives-form-email'));
		await user().type(screen.getByTestId('relatives-form-email'), 'anna@example.test');
		expect(save()).toBeDisabled();
	});

	it('D-78 · P-W4 §4.6: only what changed is sent — a new last name, an emptied email as `null`; below 950 back the step it came with «Οι αλλαγές αποθηκεύτηκαν.»', async () => {
		const { go } = draw(edit(ANNA), { depth: 1 });
		await waitFor(() =>
			expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Άννα')
		);
		await user().clear(screen.getByTestId('relatives-form-last-name'));
		await user().type(screen.getByTestId('relatives-form-last-name'), ' Γεωργίου ');
		await user().clear(screen.getByTestId('relatives-form-email'));
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0]).toMatchObject({
			method: 'PATCH',
			body: { lastName: 'Γεωργίου', email: null }
		});
		expect(Object.keys(writes()[0].body ?? {}).sort()).toEqual(['email', 'lastName']);
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(screen.getByTestId('relatives-done')).toHaveTextContent('Οι αλλαγές αποθηκεύτηκαν.');
	});

	it('beside the list from 950: «Άκυρο» puts the form back as it is on file and stays; a save stays open too, as the server keeps it now', async () => {
		wide();
		const { go } = draw(edit(GIORGOS), { depth: 1 });
		await waitFor(() =>
			expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Γιώργος')
		);
		await user().clear(screen.getByTestId('relatives-form-first-name'));
		await user().type(screen.getByTestId('relatives-form-first-name'), 'Γιώργης');
		await user().click(screen.getByTestId('booking-cancel'));
		expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Γιώργος');
		expect(go).not.toHaveBeenCalled();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		await user().clear(screen.getByTestId('relatives-form-first-name'));
		await user().type(screen.getByTestId('relatives-form-first-name'), 'Γιώργης');
		await user().click(save());
		await waitFor(() =>
			expect(screen.getByTestId('relatives-done')).toHaveTextContent('Οι αλλαγές αποθηκεύτηκαν.')
		);
		expect(writes()[0].body).toEqual({ firstName: 'Γιώργης' });
		expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Γιώργης');
		expect(save()).toBeDisabled();
		expect(rows()[0]).toHaveTextContent('Γιώργης Παππάς');
		// The list read again behind it says the same (the server kept it).
		await waitFor(() => expect(reads('/patient/pat-1/relatives').length).toBeGreaterThan(1));
		expect(rows()[0]).toHaveTextContent('Γιώργης Παππάς');
		expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Γιώργης');
		expect(go).not.toHaveBeenCalled();
	});

	it('«Νέος συγγενής»: «Αποθήκευση» awake, the booking’s body; below 950 back the step it came with «Η Μαρία Παππά προστέθηκε.» (🔴 U-139.5: the article of her gender)', async () => {
		const { go } = draw(NEW, { depth: 1 });
		await screen.findByRole('heading', { level: 2, name: 'Νέος συγγενής' });
		expect(screen.queryByTestId('relatives-delete')).toBeNull();
		expect(save()).toBeEnabled();
		await waitFor(() => expect(reads('/patient/me').length).toBeGreaterThan(0));
		await user().type(screen.getByTestId('relatives-form-first-name'), 'Μαρία');
		await user().type(screen.getByTestId('relatives-form-last-name'), 'Παππά');
		await user().click(screen.getByTestId('relatives-form-relationship'));
		await user().click(await screen.findByRole('option', { name: 'Παιδί' }));
		await user().click(screen.getByTestId('relatives-form-gender'));
		await user().click(await screen.findByRole('option', { name: 'Γυναίκα' }));
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toEqual({
			firstName: 'Μαρία',
			lastName: 'Παππά',
			relationship: 'CHILD',
			gender: 'FEMALE',
			phone: null,
			email: null,
			amka: null,
			afm: null
		});
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(screen.getByTestId('relatives-done')).toHaveTextContent('Η Μαρία Παππά προστέθηκε.');
		expect(screen.getByTestId('relatives-done')).toHaveAttribute('data-tone', 'done');
	});

	it('from 950 the new relative opens beside the list in the form’s place, the steps behind it kept, with its notice', async () => {
		wide();
		const { handle, go } = draw(NEW, { depth: 1 });
		await screen.findByRole('heading', { level: 2, name: 'Νέος συγγενής' });
		expect(split()).not.toHaveAttribute('data-solo');
		await waitFor(() => expect(reads('/patient/me').length).toBeGreaterThan(0));
		await user().type(screen.getByTestId('relatives-form-first-name'), 'Μαρία');
		await user().type(screen.getByTestId('relatives-form-last-name'), 'Παππά');
		await user().click(screen.getByTestId('relatives-form-relationship'));
		await user().click(await screen.findByRole('option', { name: 'Παιδί' }));
		await user().click(screen.getByTestId('relatives-form-gender'));
		await user().click(await screen.findByRole('option', { name: 'Γυναίκα' }));
		await user().click(save());
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/profile/relatives/${MARIA}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true,
				state: { relatives: { depth: 1 } }
			})
		);
		expect(go).not.toHaveBeenCalled();
		handle.go?.(edit(MARIA));
		await waitFor(() =>
			expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Μαρία')
		);
		expect(rows().map((row) => row.textContent?.replace(/\s+/gu, ' ').trim())).toContain(
			'Μ Μαρία Παππά Κόρη'
		);
		expect(screen.getByTestId('relatives-done')).toHaveTextContent('Η Μαρία Παππά προστέθηκε.');
	});

	it('🔴 U-65.6 (negative): a name with markup stays text; every rule of the booking’s form is said before the write and nothing is sent', async () => {
		relatives = [relativeView(GIORGOS, { firstName: '<b>Γιώργος</b>' })];
		draw(LIST);
		await waitFor(() => expect(rows()).toHaveLength(1));
		expect(rows()[0]).toHaveTextContent('<b>Γιώργος</b> Παππάς');
		expect(rows()[0].querySelector('b')).toBeNull();
		cleanup();
		draw(NEW, { depth: 1 });
		await screen.findByRole('heading', { level: 2, name: 'Νέος συγγενής' });
		await user().click(save());
		expect(screen.getByText('Συμπληρώστε το όνομα.')).toBeInTheDocument();
		expect(screen.getByText('Επιλέξτε σχέση.')).toBeInTheDocument();
		expect(writes()).toEqual([]);
	});

	it('security review of the web NIT-1: the relative’s mobile is never offered from the browser’s memory of the account holder’s own, nor kept in it — `autocomplete="off"`, as the relative’s names', async () => {
		draw(NEW, { depth: 1 });
		await screen.findByRole('heading', { level: 2, name: 'Νέος συγγενής' });
		expect(screen.getByTestId('relatives-form-phone')).toHaveAttribute('autocomplete', 'off');
		expect(screen.getByTestId('relatives-form-first-name')).toHaveAttribute('autocomplete', 'off');
	});

	it('P-W4 §4.6 (negative): a change refused for a relative the person no longer keeps goes back to the list with «Αυτός ο συγγενής δεν είναι πια διαθέσιμος.»', async () => {
		answers[`PATCH /patient/pat-1/relatives/${GIORGOS}`] = () =>
			refusal(403, 'relative does not belong to patient.');
		const { go } = draw(edit(GIORGOS), { depth: 1 });
		await waitFor(() =>
			expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Γιώργος')
		);
		await user().type(screen.getByTestId('relatives-form-first-name'), 'ς');
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		const notice = screen.getByTestId('relatives-done');
		expect(notice).toHaveTextContent('Αυτός ο συγγενής δεν είναι πια διαθέσιμος.');
		expect(notice).toHaveAttribute('data-tone', 'warm');
	});

	it('review w4-w7 R1 NIT-3: from 950 a relative the server no longer keeps (the save’s 403) leaves the list AT ONCE — the first that opens beside it is never the one just lost', async () => {
		wide();
		let release = () => {};
		const held = new Promise<void>((resolve) => (release = resolve));
		answers[`PATCH /patient/pat-1/relatives/${GIORGOS}`] = () =>
			refusal(403, 'relative does not belong to patient.');
		const { handle } = draw(edit(GIORGOS));
		await waitFor(() =>
			expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Γιώργος')
		);
		// Every read after the refusal is still on its way: only the cache can tell.
		answers['GET /patient/pat-1/relatives'] = () =>
			held.then(() => json(relatives.slice(1))) as never;
		answers['GET /patient/me'] = () =>
			held.then(() => json({ id: 'pat-1', relatives: [] })) as never;
		await user().type(screen.getByTestId('relatives-form-first-name'), 'ς');
		await user().click(save());
		await waitFor(() => expect(rows()).toHaveLength(2));
		expect(rows().map((row) => row.textContent)).not.toContain(expect.stringContaining('Γιώργος'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
		handle.go?.(LIST);
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenLastCalledWith(`/profile/relatives/${ANNA}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			})
		);
		release();
	});

	it('review w4-w7 R1 NIT-2: below 950 an address of a relative the person no longer keeps (an old link) gives way to the LIST’s own address — the page with its capsule, never a form’s address over a list', async () => {
		draw(edit('0193a1b2-7c3d-7e4f-8a9b-999999999999'));
		await waitFor(() => expect(rows()).toHaveLength(3));
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
		);
		expect(screen.queryByTestId('relatives-form')).toBeNull();
	});

	it('review w4-w7 R1 NIT-2 (negative): a relative on file, or the list still read, moves nothing', async () => {
		draw(edit(GIORGOS));
		await waitFor(() =>
			expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Γιώργος')
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('review w4-w7 R1 NIT-5: at the 20 a person may keep, the address of «Νέος συγγενής» (a bookmark, the history) shows the list, never a form the server will refuse; (negative) at 19 the form', async () => {
		relatives = Array.from({ length: 20 }, (_, index) =>
			relativeView(`0193a1b2-7c3d-7e4f-8a9b-${String(index).padStart(12, '0')}`)
		);
		const full = draw(NEW);
		await waitFor(() => expect(rows()).toHaveLength(20));
		expect(screen.queryByTestId('relatives-form')).toBeNull();
		expect(screen.getByTestId('relatives-limit')).toBeInTheDocument();
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', { replaceState: true })
		);
		full.go.mockRestore();
		cleanup();
		vi.mocked(goto).mockClear();
		relatives = relatives.slice(1);
		draw(NEW);
		await screen.findByRole('heading', { level: 2, name: 'Νέος συγγενής' });
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('what the list said goes once another relative opens (`rel.js:198`)', async () => {
		const { handle } = draw(edit(NIKOS), { depth: 1 });
		await waitFor(() =>
			expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Νίκος')
		);
		await user().clear(screen.getByTestId('relatives-form-first-name'));
		await user().type(screen.getByTestId('relatives-form-first-name'), 'Νικόλας');
		await user().click(save());
		await waitFor(() => expect(writes()).toHaveLength(1));
		handle.go?.(LIST);
		await waitFor(() => expect(screen.getByTestId('relatives-done')).toBeInTheDocument());
		await user().click(rows()[0]);
		expect(screen.queryByTestId('relatives-done')).toBeNull();
	});
});

describe('🔴 U-139.3 · «Διαγραφή συγγενή;» in a WINDOW, with the relative’s upcoming visits (U-139.4, D-W4-21)', () => {
	const ask = async () => {
		await waitFor(() => expect(screen.getByTestId('relatives-delete')).toBeInTheDocument());
		await user().click(screen.getByTestId('relatives-delete'));
		return screen.findByRole('dialog', { name: 'Διαγραφή συγγενή;' });
	};

	it('the window says who goes and that the booked appointments stay, and the one upcoming visit «που θα γίνει κανονικά»: ONE read of the upcoming (`limit=100`) at its opening', async () => {
		draw(edit(GIORGOS), { depth: 1 });
		expect(reads('/appointment/appointments')).toEqual([]);
		const dialog = await ask();
		expect(dialog).toHaveTextContent(
			'Ο Γιώργος Παππάς θα αφαιρεθεί από τα άτομα για τα οποία μπορείτε να κλείσετε ραντεβού. Τα ραντεβού που έχουν ήδη κλειστεί δεν αλλάζουν.'
		);
		await waitFor(() =>
			expect(within(dialog).getByTestId('relatives-delete-upcoming')).toHaveTextContent(
				'Έχει 1 επερχόμενο ραντεβού, που θα γίνει κανονικά: Τρίτη 24 Νοεμβρίου · 17:30 · Dr. Αθηνά Παπαδοπούλου.'
			)
		);
		const scans = reads('/appointment/appointments');
		expect(scans).toHaveLength(1);
		const query = new URL(scans[0].url, 'https://api.test').searchParams;
		expect(query.get('scope')).toBe('upcoming');
		expect(query.get('limit')).toBe('100');
		expect(query.get('as')).toBe('patient');
		// The «Διαγραφή συγγενή» link is the form's end (after the bar from 744).
		expect(screen.getByTestId('relatives-delete')).toHaveTextContent('Διαγραφή συγγενή');
	});

	it('🔴 D-W4-59.1 (review w4-w7 R1 MINOR-2): «Διαγραφή» sleeps until the read of the upcoming answers — the decision is never taken before the window can say it', async () => {
		let release = () => {};
		const held = new Promise<void>((resolve) => (release = resolve));
		scanPages = async () => {
			await held;
			return json({ items: upcoming, nextCursor: null, total: upcoming.length });
		};
		draw(edit(GIORGOS), { depth: 1 });
		const dialog = await ask();
		const confirm = within(dialog).getByTestId('relatives-delete-confirm');
		expect(confirm).toBeDisabled();
		expect(within(dialog).queryByTestId('relatives-delete-upcoming')).toBeNull();
		expect(within(dialog).queryByTestId('relatives-delete-unchecked')).toBeNull();
		await user().click(confirm);
		expect(writes()).toEqual([]);
		release();
		await waitFor(() => expect(confirm).toBeEnabled());
		expect(within(dialog).getByTestId('relatives-delete-upcoming')).toHaveTextContent(
			'Έχει 1 επερχόμενο ραντεβού'
		);
	});

	it('🔴 D-W4-59.1 (parity with the application’s review w4-a8 R1): at the SECOND opening «Διαγραφή» sleeps again while the new read is on its way — never awake on the last opening’s number — and the number then written is the new one', async () => {
		let release = () => {};
		let answer = [upcoming[0]];
		let wait: Promise<void> = Promise.resolve();
		scanPages = async () => {
			const items = answer;
			await wait;
			return json({ items, nextCursor: null, total: items.length });
		};
		draw(edit(GIORGOS), { depth: 1 });
		const first = await ask();
		const line = () => screen.queryByTestId('relatives-delete-upcoming');
		await waitFor(() => expect(line()).toHaveTextContent('Έχει 1 επερχόμενο ραντεβού'));
		expect(within(first).getByTestId('relatives-delete-confirm')).toBeEnabled();
		await user().click(within(first).getByTestId('relatives-delete-cancel'));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

		// Meanwhile a second visit was booked for him: the second opening's read is held on its way.
		answer = [upcoming[0], visit('ap-9', GIORGOS, '2026-12-08T08:00:00.000Z')];
		wait = new Promise<void>((resolve) => (release = resolve));
		const second = await ask();
		const confirm = within(second).getByTestId('relatives-delete-confirm');
		expect(confirm).toBeDisabled();
		expect(line()).toBeNull();
		expect(screen.queryByTestId('relatives-delete-unchecked')).toBeNull();
		await user().click(confirm);
		expect(writes()).toEqual([]);
		release();
		await waitFor(() => expect(confirm).toBeEnabled());
		expect(line()).toHaveTextContent('Έχει 2 επερχόμενα ραντεβού, που θα γίνουν κανονικά.');
		expect(reads('/appointment/appointments')).toHaveLength(2);
	});

	it('🔴 D-W4-59.1 / .3 (review w4-w9-r1 MINOR-1, negative): the SECOND opening with no network — the read is paused, never run — says «Δεν μπορέσαμε να ελέγξουμε…»; never the last opening’s number', async () => {
		draw(edit(GIORGOS), { depth: 1 });
		const first = await ask();
		const line = () => screen.queryByTestId('relatives-delete-upcoming');
		await waitFor(() => expect(line()).toHaveTextContent('Έχει 1 επερχόμενο ραντεβού'));
		await user().click(within(first).getByTestId('relatives-delete-cancel'));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

		onlineManager.setOnline(false);
		try {
			const second = await ask();
			await waitFor(() =>
				expect(within(second).getByTestId('relatives-delete-unchecked')).toHaveTextContent(
					'Δεν μπορέσαμε να ελέγξουμε αν έχει επερχόμενα ραντεβού. Αν έχει, θα γίνουν κανονικά.'
				)
			);
			expect(line()).toBeNull();
			expect(second).not.toHaveTextContent('Έχει 1 επερχόμενο');
			// D-W4-59.3: what could not be checked does not lock the deletion.
			expect(within(second).getByTestId('relatives-delete-confirm')).toBeEnabled();
			expect(reads('/appointment/appointments')).toHaveLength(1);
		} finally {
			onlineManager.setOnline(true);
		}
	});

	it('🔴 D-W4-59.2 (MINOR-3): an answer with `nextCursor` is read on to its end — the number is the real one, also for visits past the first hundred', async () => {
		const others = Array.from({ length: 100 }, (_, index) =>
			visit(`ap-other-${index}`, null, '2026-11-20T09:00:00.000Z')
		);
		scanPages = (cursor) =>
			cursor === null
				? json({ items: others, nextCursor: 'c2', total: 102 })
				: json({
						items: [
							visit('ap-101', GIORGOS, '2026-12-01T08:00:00.000Z'),
							visit('ap-102', GIORGOS, '2026-12-08T08:00:00.000Z')
						],
						nextCursor: null,
						total: 102
					});
		draw(edit(GIORGOS), { depth: 1 });
		const dialog = await ask();
		await waitFor(() =>
			expect(within(dialog).getByTestId('relatives-delete-upcoming')).toHaveTextContent(
				'Έχει 2 επερχόμενα ραντεβού, που θα γίνουν κανονικά. Το πρώτο: Τρίτη 1 Δεκεμβρίου · 10:00 · Dr. Αθηνά Παπαδοπούλου.'
			)
		);
		const scans = reads('/appointment/appointments').map((call) =>
			new URL(call.url, 'https://api.test').searchParams.get('cursor')
		);
		expect(scans).toEqual([null, 'c2']);
	});

	it('🔴 D-W4-59.3 (MINOR-4, negative): the read FAILED — «Δεν μπορέσαμε να ελέγξουμε αν έχει επερχόμενα ραντεβού. Αν έχει, θα γίνουν κανονικά.», never a number; «Διαγραφή» awake, and it deletes', async () => {
		scanPages = () => json({}, 500);
		draw(edit(GIORGOS), { depth: 1 });
		const dialog = await ask();
		await waitFor(() =>
			expect(within(dialog).getByTestId('relatives-delete-unchecked')).toHaveTextContent(
				'Δεν μπορέσαμε να ελέγξουμε αν έχει επερχόμενα ραντεβού. Αν έχει, θα γίνουν κανονικά.'
			)
		);
		expect(within(dialog).queryByTestId('relatives-delete-upcoming')).toBeNull();
		const confirm = within(dialog).getByTestId('relatives-delete-confirm');
		expect(confirm).toBeEnabled();
		await user().click(confirm);
		await waitFor(() =>
			expect(
				writes().map((call) => `${call.method} ${new URL(call.url, 'https://api.test').pathname}`)
			).toEqual([
				expect.stringMatching(new RegExp(`^DELETE .*/patient/pat-1/relatives/${GIORGOS}$`, 'u'))
			])
		);
	});

	it('D-W4-59.3 (negative): past ten pages of a hundred the read stops — the window says it could not check, never a number of part of them; exactly ten reads', async () => {
		scanPages = (cursor) =>
			json({
				items: [visit(`ap-${cursor ?? 'first'}`, GIORGOS, '2026-12-01T08:00:00.000Z')],
				nextCursor: `after-${cursor ?? 'first'}`,
				total: 5000
			});
		draw(edit(GIORGOS), { depth: 1 });
		const dialog = await ask();
		await waitFor(() =>
			expect(within(dialog).getByTestId('relatives-delete-unchecked')).toBeInTheDocument()
		);
		expect(within(dialog).queryByTestId('relatives-delete-upcoming')).toBeNull();
		expect(within(dialog).getByTestId('relatives-delete-confirm')).toBeEnabled();
		expect(reads('/appointment/appointments')).toHaveLength(10);
	});

	it('more than one: «Έχει 2 επερχόμενα ραντεβού … Το πρώτο: …»; (negative) none: no line, no «δεν μπορέσαμε», the deletion allowed', async () => {
		upcoming = [
			visit('ap-1', GIORGOS, '2026-11-24T15:30:00.000Z'),
			visit('ap-3', GIORGOS, '2026-12-01T08:00:00.000Z')
		];
		const first = draw(edit(GIORGOS), { depth: 1 });
		let dialog = await ask();
		await waitFor(() =>
			expect(within(dialog).getByTestId('relatives-delete-upcoming')).toHaveTextContent(
				'Έχει 2 επερχόμενα ραντεβού, που θα γίνουν κανονικά. Το πρώτο: Τρίτη 24 Νοεμβρίου · 17:30 · Dr. Αθηνά Παπαδοπούλου.'
			)
		);
		first.go.mockRestore();
		cleanup();
		upcoming = [visit('ap-2', null, '2026-11-25T09:00:00.000Z')];
		draw(edit(GIORGOS), { depth: 1 });
		dialog = await ask();
		await waitFor(() => expect(reads('/appointment/appointments').length).toBeGreaterThan(1));
		await waitFor(() =>
			expect(within(dialog).getByTestId('relatives-delete-confirm')).toBeEnabled()
		);
		expect(within(dialog).queryByTestId('relatives-delete-upcoming')).toBeNull();
		expect(within(dialog).queryByTestId('relatives-delete-unchecked')).toBeNull();
	});

	it('«Άκυρο» closes the window and deletes nothing; «Διαγραφή» deletes ⇒ back the step it came with «Ο Γιώργος Παππάς διαγράφηκε.»', async () => {
		const { go } = draw(edit(GIORGOS), { depth: 1 });
		let dialog = await ask();
		await user().click(within(dialog).getByTestId('relatives-delete-cancel'));
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Διαγραφή συγγενή;' })).toBeNull()
		);
		expect(writes()).toEqual([]);
		dialog = await ask();
		await user().click(within(dialog).getByTestId('relatives-delete-confirm'));
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(writes()).toEqual([
			expect.objectContaining({
				method: 'DELETE',
				url: expect.stringContaining(`/patient/pat-1/relatives/${GIORGOS}`)
			})
		]);
		await waitFor(() => expect(rows()).toHaveLength(2));
		expect(screen.getByTestId('relatives-done')).toHaveTextContent('Ο Γιώργος Παππάς διαγράφηκε.');
	});

	it('from 950 (`rel.js:146-151`): the deleted relative gives its place to the list’s address, whose first relative opens beside it — never a step back; the notice above the list', async () => {
		wide();
		const { go, handle } = draw(edit(ANNA), { depth: 1 });
		const dialog = await ask();
		await user().click(within(dialog).getByTestId('relatives-delete-confirm'));
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/profile/relatives', {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			})
		);
		handle.go?.(LIST);
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenLastCalledWith(`/profile/relatives/${GIORGOS}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			})
		);
		expect(go).not.toHaveBeenCalled();
		await waitFor(() => expect(rows()).toHaveLength(2));
		expect(screen.getByTestId('relatives-done')).toHaveTextContent('Η Άννα Παππά διαγράφηκε.');
		expect(screen.getByTestId('relatives-form-first-name')).toHaveValue('Γιώργος');
	});

	it('(negative) a refused deletion stays in the window with its words (`429` «Πολλές προσπάθειες…»); one deleted elsewhere goes back with «…δεν είναι πια διαθέσιμος.»', async () => {
		answers[`DELETE /patient/pat-1/relatives/${GIORGOS}`] = () => refusal(429, 'Too many requests');
		const { go } = draw(edit(GIORGOS), { depth: 1 });
		const dialog = await ask();
		await user().click(within(dialog).getByTestId('relatives-delete-confirm'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('relatives-delete-failure')).toHaveTextContent(
				'Πολλές προσπάθειες'
			)
		);
		expect(go).not.toHaveBeenCalled();
		answers[`DELETE /patient/pat-1/relatives/${GIORGOS}`] = () =>
			refusal(404, 'Relative not found');
		await user().click(within(dialog).getByTestId('relatives-delete-confirm'));
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(screen.getByTestId('relatives-done')).toHaveTextContent(
			'Αυτός ο συγγενής δεν είναι πια διαθέσιμος.'
		);
	});
});

describe('🔴 U-65.6 · D-W4-33: the page’s memory, never the address', () => {
	it('a sign-out empties what the list said; the addresses carry ids only, never a name', async () => {
		const { handle } = draw(NEW, { depth: 1 });
		await screen.findByRole('heading', { level: 2, name: 'Νέος συγγενής' });
		await waitFor(() => expect(reads('/patient/me').length).toBeGreaterThan(0));
		await user().type(screen.getByTestId('relatives-form-first-name'), 'Μαρία');
		await user().type(screen.getByTestId('relatives-form-last-name'), 'Παππά');
		await user().click(screen.getByTestId('relatives-form-relationship'));
		await user().click(await screen.findByRole('option', { name: 'Παιδί' }));
		await user().click(screen.getByTestId('relatives-form-gender'));
		await user().click(await screen.findByRole('option', { name: 'Γυναίκα' }));
		await user().click(save());
		await waitFor(() => expect(screen.getByTestId('relatives-done')).toBeInTheDocument());
		for (const [href] of vi.mocked(goto).mock.calls)
			expect(String(href)).not.toMatch(/Μαρία|Παππά/u);
		// 🔴 D-W4-63: «… προστέθηκε.» is said from the page's memory — no `done`, no `name`, nothing a person wrote in
		// any address the page asked for, nor in the one it stands on.
		expect(screen.getByTestId('relatives-done')).toHaveTextContent('Μαρία Παππά');
		for (const [href] of vi.mocked(goto).mock.calls) {
			const asked = new URL(String(href), 'http://localhost');
			expect(asked.search, String(href)).toBe('');
			expect(asked.pathname).toMatch(/^\/profile\/relatives(\/[0-9a-f-]+|\/new)?$/u);
		}
		expect(page.url.search).toBe('');
		handle.signOut?.();
		await waitFor(() => expect(screen.queryByTestId('relatives-done')).toBeNull());
		expect(screen.getByTestId('relatives-guest')).toBeInTheDocument();
	});
});
