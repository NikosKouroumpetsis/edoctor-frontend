import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page as appPage } from '$app/state';
import { resetServerClock } from '$shared/lib/server-clock';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	doctorAppointmentDetailRow,
	doctorRequestForRelativeRow,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DoctorAppointmentMemory } from '$modules/doctor-dashboard/ui/memory';
import { projectRoot } from '../../../../../../tests/architecture/source-scan';
import Harness from './move.harness.svelte';

/*
 * Wave 5.1 · screen 70 «Αλλαγή ώρας» (D-W51-41, D-W51-51; card w51-w6): the page with the server stubbed at `fetch` (the
 * module's precedent), «now» the prototype's Saturday 14 November 2026, 12:40 Athens (10:40 UTC). Made-up people.
 */

type Detail = ReturnType<typeof doctorAppointmentDetailRow>;

const REQUEST = '0193d000-0000-7000-8000-0000000000a1';
const KEPT = '0193d000-0000-7000-8000-0000000000a2';

/** The doctor's free week from today (the server's «today» is Saturday 14), then three days of the next one. */
const WEEK = [
	['2026-11-14', ['2026-11-14T13:00:00.000Z', '2026-11-14T16:30:00.000Z']],
	['2026-11-15', []],
	['2026-11-16', ['2026-11-16T07:00:00.000Z', '2026-11-16T07:30:00.000Z']],
	['2026-11-17', ['2026-11-17T08:00:00.000Z']],
	['2026-11-18', ['2026-11-18T09:00:00.000Z']],
	['2026-11-19', ['2026-11-19T14:00:00.000Z']],
	['2026-11-20', ['2026-11-20T07:00:00.000Z']]
] as const;
const NEXT = [
	['2026-11-21', ['2026-11-21T08:00:00.000Z']],
	['2026-11-22', []],
	['2026-11-23', ['2026-11-23T07:00:00.000Z']]
] as const;

const slotsOf = (days: readonly (readonly [string, readonly string[]])[]) => ({
	appointmentId: REQUEST,
	timezone: 'Europe/Athens',
	durationMinutes: 30,
	slotsByDate: days.map(([date, starts]) => ({
		date,
		slots: starts.map((startTime) => ({
			startTime,
			endTime: new Date(Date.parse(startTime) + 30 * 60_000).toISOString()
		}))
	}))
});

let calls: { method: string; url: URL; body: unknown }[] = [];
let answer: {
	read: Detail | null;
	status?: number;
	reread?: Detail;
	write?: {
		status: number;
		message?: string;
		body?: Detail;
		error?: boolean;
		wait?: Promise<void>;
	};
};

const envelope = (data: unknown, status = 200, message = 'refused') =>
	new Response(
		status < 400
			? JSON.stringify({ status: 'success', message: '', data })
			: JSON.stringify({ errorCode: 'EC', errorMessage: message }),
		{ status }
	);

function serve(next: typeof answer) {
	answer = next;
	calls = [];
	let wrote = false;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : null });
			if (method === 'PATCH') {
				wrote = true;
				const write = answer.write ?? { status: 200 };
				if (write.wait) await write.wait;
				if (write.error) throw new TypeError('Failed to fetch');
				return envelope(write.body ?? answer.read, write.status, write.message);
			}
			if (url.pathname.endsWith('/reschedule-slots')) {
				return envelope(slotsOf(url.searchParams.get('date') === '2026-11-21' ? NEXT : WEEK));
			}
			if (!url.pathname.endsWith('/appointment/appointments')) {
				return envelope(wrote && answer.reread ? answer.reread : answer.read, answer.status ?? 200);
			}
			return envelope({ items: [], nextCursor: null, total: 0 });
		})
	);
}

const hrefOf = (id: string) => `/doctor/appointments/${id}?tab=requests`;

function open(appointmentId = REQUEST) {
	const toasts = new ToastState();
	const memory = new DoctorAppointmentMemory();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	const view = render(Harness, {
		props: { toasts, client, appointmentId, links: { appointment: hrefOf(appointmentId) }, memory }
	});
	return { toasts, client, view, memory };
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const form = () => screen.getByTestId('doctor-move');
const ready = () =>
	waitFor(() => expect(screen.getByTestId('doctor-move-times')).toBeInTheDocument());
const submit = () => screen.getByTestId('doctor-move-submit');
const slot = (startTime: string) => screen.getByTestId(`doctor-move-slot-${startTime}`);
const slotLabels = () =>
	within(screen.getByTestId('doctor-move-times'))
		.queryAllByRole('radio')
		.map((radio) => radio.textContent?.trim());
const day = (date: string) => screen.getByTestId(`doctor-move-day-${date}`);
const patches = () => calls.filter((call) => call.method === 'PATCH');
const hourReads = () => calls.filter((call) => call.url.pathname.endsWith('/reschedule-slots'));
const kept = (patch: Parameters<typeof doctorAppointmentDetailRow>[0] = {}) =>
	doctorAppointmentDetailRow({ actions: { canReschedule: true, canCancel: true }, ...patch });

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true, now: TODAY_NOW });
	resetServerClock();
	appPage.state = {};
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	appPage.state = {};
});

describe('🔴 the guards of the contract (card w51-w6)', () => {
	it('🔴 U-102: αλλαγή ώρας γιατρού = οθόνη, όχι φύλλο — a section of its page on the shared step screen; the slice imports no window, sheet or drawer', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		expect(form()).toHaveAttribute('data-slot', 'step-screen');
		expect(form()).toHaveAttribute('data-placement', 'centred');
		expect(form().tagName).toBe('SECTION');
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Αλλαγή ώρας');
		expect(
			document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal]')
		).toBeNull();
		const sources: string[] = [];
		const walk = (folder: string) => {
			for (const entry of readdirSync(folder)) {
				const path = join(folder, entry);
				if (statSync(path).isDirectory()) walk(path);
				else if (!/\.test\.ts$|harness\.svelte$/u.test(entry)) sources.push(path);
			}
		};
		walk(join(projectRoot, 'src/modules/doctor-dashboard/ui/move'));
		expect(sources.length).toBeGreaterThan(3);
		for (const path of sources) {
			expect(readFileSync(path, 'utf8'), relative(projectRoot, path)).not.toMatch(
				/action-dialog|info-dialog|modal-screen|primitives\/(?:sheet|drawer|dialog)|bottom-sheet|role="dialog"/u
			);
		}
	});

	it('🔴 U-189.1: μόνο οι πραγματικά ελεύθερες ώρες (reschedule-slots) — the doctor’s own read of a week, its hours alone on the office’s clock, a day without any dimmed, the hour that passed gone', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		const reads = hourReads();
		expect(reads).toHaveLength(1);
		expect(reads[0].url.pathname).toMatch(
			new RegExp(`/appointment/appointments/${REQUEST}/reschedule-slots$`, 'u')
		);
		expect(Object.fromEntries(reads[0].url.searchParams)).toEqual({ days: '7' });
		// No public slots, no other doctor's read: the doctor's own free time only.
		expect(calls.some((call) => call.url.pathname.includes('/availability/'))).toBe(false);
		expect(day('2026-11-15')).toBeDisabled();
		expect(day('2026-11-14')).toHaveAttribute('aria-pressed', 'true');
		expect(slotLabels()).toEqual(['15:00', '18:30']);
		await user().click(day('2026-11-16'));
		expect(slotLabels()).toEqual(['09:00', '09:30']);
	});

	it('🔴 U-190.2: αίτημα ⇒ «Αλλαγή και επιβεβαίωση» — asleep until an hour is chosen; «Ήταν / Νέα ώρα» says the request is confirmed', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		expect(submit()).toHaveTextContent('Αλλαγή και επιβεβαίωση');
		expect(submit()).toBeDisabled();
		expect(screen.queryByTestId('doctor-move-diff')).toBeNull();
		await user().click(day('2026-11-16'));
		await user().click(slot('2026-11-16T07:00:00.000Z'));
		expect(submit()).toBeEnabled();
		const diff = screen.getByTestId('doctor-move-diff');
		expect(diff.querySelector('[data-row="was"] s')).toHaveTextContent(
			'Σάββατο 14 Νοεμβρίου · 17:30'
		);
		expect(diff.querySelector('[data-row="next"]')).toHaveTextContent(
			'Δευτέρα 16 Νοεμβρίου · 09:00'
		);
		expect(diff).toHaveTextContent(
			'Το αίτημα επιβεβαιώνεται στη νέα ώρα και ο ασθενής ενημερώνεται αυτόματα. Ο ασθενής ακυρώνει μόνο με τους κανόνες σας: έως 8 ώρες πριν.'
		);
	});
});

describe('screen 70 · «Αλλαγή ώρας» (88 §70, `sw.js:497-522`)', () => {
	it('the box «Το αίτημα», the help that ends at «…που έχετε.», «Επιλέξτε ημέρα και ώρα», «Άκυρο»', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		const box = screen.getByTestId('doctor-move-context');
		expect(box).toHaveTextContent('Το αίτημα');
		expect(box).toHaveTextContent('Σάββατο 14 Νοεμβρίου · 17:30');
		expect(box).toHaveTextContent('Νίκος Μαυρίδης · Επίσκεψη · 30 λεπτά');
		expect(screen.getByTestId('doctor-move-help')).toHaveTextContent(
			'Μόνο οι ώρες που είστε πραγματικά ελεύθερος/η: το πρόγραμμά σας, χωρίς τα ραντεβού που έχετε. Η ώρα αλλάζει στο ίδιο ιατρείο και για την ίδια υπηρεσία.'
		);
		expect(screen.getByText('Επιλέξτε ημέρα και ώρα')).toBeInTheDocument();
		expect(screen.getByTestId('doctor-move-cancel')).toHaveTextContent('Άκυρο');
		expect(screen.getByTestId('doctor-move-back')).toHaveAttribute('href', hrefOf(REQUEST));
	});

	it('a kept visit: «Το ραντεβού», «Αποθήκευση», «Το ραντεβού μένει επιβεβαιωμένο…»; an hour within the 8 hours says U-90.1 Α2', async () => {
		serve({ read: kept() });
		open(KEPT);
		await ready();
		expect(screen.getByTestId('doctor-move-context')).toHaveTextContent('Το ραντεβού');
		expect(submit()).toHaveTextContent('Αποθήκευση');
		await user().click(slot('2026-11-14T13:00:00.000Z'));
		const diff = screen.getByTestId('doctor-move-diff');
		expect(diff).toHaveTextContent(
			'Το ραντεβού μένει επιβεβαιωμένο. Ο ασθενής ενημερώνεται αυτόματα.'
		);
		expect(diff).toHaveTextContent(
			'Η νέα ώρα είναι ήδη μέσα στην προθεσμία ακύρωσης (8 ώρες): ο ασθενής μπορεί να ακυρώσει ως την ώρα του ραντεβού, χωρίς «εκπρόθεσμη».'
		);
	});

	it('«Επόμενες ημέρες» reads the week after the last day; a shorter week is the end (the button goes)', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		await user().click(screen.getByTestId('doctor-move-more-days'));
		await waitFor(() => expect(day('2026-11-23')).toBeInTheDocument());
		expect(hourReads().map((call) => call.url.searchParams.get('date'))).toEqual([
			null,
			'2026-11-21'
		]);
		expect(screen.queryByTestId('doctor-move-more-days')).toBeNull();
		expect(day('2026-11-14')).toBeInTheDocument();
	});

	it('🔴 D-W51-51: success ⇒ ONE `PATCH` with the hour alone, the answer IS the detail, the lists read again, the save remembered, back to the 68', async () => {
		const confirmed = {
			...doctorRequestForRelativeRow(),
			status: 'booked',
			startTime: '2026-11-16T07:00:00.000Z',
			confirmedAt: '2026-11-14T10:41:00.000Z',
			actions: { canConfirm: false, canReject: false, canReschedule: true, canCancel: true }
		} as unknown as Detail;
		serve({ read: doctorRequestForRelativeRow(), write: { status: 200, body: confirmed } });
		const { client, memory } = open();
		const invalidate = vi.spyOn(client, 'invalidateQueries');
		await ready();
		await user().click(day('2026-11-16'));
		await user().click(slot('2026-11-16T07:00:00.000Z'));
		await user().click(submit());
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalled());
		expect(patches()).toHaveLength(1);
		expect(patches()[0].url.pathname).toMatch(
			new RegExp(`/appointment/appointments/${REQUEST}$`, 'u')
		);
		expect(patches()[0].body).toEqual({ startTime: '2026-11-16T07:00:00.000Z' });
		expect(client.getQueryData(doctorDashboardQueryKeys.detail(REQUEST))).toMatchObject({
			status: 'booked',
			startTime: '2026-11-16T07:00:00.000Z'
		});
		expect(invalidate).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.appointments() });
		expect(memory.doneOf(REQUEST)).toEqual({
			kind: 'moved',
			was: '2026-11-14T15:30:00.000Z',
			confirmed: true
		});
		expect(vi.mocked(goto)).toHaveBeenCalledWith(hrefOf(REQUEST), { replaceState: true });
	});

	it('🔴 no second press: one `PATCH` while one is on its way', async () => {
		let release = () => {};
		const wait = new Promise<void>((resolve) => (release = resolve));
		serve({ read: doctorRequestForRelativeRow(), write: { status: 200, wait } });
		open();
		await ready();
		await user().click(slot('2026-11-14T16:30:00.000Z'));
		await user().click(submit());
		await user().click(submit());
		expect(patches()).toHaveLength(1);
		release();
	});

	it('409 (the hour taken meanwhile) ⇒ its words, the hour leaves the grid, the button sleeps, the hours read again', async () => {
		serve({
			read: doctorRequestForRelativeRow(),
			write: { status: 409, message: 'Already exist: APPOINTMENT_OVERLAPS_EXISTING' }
		});
		open();
		await ready();
		await user().click(slot('2026-11-14T16:30:00.000Z'));
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-move-failure')).toHaveTextContent(
				'Αυτή η ώρα δεν είναι πλέον διαθέσιμη.'
			)
		);
		expect(submit()).toBeDisabled();
		expect(screen.queryByTestId('doctor-move-diff')).toBeNull();
		await waitFor(() => expect(hourReads().length).toBeGreaterThan(1));
		expect(slotLabels()).toEqual(['15:00']);
	});

	it('422 `RESCHEDULE_INTO_THE_PAST` ⇒ the hours read again, the hour gone; 403 ⇒ «δεν γίνεται πια» with one way back', async () => {
		serve({
			read: doctorRequestForRelativeRow(),
			write: { status: 422, message: 'Validation Error: RESCHEDULE_INTO_THE_PAST' }
		});
		const first = open();
		await ready();
		await user().click(slot('2026-11-14T13:00:00.000Z'));
		await user().click(submit());
		await waitFor(() => expect(slotLabels()).toEqual(['18:30']));
		expect(hourReads().length).toBeGreaterThan(1);
		first.view.unmount();
		serve({ read: doctorRequestForRelativeRow(), write: { status: 403 } });
		open();
		await ready();
		await user().click(slot('2026-11-14T16:30:00.000Z'));
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-move-closed-text')).toHaveTextContent(
				'Η ώρα αυτού του ραντεβού δεν μπορεί πια να αλλάξει.'
			)
		);
		expect(screen.getByTestId('doctor-move-submit')).toHaveTextContent('Πίσω στο ραντεβού');
	});

	it('a lost request ⇒ «Η αλλαγή δεν αποθηκεύτηκε…», the hour chosen STAYS and nothing is remembered', async () => {
		serve({ read: doctorRequestForRelativeRow(), write: { status: 0, error: true } });
		const { memory } = open();
		await ready();
		await user().click(slot('2026-11-14T16:30:00.000Z'));
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-move-failure')).toHaveTextContent(
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
			)
		);
		expect(slot('2026-11-14T16:30:00.000Z')).toHaveAttribute('aria-checked', 'true');
		await waitFor(() => expect(submit()).toBeEnabled());
		expect(memory.doneOf(REQUEST)).toBeNull();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('(negative) D-W51-51: one that may no longer move opens «δεν γίνεται πια» and reads no hours; another doctor’s (403) is «δεν βρέθηκε»', async () => {
		serve({ read: kept({ status: 'completed', actions: { canReschedule: false } }) });
		const first = open(KEPT);
		await waitFor(() => expect(screen.getByTestId('doctor-move-closed')).toBeInTheDocument());
		expect(hourReads()).toHaveLength(0);
		first.view.unmount();
		serve({ read: null, status: 403 });
		open(KEPT);
		await waitFor(() => expect(screen.getByTestId('doctor-move-missing')).toBeInTheDocument());
		expect(hourReads()).toHaveLength(0);
		expect(document.body.textContent).not.toMatch(/Ιωάννα|Καρρά/u);
	});
});

describe('screen 70 · ώρες, επιλογή (`sw.js:1000-1001`)', () => {
	it('another day takes the hour chosen on the last one away (the button sleeps again); the same day keeps it', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		await user().click(slot('2026-11-14T16:30:00.000Z'));
		await user().click(day('2026-11-14'));
		expect(slot('2026-11-14T16:30:00.000Z')).toHaveAttribute('aria-checked', 'true');
		expect(submit()).toBeEnabled();
		await user().click(day('2026-11-16'));
		expect(submit()).toBeDisabled();
		expect(screen.queryByTestId('doctor-move-diff')).toBeNull();
		expect(slotLabels()).toEqual(['09:00', '09:30']);
	});
});
