import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusManager, QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { resetServerClock } from '$shared/lib/server-clock';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	doctorAppointmentRow,
	TODAY_DAY,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import {
	doctorAppointmentsSearch,
	doctorNewAppointmentSearch,
	type DoctorAppointmentsAddress,
	type DoctorAppointmentStep,
	type DoctorAppointmentsTab
} from '$modules/doctor-dashboard/lib/paths';
import Harness from './appointments.harness.svelte';

/*
 * Wave 5.1 · screen 67 «Ραντεβού» (D-W51-28 … 32): the page with the server stubbed at `fetch` (the module's precedent,
 * no MSW), the server's «now» the prototype's Saturday 14 November 2026, 12:40 in Athens. Made-up people (the
 * prototype's names), made-up offices.
 */

type Row = ReturnType<typeof doctorAppointmentRow>;

const KIFISIAS = '0193d000-0000-7000-8000-0000000000f1';
const PATISION = '0193d000-0000-7000-8000-0000000000f2';

const person = (firstName: string, lastName: string) => ({
	id: `patient-${lastName}`,
	tenantUserId: null,
	firstName,
	lastName,
	phoneE164: null
});

/** The prototype's history (`sw.js:309-321`): two months, every closed state, and yesterday's open visit (never shown). */
const HISTORY = {
	h1: doctorAppointmentRow({
		id: 'h1',
		status: 'completed',
		startTime: '2026-11-14T07:00:00.000Z',
		patientSnapshot: person('Σοφία', 'Ρήγα')
	}),
	h2: doctorAppointmentRow({
		id: 'h2',
		status: 'canceled',
		canceledBy: 'PATIENT',
		startTime: '2026-11-14T09:30:00.000Z',
		patientSnapshot: person('Μάρκος', 'Ηλιόπουλος')
	}),
	open: doctorAppointmentRow({
		id: 'open',
		status: 'booked',
		startTime: '2026-11-13T16:00:00.000Z',
		patientSnapshot: person('Κατερίνα', 'Λαμπράκη')
	}),
	h3: doctorAppointmentRow({
		id: 'h3',
		status: 'no_show',
		startTime: '2026-11-13T16:00:00.000Z',
		patientSnapshot: person('Χρήστος', 'Βλάχος')
	}),
	h4: doctorAppointmentRow({
		id: 'h4',
		status: 'rejected',
		rejectedBy: 'DOCTOR',
		startTime: '2026-11-12T08:00:00.000Z',
		patientSnapshot: person('Άννα', 'Κωστοπούλου')
	}),
	h5: doctorAppointmentRow({
		id: 'h5',
		status: 'expired',
		startTime: '2026-11-11T10:00:00.000Z',
		patientSnapshot: person('Θανάσης', 'Ράπτης')
	}),
	h6: doctorAppointmentRow({
		id: 'h6',
		status: 'completed',
		startTime: '2026-10-22T08:00:00.000Z',
		patientSnapshot: person('Ιωάννα', 'Καρρά')
	}),
	h7: doctorAppointmentRow({
		id: 'h7',
		status: 'canceled',
		canceledBy: 'DOCTOR',
		startTime: '2026-10-05T14:30:00.000Z',
		patientSnapshot: person('Παύλος', 'Μιχαηλίδης')
	})
};

type Reads = {
	offices: string[];
	requests: Row[];
	today: Row[];
	upcoming: Row[];
	history: { items: Row[]; next: string | null }[];
	fail?: Partial<Record<'requests' | 'today' | 'upcoming' | 'history', number>>;
	write?: { status: number };
};

const FULL: Reads = {
	offices: [KIFISIAS],
	requests: [TODAY_DAY.r2, TODAY_DAY.r1],
	// `scope=today`: the begun visit too (the server's day), the page keeps what is still ahead.
	today: [TODAY_DAY.o1, TODAY_DAY.n1, TODAY_DAY.r1],
	upcoming: [TODAY_DAY.r2, TODAY_DAY.u2, TODAY_DAY.u3, TODAY_DAY.u4],
	history: [
		{
			items: [HISTORY.h1, HISTORY.h2, HISTORY.open, HISTORY.h3, HISTORY.h4, HISTORY.h5],
			next: 'c-2'
		},
		{ items: [HISTORY.h6, HISTORY.h7], next: null }
	]
};

const envelope = (data: unknown, status = 200) =>
	new Response(
		status < 400
			? JSON.stringify({ status: 'success', message: '', data })
			: JSON.stringify({ status: 'error', message: 'refused' }),
		{ status }
	);

const officeRow = (id: string, street: string, number: string) => ({
	doctorOffice: { id: `link-${id}`, doctorId: 'd-1', officeId: id, createdAt: '', updatedAt: '' },
	office: { id, translations: [{ language: 'el', street, streetNumber: number }] }
});
const STREETS: Record<string, [string, string]> = {
	[KIFISIAS]: ['Κηφισίας', '120'],
	[PATISION]: ['Πατησίων', '45']
};

let calls: { method: string; url: URL }[] = [];
let reads: Reads = FULL;

function serve(next: Reads) {
	reads = next;
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			calls.push({ method, url });
			if (method === 'POST') {
				const status = reads.write?.status ?? 200;
				return envelope({ ...TODAY_DAY.r1, status: 'booked' }, status);
			}
			if (url.pathname.endsWith('/doctor/profile/offices')) {
				return envelope(reads.offices.map((id) => officeRow(id, ...STREETS[id])));
			}
			const which = url.searchParams.has('status')
				? 'requests'
				: (url.searchParams.get('scope') as 'today' | 'upcoming' | 'history');
			const failure = reads.fail?.[which];
			if (failure) return envelope(null, failure);
			if (which === 'history') {
				const index = url.searchParams.get('cursor') === 'c-2' ? 1 : 0;
				const page = reads.history[index] ?? { items: [], next: null };
				return envelope({ items: page.items, nextCursor: page.next, total: 0 });
			}
			const items = reads[which];
			return envelope({ items, nextCursor: null, total: items.length });
		})
	);
}

const lists = (filter: (url: URL) => boolean = () => true) =>
	calls.filter(
		(call) =>
			call.method === 'GET' &&
			call.url.pathname.endsWith('/appointment/appointments') &&
			filter(call.url)
	);

const links = {
	today: '/doctor',
	newAppointment: (tab: DoctorAppointmentsTab, officeId: string | null) =>
		`/doctor/appointments/new${doctorNewAppointmentSearch({ from: 'list', tab, officeId })}`,
	list: (tab: DoctorAppointmentsTab, officeId: string | null) =>
		`/doctor/appointments${doctorAppointmentsSearch(tab, officeId)}`,
	appointment: (id: string, tab: DoctorAppointmentsTab, officeId: string | null) =>
		`/doctor/appointments/${id}${doctorAppointmentsSearch(tab, officeId)}`,
	step: (id: string, step: string, tab: DoctorAppointmentsTab, officeId: string | null) =>
		`/doctor/appointments/${id}/${step}${doctorAppointmentsSearch(tab, officeId)}`
};

const address = (
	tab: DoctorAppointmentsTab = 'upcoming',
	officeId: string | null = null
): DoctorAppointmentsAddress => ({ view: 'list', tab, officeId });

function open(where: DoctorAppointmentsAddress = address(), paneText: string | null = null) {
	const toasts = new ToastState();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	const view = render(Harness, { props: { toasts, client, address: where, links, paneText } });
	return { toasts, client, view };
}

/** From 1128 (`breakpoints.laptop`) or below it: the media query the page reads. */
const wideScreen = (matches: boolean) =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
const split = () => screen.getByTestId('doctor-appointments-split');
const listColumn = () => split().querySelector('[data-slot="split-view-list"]') as HTMLElement;
const paneColumn = () => split().querySelector('[data-slot="split-view-pane"]') as HTMLElement;
const appointmentAt = (
	id: string,
	tab: DoctorAppointmentsTab = 'upcoming',
	officeId: string | null = null,
	step: DoctorAppointmentStep | null = null
): DoctorAppointmentsAddress => ({
	view: 'appointment',
	appointmentId: id,
	step,
	tab,
	officeId
});

const page = () => screen.getByTestId('doctor-appointments');
const ready = () => waitFor(() => expect(page()).toHaveAttribute('data-view', 'ready'));
const cardOf = (id: string) =>
	screen
		.getAllByTestId('doctor-appointments-card')
		.find((card) => card.dataset.id === id) as HTMLElement;
const shownIds = () =>
	screen.queryAllByTestId('doctor-appointments-card').map((card) => card.dataset.id);
const headings = () =>
	screen
		.queryAllByTestId('doctor-appointments-group')
		.map((group) => within(group).getByRole('heading', { level: 2 }).textContent?.trim());

type Observed = { callback: IntersectionObserverCallback; node: Element };
let observed: Observed[] = [];

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true, now: TODAY_NOW });
	resetServerClock();
	wideScreen(false);
	observed = [];
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(private callback: IntersectionObserverCallback) {}
			observe(node: Element) {
				observed.push({ callback: this.callback, node });
			}
			disconnect() {}
		}
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	focusManager.setFocused(undefined);
});

describe('screen 67 «Ραντεβού», by pill (D-W51-29)', () => {
	it('«Επερχόμενα» by default: «‹», the title, the three pills (the number on «Αιτήματα»), today’s still ahead under «Σήμερα», then each day', async () => {
		serve(FULL);
		open();
		await ready();
		expect(screen.getByRole('heading', { level: 1, name: 'Ραντεβού' })).toBeInTheDocument();
		const back = screen.getByTestId('doctor-appointments-back');
		expect(back).toHaveAttribute('href', '/doctor');
		expect(back).toHaveAccessibleName('Πίσω');
		// Below 744 only: from 744 «Σήμερα» of the bar leads back (`sw.css:160`).
		expect(back.className).toContain('tablet:hidden');
		const tabs = within(screen.getByRole('navigation', { name: 'Ραντεβού' })).getAllByRole('link');
		expect(
			tabs.map((tab) => [tab.textContent?.replace(/\s+/gu, ' ').trim(), tab.getAttribute('href')])
		).toEqual([
			['Αιτήματα 2', '/doctor/appointments?tab=requests'],
			['Επερχόμενα', '/doctor/appointments'],
			['Ιστορικό', '/doctor/appointments?tab=history']
		]);
		expect(screen.getByTestId('doctor-appointments-tab-upcoming')).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(headings()).toEqual(['Σήμερα', 'Δευτέρα 16 Νοεμβρίου', 'Τρίτη 17 Νοεμβρίου']);
		expect(shownIds()).toEqual(['n1', 'r1', 'r2', 'u2', 'u3', 'u4']);
		expect(cardOf('n1')).toHaveTextContent('13:00');
		expect(cardOf('n1')).toHaveTextContent('Επιβεβαιωμένο');
		expect(cardOf('r1')).toHaveTextContent('Αίτημα');
		expect(cardOf('r1')).toHaveTextContent('Το έκλεισε: Ελένη Μαυρίδη (γονέας)');
		// Nothing is answered from «Επερχόμενα» (66's way).
		expect(within(cardOf('r1')).queryByRole('button')).toBeNull();
		// The reads: ALWAYS `as=doctor`; the history is not read for a pill that does not show it.
		for (const call of lists()) expect(call.url.searchParams.get('as')).toBe('doctor');
		expect(lists((url) => url.searchParams.get('scope') === 'today')).toHaveLength(1);
		expect(lists((url) => url.searchParams.get('scope') === 'upcoming')).toHaveLength(1);
		expect(lists((url) => url.searchParams.get('scope') === 'history')).toHaveLength(0);
	});

	it('«Αιτήματα»: the deadline’s rule under the pills, every request waiting, the one due first first, with screen 66’s card', async () => {
		serve(FULL);
		open(address('requests'));
		await ready();
		expect(screen.getByTestId('doctor-appointments-tab-requests')).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByTestId('doctor-appointments-hint')).toHaveTextContent(
			'Αν δεν απαντήσετε ως την ώρα που γράφει το καθένα, το αίτημα λήγει και ο ασθενής ενημερώνεται.'
		);
		expect(shownIds()).toEqual(['r1', 'r2']);
		expect(cardOf('r1')).toHaveTextContent('Σήμερα, 17:30');
		expect(cardOf('r1')).toHaveTextContent('«Βήχας εδώ και μία εβδομάδα, χωρίς πυρετό.»');
		expect(cardOf('r1')).toHaveTextContent('Απαντήστε έως τις 16:30');
		expect(cardOf('r2')).toHaveTextContent('Δευτέρα 16 Νοεμβρίου, 10:00');
		expect(headings()).toEqual([]);
		expect(lists((url) => url.searchParams.get('status') === 'pending').length).toBeGreaterThan(0);
		expect(lists((url) => url.searchParams.has('scope'))).toHaveLength(0);
	});

	it('«Ιστορικό»: by month, fainter, the whole date — only what is closed; «Τα παλαιότερα φορτώνουν καθώς κυλάτε.» while more is there', async () => {
		serve(FULL);
		open(address('history'));
		await ready();
		expect(headings()).toEqual(['Νοέμβριος 2026']);
		expect(shownIds()).toEqual(['h1', 'h2', 'h3', 'h4', 'h5']);
		expect(cardOf('h1')).toHaveTextContent('Σάββατο 14 Νοεμβρίου, 09:00');
		expect(cardOf('h1')).toHaveTextContent('Επίσκεψη · 30 λεπτά · Κηφισίας 120');
		expect(cardOf('h1').querySelector('[data-slot="visit-card"]')).toHaveAttribute(
			'data-dim',
			'true'
		);
		expect(screen.getByTestId('doctor-appointments-older')).toHaveTextContent(
			'Τα παλαιότερα φορτώνουν καθώς κυλάτε.'
		);
		const first = lists((url) => url.searchParams.get('scope') === 'history')[0].url;
		expect(first.searchParams.get('sortDir')).toBe('desc');
		expect(first.searchParams.get('as')).toBe('doctor');
		for (const id of ['h1', 'h2', 'h3'])
			expect(within(cardOf(id)).queryByRole('button')).toBeNull();
	});

	it('🔴 D-W51-29: infinite — as the end nears the screen the next page is read (its cursor, newest first), under the same months; past the last no more words', async () => {
		serve(FULL);
		open(address('history'));
		await ready();
		const end = observed[observed.length - 1];
		expect(end).toBeDefined();
		await act(() =>
			end?.callback(
				[{ isIntersecting: true } as IntersectionObserverEntry],
				{} as IntersectionObserver
			)
		);
		await waitFor(() => expect(shownIds()).toContain('h7'));
		const second = lists((url) => url.searchParams.get('cursor') === 'c-2');
		expect(second).toHaveLength(1);
		expect(second[0].url.searchParams.get('sortDir')).toBe('desc');
		expect(headings()).toEqual(['Νοέμβριος 2026', 'Οκτώβριος 2026']);
		expect(shownIds()).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7']);
		await waitFor(() => expect(screen.queryByTestId('doctor-appointments-older')).toBeNull());
	});

	it('(negative) a first page of open visits only is no «nothing»: the next page is read at once', async () => {
		serve({
			...FULL,
			history: [
				{ items: [HISTORY.open], next: 'c-2' },
				{ items: [HISTORY.h6], next: null }
			]
		});
		open(address('history'));
		await ready();
		expect(shownIds()).toEqual(['h6']);
		expect(screen.queryByTestId('doctor-appointments-empty')).toBeNull();
	});

	it('the three empty pills say so in their own words (88 §67)', async () => {
		serve({ ...FULL, requests: [], today: [], upcoming: [], history: [{ items: [], next: null }] });
		const { view } = open(address('requests'));
		let empty = await screen.findByTestId('doctor-appointments-empty');
		expect(empty).toHaveTextContent('Δεν έχετε αιτήματα που περιμένουν');
		expect(empty).toHaveTextContent(
			'Όταν ένας ασθενής ζητήσει ραντεβού, θα το βρείτε εδώ και στο «Σήμερα».'
		);
		// No number on «Αιτήματα» with none.
		expect(screen.getByTestId('doctor-appointments-tab-requests')).toHaveTextContent(/^Αιτήματα$/u);
		await view.rerender({ address: address('upcoming') });
		empty = await screen.findByTestId('doctor-appointments-empty');
		expect(empty).toHaveTextContent('Δεν έχετε επερχόμενα ραντεβού');
		expect(empty).toHaveTextContent('Τα ραντεβού που έχουν κλειστεί θα εμφανίζονται εδώ.');
		await view.rerender({ address: address('history') });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-appointments-empty')).toHaveTextContent(
				'Δεν υπάρχουν προηγούμενα ραντεβού'
			)
		);
		expect(screen.getByTestId('doctor-appointments-empty')).toHaveTextContent(
			'Όσα ραντεβού ολοκληρωθούν, ακυρωθούν ή λήξουν θα εμφανίζονται εδώ.'
		);
	});

	it('loading: three cards of the same box; failure: «Δεν ήταν δυνατή η φόρτωση των ραντεβού» with «Δοκιμάστε ξανά», which reads again', async () => {
		serve({ ...FULL, fail: { upcoming: 503 } });
		open();
		expect(screen.getByTestId('doctor-appointments-loading')).toHaveAttribute('aria-busy', 'true');
		// A passing failure is asked once more (a second later) before the page says so («Σήμερα»'s reads).
		await vi.advanceTimersByTimeAsync(1_500);
		const error = await screen.findByTestId('doctor-appointments-error');
		expect(error).toHaveTextContent('Δεν ήταν δυνατή η φόρτωση των ραντεβού');
		serve(FULL);
		await fireEvent.click(within(error).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await ready();
		expect(shownIds()).toContain('u4');
	});
});

describe('the office filter (D-W51-29)', () => {
	it('with one office it does not show — and an office in the address reads every office', async () => {
		serve(FULL);
		open(address('upcoming', PATISION));
		await ready();
		expect(screen.queryByTestId('doctor-appointments-office')).toBeNull();
		for (const call of lists()) expect(call.url.searchParams.has('officeId')).toBe(false);
	});

	it('with two: «Όλα τα ιατρεία ▾», a list of the offices by their street; a choice keeps the pill and names the office in the address', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		serve({ ...FULL, offices: [KIFISIAS, PATISION] });
		open(address('history'));
		await ready();
		const filter = screen.getByTestId('doctor-appointments-office');
		expect(filter).toHaveTextContent('Όλα τα ιατρεία');
		expect(filter).toHaveAttribute('data-chosen', 'all');
		await user.click(filter);
		const menu = await screen.findByTestId('doctor-appointments-office-menu');
		const items = within(menu).getAllByRole('menuitemradio');
		expect(
			items.map((item) => [item.textContent?.trim(), item.getAttribute('aria-checked')])
		).toEqual([
			['Όλα τα ιατρεία', 'true'],
			['Κηφισίας 120', 'false'],
			['Πατησίων 45', 'false']
		]);
		await user.click(items[2]);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(
			`/doctor/appointments?tab=history&office=${PATISION}`,
			{ replaceState: true, noScroll: true, keepFocus: true }
		);
	});

	it('🔴 D-W51-29: an office in the address narrows EVERY read of the page and every pill’s link; the pill says its street, ringed', async () => {
		serve({ ...FULL, offices: [KIFISIAS, PATISION] });
		open(address('upcoming', PATISION));
		await ready();
		const filter = screen.getByTestId('doctor-appointments-office');
		expect(filter).toHaveTextContent('Πατησίων 45');
		expect(filter).toHaveAttribute('data-chosen', 'office');
		const reads = lists();
		expect(reads.length).toBeGreaterThanOrEqual(3);
		for (const call of reads) expect(call.url.searchParams.get('officeId')).toBe(PATISION);
		expect(screen.getByTestId('doctor-appointments-tab-history')).toHaveAttribute(
			'href',
			`/doctor/appointments?tab=history&office=${PATISION}`
		);
	});

	it('(negative) an office that is not the doctor’s reads every office, and the filter says «Όλα τα ιατρεία»', async () => {
		serve({ ...FULL, offices: [KIFISIAS, PATISION] });
		open(address('upcoming', '0193d000-0000-7000-8000-0000000000ff'));
		await ready();
		expect(screen.getByTestId('doctor-appointments-office')).toHaveTextContent('Όλα τα ιατρεία');
		for (const call of lists()) expect(call.url.searchParams.has('officeId')).toBe(false);
	});
});

describe('🔴 the guards of the contract', () => {
	// Rewrites «… «Επιβεβαίωση» alone until 69 / 70 (D-W51-32)» of step 3: D-W51-49 (step 5, card w51-w5) draws «Απόρριψη»
	// — screen 69 exists, opened with the pill and office of the list; «Αλλαγή» still waits for 70.
	// Rewrites «U-192 · D-W51-49: … «Απόρριψη · Επιβεβαίωση» (no «Αλλαγή» until 70)»: D-W51-51 (step 6) brings the
	// request's «Αλλαγή» to screen 70, card w51-w6 §3.
	it('🔴 U-192 · D-W51-49 · D-W51-51: τα αιτήματα με τα κουμπιά της 66 — the same card, «Απόρριψη · Αλλαγή · Επιβεβαίωση», one column, round', async () => {
		serve(FULL);
		open(address('requests'));
		await ready();
		for (const id of ['r1', 'r2']) {
			const stack = within(cardOf(id)).getByTestId('doctor-appointments-answers');
			expect(stack.className).toContain('grid-cols-1');
			expect([...stack.children].map((answer) => answer.textContent?.trim())).toEqual([
				'Απόρριψη',
				'Αλλαγή',
				'Επιβεβαίωση'
			]);
			const move = within(stack).getByRole('link', { name: 'Αλλαγή' });
			expect(move).toHaveAttribute(
				'href',
				`/doctor/appointments/${id}/time${doctorAppointmentsSearch('requests', null)}`
			);
			expect(move.className).toContain('rounded-full');
			const buttons = within(stack).getAllByRole('button');
			expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Επιβεβαίωση']);
			expect(buttons[0].dataset.tone).toBe('contrast');
			expect(buttons[0].className).toContain('rounded-full');
			const reject = within(stack).getByRole('link', { name: 'Απόρριψη' });
			expect(reject).toHaveAttribute(
				'href',
				`/doctor/appointments/${id}/reject${doctorAppointmentsSearch('requests', null)}`
			);
			expect(reject.className).toContain('rounded-full');
		}
	});

	// Rewrites «🔴 D-W51-31: μία στήλη ως την 68 — … the cards open nothing» of step 3: D-W51-36 (card w51-w4) puts screen
	// 68 beside the list from 1128 and makes every card a link to it, as the card and the task doc say. Rewrites «… no «+»
	// (72) yet» by D-W51-69 (step 8, card w51-w8): screen 72 exists, so «+» beside the title leads to it, pill and office kept.
	it('🔴 D-W51-36 · D-W51-69: split από 1128 — below it ONE column of 760 in the middle, every card a link to its 68 (the pill and office kept), «+» to screen 72', async () => {
		serve({ ...FULL, offices: [KIFISIAS, PATISION] });
		open(address('upcoming', PATISION));
		await ready();
		const main = page();
		expect(main.className).toContain('mx-auto');
		expect(main.className).toContain('max-w-content');
		expect(main.className).not.toMatch(/\b(?:split|desktop):/u);
		const root = split();
		expect(root).toHaveAttribute('data-from', 'laptop');
		expect(root).toHaveAttribute('data-solo');
		expect(listColumn().contains(main)).toBe(true);
		for (const card of screen.getAllByTestId('doctor-appointments-card')) {
			const link = card.querySelector('[data-slot="visit-card-link"]') as HTMLAnchorElement;
			expect(link).toHaveAttribute(
				'href',
				`/doctor/appointments/${card.dataset.id}?office=${PATISION}`
			);
			expect(link).not.toHaveAttribute('data-sveltekit-noscroll');
		}
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(screen.queryByRole('button', { name: 'Νέο ραντεβού' })).toBeNull();
		expect(screen.getByRole('link', { name: 'Νέο ραντεβού' })).toHaveAttribute(
			'href',
			`/doctor/appointments/new?office=${PATISION}`
		);
	});

	it('🔴 D-W51-36: split από 1128 — the first of the pill opens beside the list in place (the 50’s way), in the same paint two columns', async () => {
		wideScreen(true);
		serve(FULL);
		open(address('requests'), '');
		await ready();
		// `r1` is due first (`FULL.requests` read r2, r1): the first card of «Αιτήματα».
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/appointments/r1?tab=requests', {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			})
		);
		const root = split();
		expect(root).not.toHaveAttribute('data-solo');
		expect(root).toHaveClass('laptop:grid', 'laptop:grid-split');
		expect(screen.getByTestId('pane')).toHaveAttribute('data-opening', 'true');
		expect(page().className).toContain('laptop:max-w-none');
	});

	it('🔴 D-W51-46: screen 69 from 1128 stands in the 68’s place beside the list, its card still chosen and nothing opened over it; below 1128 alone (950)', async () => {
		wideScreen(true);
		serve(FULL);
		const wide = open(appointmentAt('r1', 'requests', null, 'reject'), 'the 69');
		await ready();
		expect(split()).not.toHaveAttribute('data-solo');
		expect(split()).toHaveAttribute('data-open');
		expect(paneColumn()).toHaveTextContent('the 69');
		expect(listColumn()).toHaveClass('hidden', 'laptop:block');
		expect(cardOf('r1')).toHaveAttribute('data-selected', 'true');
		// The address names the appointment: the first of the pill is not opened over it.
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		wide.view.unmount();
		wideScreen(false);
		open(appointmentAt('r1', 'requests', null, 'reject'), 'the 69');
		await ready();
		expect(paneColumn()).not.toHaveClass('hidden');
		expect(listColumn()).toHaveClass('hidden');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 D-W51-51 / 52: screen 70 (`time`, `services`) from 1128 stands in the 68’s place beside the list (split 1128), its card still chosen; below 1128 alone (950)', async () => {
		for (const step of ['time', 'services'] as const) {
			wideScreen(true);
			serve(FULL);
			const wide = open(appointmentAt('r1', 'requests', null, step), 'the 70');
			await ready();
			expect(split()).not.toHaveAttribute('data-solo');
			expect(split()).toHaveAttribute('data-open');
			expect(paneColumn()).toHaveTextContent('the 70');
			expect(listColumn()).toHaveClass('hidden', 'laptop:block');
			expect(cardOf('r1')).toHaveAttribute('data-selected', 'true');
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
			wide.view.unmount();
			wideScreen(false);
			const alone = open(appointmentAt('r1', 'requests', null, step), 'the 70');
			await ready();
			expect(paneColumn()).not.toHaveClass('hidden');
			expect(listColumn()).toHaveClass('hidden');
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
			alone.view.unmount();
		}
	});

	it('🔴 D-W51-62 · U-102: διόρθωση = οθόνη — screen 71 from 1128 stands in the 68’s place beside «Ιστορικό» (split 1128), its card still chosen; below 1128 alone (950)', async () => {
		wideScreen(true);
		serve(FULL);
		const wide = open(appointmentAt('h1', 'history', null, 'correction'), 'the 71');
		await ready();
		expect(split()).not.toHaveAttribute('data-solo');
		expect(split()).toHaveAttribute('data-open');
		expect(paneColumn()).toHaveTextContent('the 71');
		expect(listColumn()).toHaveClass('hidden', 'laptop:block');
		expect(cardOf('h1')).toHaveAttribute('data-selected', 'true');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		wide.view.unmount();
		wideScreen(false);
		open(appointmentAt('h1', 'history', null, 'correction'), 'the 71');
		await ready();
		expect(paneColumn()).not.toHaveClass('hidden');
		expect(listColumn()).toHaveClass('hidden');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 D-W51-36: an appointment’s address from 1128 — the list beside it, its card chosen and opening in place; below 1128 the 68 alone', async () => {
		wideScreen(true);
		serve(FULL);
		const wide = open(appointmentAt('u2'), 'the 68');
		await ready();
		expect(split()).not.toHaveAttribute('data-solo');
		expect(split()).toHaveAttribute('data-open');
		expect(paneColumn()).toHaveTextContent('the 68');
		expect(listColumn()).toHaveClass('hidden', 'laptop:block');
		const chosen = cardOf('u2');
		expect(chosen).toHaveAttribute('data-selected', 'true');
		expect(chosen.querySelector('[data-slot="visit-card"]')).toHaveClass(
			'laptop:border-foreground',
			'laptop:ring-1'
		);
		const link = chosen.querySelector('a') as HTMLAnchorElement;
		expect(link).toHaveAttribute('aria-current', 'page');
		expect(link).toHaveAttribute('data-sveltekit-noscroll', '');
		expect(cardOf('u3')).not.toHaveAttribute('data-selected');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		wide.view.unmount();
		wideScreen(false);
		open(appointmentAt('u2'), 'the 68');
		await ready();
		expect(paneColumn()).not.toHaveClass('hidden');
		expect(listColumn()).toHaveClass('hidden');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('(negative) from 1128 an empty pill or a failed read opens nothing: ONE column in the middle (U-139.1)', async () => {
		wideScreen(true);
		serve({ ...FULL, requests: [] });
		open(address('requests'), '');
		await waitFor(() => expect(page()).toHaveAttribute('data-view', 'empty'));
		expect(split()).toHaveAttribute('data-solo');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 D-W51-29: ποιος ακύρωσε / απέρριψε — the history in the doctor’s words', async () => {
		serve(FULL);
		open(address('history'));
		await ready();
		expect(cardOf('h1')).toHaveTextContent('Ολοκληρώθηκε');
		expect(cardOf('h2')).toHaveTextContent('Ακυρώθηκε από τον ασθενή');
		expect(cardOf('h3')).toHaveTextContent('Δεν ήρθε');
		expect(cardOf('h4')).toHaveTextContent('Απορρίφθηκε από εσάς');
		expect(cardOf('h5')).toHaveTextContent('Έληξε χωρίς απάντηση');
		const end = observed[observed.length - 1];
		await act(() =>
			end?.callback(
				[{ isIntersecting: true } as IntersectionObserverEntry],
				{} as IntersectionObserver
			)
		);
		await waitFor(() => expect(cardOf('h7')).toHaveTextContent('Ακυρώθηκε από εσάς'));
		// The open visit of the day before is «Τι έγινε» of screen 66, never the history.
		expect(shownIds()).not.toContain('open');
	});

	it('(negative) a patient’s note with HTML is words, never markup (U-65.6)', async () => {
		const hostile = {
			...TODAY_DAY.r1,
			patientNote: '<img src=x onerror=alert(1)><b>βήχας</b>'
		} as Row;
		serve({ ...FULL, requests: [hostile] });
		open(address('requests'));
		await ready();
		expect(cardOf('r1').querySelector('img, b')).toBeNull();
		expect(cardOf('r1')).toHaveTextContent('«<img src=x onerror=alert(1)><b>βήχας</b>»');
	});
});

describe('🔴 D-W51-25 · the same one tap as «Σήμερα»', () => {
	it('«Επιβεβαίωση» is one tap: one POST, a second press refused, the toast, the requests read again', async () => {
		serve(FULL);
		const { toasts } = open(address('requests'));
		await ready();
		const before = lists((url) => url.searchParams.get('status') === 'pending').length;
		const confirm = within(cardOf('r1')).getByRole('button', { name: 'Επιβεβαίωση' });
		await fireEvent.click(confirm);
		await fireEvent.click(confirm);
		await waitFor(() =>
			expect(toasts.current?.message).toBe('Επιβεβαιώθηκε. Ο ασθενής ενημερώνεται.')
		);
		const posts = calls.filter((call) => call.method === 'POST');
		expect(posts).toHaveLength(1);
		expect(posts[0].url.pathname).toMatch(/\/appointment\/appointments\/r1\/confirm$/u);
		await waitFor(() =>
			expect(lists((url) => url.searchParams.get('status') === 'pending').length).toBeGreaterThan(
				before
			)
		);
	});

	it('(negative) 403: «Κάτι πήγε στραβά. Δοκιμάστε ξανά.» — the card stays', async () => {
		serve({ ...FULL, write: { status: 403 } });
		const { toasts } = open(address('requests'));
		await ready();
		await fireEvent.click(within(cardOf('r2')).getByRole('button', { name: 'Επιβεβαίωση' }));
		await waitFor(() => expect(toasts.current?.message).toBe('Κάτι πήγε στραβά. Δοκιμάστε ξανά.'));
		expect(cardOf('r2')).toBeInTheDocument();
	});

	it('🔴 D-W51-23: a request reaching its deadline while the doctor looks leaves the list with «Το αίτημα έληξε»', async () => {
		const soon = {
			...TODAY_DAY.r1,
			expiresAt: new Date(TODAY_NOW + 2 * 60_000).toISOString()
		} as Row;
		serve({ ...FULL, requests: [soon, TODAY_DAY.r2] });
		const { toasts } = open(address('requests'));
		await ready();
		expect(shownIds()).toEqual(['r1', 'r2']);
		expect(screen.getByTestId('doctor-appointments-tab-requests')).toHaveTextContent('Αιτήματα 2');
		await vi.advanceTimersByTimeAsync(2 * 60_000 + 50);
		await waitFor(() => expect(shownIds()).toEqual(['r2']));
		expect(toasts.current?.message).toBe('Το αίτημα έληξε');
		expect(screen.getByTestId('doctor-appointments-tab-requests')).toHaveTextContent('Αιτήματα 1');
	});
});
