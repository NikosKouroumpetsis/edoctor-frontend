import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page as appPage } from '$app/state';
import { DoctorPatientMemory } from '$modules/doctor-dashboard/ui/memory';
import Harness from './record.harness.svelte';

/* Wave 5.1 · screen 73 «Στοιχεία ασθενή» (D-W51-66, D-W51-76): the server stubbed at `fetch`. Made-up people only. */

const R = '0193d000-0000-7000-8000-0000000000b3';
const R2 = '0193d000-0000-7000-8000-0000000000b4';
const P = '0193d000-0000-7000-8000-0000000000b1';
const empty = { items: [], nextCursor: null, total: 0 };
const recordCard = (id = R, patch: Record<string, unknown> = {}) => ({
	key: { kind: 'record', id },
	person: { kind: 'RECORD', recordId: id },
	hasAccount: false,
	firstName: 'Καλλιόπη',
	lastName: 'Ζέρβα',
	phone: '306971002003',
	email: null,
	amka: null,
	afm: null,
	gender: null,
	relationship: null,
	bookedBy: null,
	visits: { count: 1, firstAt: null, lastAt: null },
	noShows: 0,
	editable: true,
	conversationId: null,
	addedAt: '2026-10-30T10:00:00.000Z',
	mergeCandidate: null,
	upcoming: empty,
	past: empty,
	...patch
});

type Call = { url: URL; method: string; body: unknown };
let calls: Call[] = [];
function serve(card: unknown, write: { status: number; message?: string } = { status: 200 }) {
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const method = init?.method ?? 'GET';
			calls.push({
				url: new URL(String(input)),
				method,
				body: init?.body ? JSON.parse(String(init.body)) : null
			});
			const status = method === 'PATCH' ? write.status : 200;
			return new Response(
				JSON.stringify(
					status < 400
						? { status: 'success', message: '', data: card }
						: { status: 'error', errorMessage: write.message ?? 'refused' }
				),
				{ status }
			);
		})
	);
}

const links = { card: `/doctor/patients/record/${R}` };
function open(memory = new DoctorPatientMemory(), recordId = R) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	const view = render(Harness, { props: { client, recordId, links, memory } });
	return { client, memory, view };
}
const ready = () => waitFor(() => expect(screen.getByTestId('doctor-record')).toBeInTheDocument());
const field = (name: string) => screen.getByTestId(`doctor-record-${name}`) as HTMLInputElement;
const patches = () => calls.filter((call) => call.method === 'PATCH');

beforeEach(() => {
	appPage.state = {};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	appPage.state = {};
});

describe('screen 73 «Στοιχεία ασθενή» (D-W51-76)', () => {
	it('a screen of its own (U-102): the title, «Ο ασθενής δεν έχει λογαριασμό eDoctor…», the six fields opened with the record as kept; «Άκυρο» / «Αποθήκευση»', async () => {
		serve(recordCard());
		open();
		await ready();
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Στοιχεία ασθενή');
		expect(screen.getByTestId('doctor-record')).toHaveTextContent(
			'Ο ασθενής δεν έχει λογαριασμό eDoctor. Τα στοιχεία τα βλέπετε και τα αλλάζετε μόνο εσείς.'
		);
		await waitFor(() => expect(field('first-name').value).toBe('Καλλιόπη'));
		expect(field('last-name').value).toBe('Ζέρβα');
		expect(field('phone').value).toBe('+30 697 100 2003');
		expect(field('email').value).toBe('');
		expect(field('first-name')).toHaveAttribute('maxlength', '80');
		expect(field('email')).toHaveAttribute('maxlength', '254');
		expect(field('amka')).toHaveAccessibleDescription('11 ψηφία.');
		expect(field('afm')).toHaveAccessibleDescription('9 ψηφία. Χρειάζεται για τιμολόγιο.');
		expect(screen.getByTestId('doctor-record-cancel')).toHaveTextContent('Άκυρο');
		expect(screen.getByTestId('doctor-record-save')).toHaveTextContent('Αποθήκευση');
		expect(document.querySelector('[role="dialog"]')).toBeNull();
	});

	it('🔴 U-65.6 · επεξεργασία με λάθη: ΑΜΚΑ of 10 digits, a name with HTML, a mobile that is not Greek — each its words under it, and NO write', async () => {
		serve(recordCard());
		open();
		await ready();
		await waitFor(() => expect(field('first-name').value).toBe('Καλλιόπη'));
		await fireEvent.input(field('amka'), { target: { value: '0211198512' } });
		await fireEvent.input(field('first-name'), { target: { value: '<b>x</b>' } });
		await fireEvent.input(field('phone'), { target: { value: '2101234567' } });
		await userEvent.click(screen.getByTestId('doctor-record-save'));
		expect(field('amka')).toHaveAccessibleDescription('Το ΑΜΚΑ έχει 11 ψηφία.');
		expect(field('first-name')).toHaveAccessibleDescription(
			'Συμπληρώστε ένα όνομα, μόνο με γράμματα.'
		);
		expect(field('phone')).toHaveAccessibleDescription('Γράψτε ένα ελληνικό κινητό με 10 ψηφία.');
		expect(patches()).toHaveLength(0);
	});

	it('the ΑΜΚΑ / ΑΦΜ keep their digits only (11 / 9): a letter typed or pasted leaves nothing behind', async () => {
		serve(recordCard());
		open();
		await ready();
		await fireEvent.input(field('amka'), { target: { value: 'α021 1198-5123 99' } });
		expect(field('amka').value).toBe('02111985123');
		await fireEvent.input(field('afm'), { target: { value: 'x12345678399' } });
		expect(field('afm').value).toBe('123456783');
	});

	it('D-W51-66: «Αποθήκευση» is ONE `PATCH` (the mobile its 10 digits, the empty ones `null`); then back ONE step to the card, which says «Αποθηκεύτηκε.»', async () => {
		appPage.state = { doctorPatient: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		serve(recordCard());
		const { memory } = open();
		await ready();
		await waitFor(() => expect(field('first-name').value).toBe('Καλλιόπη'));
		await fireEvent.input(field('amka'), { target: { value: '02111985123' } });
		await userEvent.click(screen.getByTestId('doctor-record-save'));
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(patches()).toHaveLength(1);
		expect(patches()[0]?.url.pathname).toMatch(
			new RegExp(`/appointment/doctor/patients/record/${R}$`, 'u')
		);
		expect(patches()[0]?.body).toEqual({
			firstName: 'Καλλιόπη',
			lastName: 'Ζέρβα',
			phone: '6971002003',
			email: null,
			amka: '02111985123',
			afm: null
		});
		expect(memory.doneOf(`record:${R}`)).toBe('saved');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('3β · with TWO cards in the history (A, then B): saving B goes back ONE step — to B, which says «Αποθηκεύτηκε.», never to A', async () => {
		appPage.state = { doctorPatient: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		const memory = new DoctorPatientMemory();
		// Card A was open before, then card B (the screen forgets what was said of any other card).
		memory.keepOnly(`record:${R2}`);
		serve(recordCard(R));
		open(memory, R);
		await ready();
		await waitFor(() => expect(field('first-name').value).toBe('Καλλιόπη'));
		await userEvent.click(screen.getByTestId('doctor-record-save'));
		await waitFor(() => expect(go).toHaveBeenCalledTimes(1));
		expect(go).toHaveBeenCalledWith(-1);
		expect(memory.doneOf(`record:${R}`)).toBe('saved');
		expect(memory.doneOf(`record:${R2}`)).toBeNull();
		expect(window.location.search).not.toMatch(/done|saved/u);
	});

	it('opened from a link alone: the save goes to the card in place (never out of the site)', async () => {
		serve(recordCard());
		open();
		await ready();
		await waitFor(() => expect(field('first-name').value).toBe('Καλλιόπη'));
		await userEvent.click(screen.getByTestId('doctor-record-save'));
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/patients/record/${R}`, {
				replaceState: true
			})
		);
	});

	it('D-W51-76: a 422 on the fields — the ΑΦΜ that is no real one «δεν είναι έγκυρο» under it, the general words over the bar; the form STAYS', async () => {
		serve(recordCard(), {
			status: 422,
			message: 'Entity Validation Error: afm is not a valid Greek tax identification number.'
		});
		open();
		await ready();
		await waitFor(() => expect(field('first-name').value).toBe('Καλλιόπη'));
		await fireEvent.input(field('afm'), { target: { value: '123456783' } });
		await userEvent.click(screen.getByTestId('doctor-record-save'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-record-failure')).toHaveTextContent(
				'Ελέγξτε τα στοιχεία που συμπληρώσατε και δοκιμάστε ξανά.'
			)
		);
		expect(field('afm')).toHaveAccessibleDescription('Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.');
		expect(field('afm').value).toBe('123456783');
	});

	it('D-W51-67: a 409 (joined meanwhile) — «δεν αλλάζουν πια», ONE way back to the card; a record answered as an account opens so too', async () => {
		serve(recordCard(), { status: 409 });
		const first = open();
		await ready();
		await waitFor(() => expect(field('first-name').value).toBe('Καλλιόπη'));
		await userEvent.click(screen.getByTestId('doctor-record-save'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-record-closed-text')).toHaveTextContent(
				'Ο ασθενής ενώθηκε με λογαριασμό eDoctor, οπότε τα στοιχεία αυτά δεν αλλάζουν πια.'
			)
		);
		first.view.unmount();
		serve(recordCard(R, { key: { kind: 'account', id: P }, editable: false }));
		open();
		await waitFor(() => expect(screen.getByTestId('doctor-record-closed')).toBeInTheDocument());
	});

	it('🔴 D-W51-63: a record not the doctor’s reads «δεν βρέθηκε» — no form', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () => new Response(JSON.stringify({ status: 'error', message: 'x' }), { status: 404 })
			)
		);
		open();
		await waitFor(() => expect(screen.getByTestId('doctor-record-missing')).toBeInTheDocument());
		expect(screen.queryByTestId('doctor-record-form')).toBeNull();
	});
});
