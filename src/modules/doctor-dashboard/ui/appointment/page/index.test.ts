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
import Harness from './appointment.harness.svelte';

/*
 * Wave 5.1 · screen 68 «Το ραντεβού», the doctor's side (D-W51-36 … 39): the page with the server stubbed at `fetch`
 * (the module's precedent), «now» the prototype's Saturday 14 November 2026, 12:40 Athens. Made-up people and numbers.
 */

type Detail = ReturnType<typeof doctorAppointmentDetailRow>;

const ID = '0193d000-0000-7000-8000-0000000000a2';
const NBSP = ' ';

let calls: { method: string; url: URL; body: unknown }[] = [];
let answer: { read: Detail | null; status?: number; write?: { status: number; body?: Detail } };

const envelope = (data: unknown, status = 200) =>
	new Response(
		status < 400
			? JSON.stringify({ status: 'success', message: '', data })
			: JSON.stringify({ status: 'error', message: 'refused' }),
		{ status }
	);

function serve(next: typeof answer) {
	answer = next;
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : null });
			if (method === 'POST') {
				const write = answer.write ?? { status: 200 };
				return envelope(write.body ?? answer.read, write.status);
			}
			return envelope(answer.read, answer.status ?? 200);
		})
	);
}

const links = {
	back: '/doctor/appointments?tab=history',
	conversation: (id: string) => `/doctor/messages/${id}`,
	newConversation: (patient: { kind: string; id: string }) =>
		`/doctor/messages/new?kind=${patient.kind}&id=${patient.id}`,
	step: (step: string) => `/doctor/appointments/${ID}/${step}?tab=history`,
	patient: (key: { kind: string; id: string }) => `/doctor/patients/${key.kind}/${key.id}`
};

function open(appointmentId = ID, memory: DoctorAppointmentMemory | null = null) {
	const toasts = new ToastState();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	const view = render(Harness, { props: { toasts, client, appointmentId, links, memory } });
	return { toasts, client, view };
}

const page = () => screen.getByTestId('doctor-appointment');
const ready = () => waitFor(() => expect(page()).toHaveAttribute('data-state', 'ready'));
const row = (id: string) => screen.getByTestId(`doctor-appointment-row-${id}`);
const gets = () => calls.filter((call) => call.method === 'GET');

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true, now: TODAY_NOW });
	resetServerClock();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('screen 68 «Το ραντεβού», a kept visit (the prototype’s `u2`)', () => {
	it('the head, the patient’s box, the rows, «Οι όροι σας», «Χρονολόγιο» — and «‹» back to the list below 1128', async () => {
		serve({ read: doctorAppointmentDetailRow() });
		open();
		await ready();
		expect(gets()[0].url.pathname).toMatch(new RegExp(`/appointment/appointments/${ID}$`, 'u'));
		expect(screen.getByTestId('doctor-appointment-status')).toHaveTextContent('Επιβεβαιωμένο');
		expect(screen.getByTestId('doctor-appointment-when')).toHaveTextContent(
			'Δευτέρα 16 Νοεμβρίου · 11:00'
		);
		expect(screen.getByTestId('doctor-appointment-sub')).toHaveTextContent(
			'Σε 2 ημέρες · Διάρκεια 20 λεπτά'
		);
		const back = screen.getByTestId('doctor-appointment-back');
		expect(back).toHaveAttribute('href', '/doctor/appointments?tab=history');
		expect(back.className).toContain('laptop:hidden');
		const patient = screen.getByTestId('doctor-appointment-patient');
		expect(patient).toHaveTextContent('Ασθενής');
		expect(screen.getByTestId('doctor-appointment-name')).toHaveTextContent('Ιωάννα Καρρά');
		expect(screen.getByTestId('doctor-appointment-visits')).toHaveTextContent(
			'4η επίσκεψη σε εσάς · τελευταία 22 Οκτωβρίου'
		);
		expect(screen.getByTestId('doctor-appointment-call')).toHaveAttribute(
			'href',
			'tel:+306977654321'
		);
		expect(row('date-time')).toHaveTextContent('Δευτέρα 16 Νοεμβρίου · 11:00');
		expect(row('office')).toHaveTextContent('Πατησίων 45, Αθήνα');
		expect(row('office')).toHaveTextContent('1ος όροφος');
		expect(row('services')).toHaveTextContent('Επανέλεγχος · 20 λεπτά');
		expect(row('note')).toHaveTextContent('Θα φέρω τις εξετάσεις αίματος.');
		expect(row('price')).toHaveTextContent('Ο ασθενής βλέπει την τιμή ως ενδεικτική.');
		const terms = screen.getByTestId('doctor-appointment-terms');
		expect(terms).toHaveTextContent('Οι όροι σας');
		expect(terms).toHaveTextContent(
			'Ο ασθενής ακυρώνει έως 8 ώρες πριν · δηλαδή έως Δευτέρα 16 Νοεμβρίου, 03:00.'
		);
		const log = screen.getByTestId('doctor-appointment-log');
		expect(within(log).getByRole('heading', { level: 2 })).toHaveTextContent('Χρονολόγιο');
		expect(
			within(log)
				.getAllByTestId('doctor-appointment-log-line')
				.map((line) => line.textContent?.replace(/\s+/gu, ' ').trim())
		).toEqual([
			'Ζητήθηκε Τρίτη 10 Νοεμβρίου, 12:04 · από τον ασθενή',
			'Επιβεβαιώθηκε Τρίτη 10 Νοεμβρίου, 12:31 · από εσάς'
		]);
		// A kept visit ahead asks for nothing.
		expect(page().querySelector('[data-slot="notice-card"]')).toBeNull();
	});

	it('🔴 U-182.7: ο γιατρός βλέπει ολόκληρα — mobile, email, ΑΜΚΑ, ΑΦΜ whole, the mobile dials', async () => {
		serve({ read: doctorAppointmentDetailRow() });
		open();
		await ready();
		const facts = row('patient');
		expect(facts).toHaveTextContent('Στοιχεία ασθενή');
		expect(
			within(facts).getByRole('link', { name: ['+30', '697', '765', '4321'].join(NBSP) })
		).toHaveAttribute('href', 'tel:+306977654321');
		expect(facts).toHaveTextContent('ioanna.karra@example.gr');
		expect(facts).toHaveTextContent('23048501234');
		expect(facts).toHaveTextContent('098765432');
		expect(facts.textContent).not.toMatch(/[*•]/u);
	});

	// Rewrites «U-193.1 (ως το βήμα 10): Μήνυμα μόνο με συνομιλία» (step 4) → D-W51-87: the doctor writes first.
	it('🔴 U-193.1: ο γιατρός γράφει πρώτος — «Μήνυμα» to the conversation with one, to a conversation the doctor starts without', async () => {
		serve({ read: doctorAppointmentDetailRow() });
		const first = open();
		await ready();
		expect(screen.getByTestId('doctor-appointment-message')).toHaveAttribute(
			'href',
			'/doctor/messages/0193d000-0000-7000-8000-0000000000c1'
		);
		first.view.unmount();
		serve({ read: doctorAppointmentDetailRow({ conversationId: null }) });
		open();
		await ready();
		expect(screen.getByTestId('doctor-appointment-message')).toHaveAttribute(
			'href',
			'/doctor/messages/new?kind=account&id=0193d000-0000-7000-8000-0000000000e1'
		);
		expect(screen.getByTestId('doctor-appointment-call')).toBeInTheDocument();
	});

	it('🔴 D-W51-71: χωρίς λογαριασμό = χωρίς Μήνυμα — «Χωρίς λογαριασμό eDoctor» under the name, «Κλήση» stays, no «Μήνυμα» even when an answer names a conversation', async () => {
		serve({ read: doctorAppointmentDetailRow({ patientKind: 'RECORD' }) });
		open();
		await ready();
		expect(screen.getByTestId('doctor-appointment-no-account')).toHaveTextContent(
			'Χωρίς λογαριασμό eDoctor'
		);
		expect(
			within(screen.getByTestId('doctor-appointment-patient')).getByTestId(
				'doctor-appointment-no-account'
			).className
		).toContain('bg-chip');
		expect(screen.queryByTestId('doctor-appointment-message')).toBeNull();
		expect(screen.queryByRole('link', { name: 'Μήνυμα' })).toBeNull();
		expect(screen.getByTestId('doctor-appointment-call')).toBeInTheDocument();
	});

	it('D-W51-71 (negative): an account’s appointment has no such word', async () => {
		serve({ read: doctorAppointmentDetailRow() });
		open();
		await ready();
		expect(screen.queryByTestId('doctor-appointment-no-account')).toBeNull();
		expect(page()).not.toHaveTextContent('Χωρίς λογαριασμό eDoctor');
	});

	it('🔴 U-197.2 · D-W51-70: after screen 72 — «Το ραντεβού κλείστηκε.» with how the patient was told, and ONE «Κλείστηκε · από εσάς» in the trail', async () => {
		const memory = new DoctorAppointmentMemory();
		memory.remember(ID, { kind: 'booked', told: ['email', 'sms'] });
		const created = {
			id: 'l1',
			appointmentId: ID,
			action: 'CREATED',
			actorRole: 'DOCTOR',
			actorUserId: null,
			reason: null,
			beforeSnapshot: null,
			afterSnapshot: { status: 'booked', startTime: '2026-11-16T09:00:00.000Z' },
			createdAt: '2026-11-14T10:45:00.000Z'
		};
		serve({
			read: doctorAppointmentDetailRow({
				patientKind: 'RECORD',
				status: 'booked',
				auditLogs: [created, { ...created, id: 'l2', action: 'CONFIRMED' }]
			})
		});
		open(ID, memory);
		await ready();
		const done = screen.getByTestId('doctor-appointment-done');
		expect(done).toHaveTextContent('Το ραντεβού κλείστηκε.');
		expect(done).toHaveTextContent('Ο ασθενής ενημερώθηκε με SMS και email.');
		const trail = screen.getByTestId('doctor-appointment-log');
		expect(trail).toHaveTextContent('Κλείστηκε');
		expect(trail).toHaveTextContent('από εσάς');
		expect(trail).not.toHaveTextContent('Ζητήθηκε');
		expect(trail).not.toHaveTextContent('Επιβεβαιώθηκε');
	});

	// Rewrites «🔴 D-W51-39: ως τα βήματα 5–7 καμία «Αλλαγή», «Απόρριψη», «Ακύρωση ραντεβού», «Διόρθωση»» of step 4:
	// D-W51-49 (step 5, card w51-w5) draws «Απόρριψη» and «Ακύρωση ραντεβού» — screen 69 exists; the rest still waits.
	// Rewrites «D-W51-39 · D-W51-49: ως τα βήματα 6–7 καμία «Αλλαγή», «Διόρθωση»»: D-W51-51 / 52 (step 6) bring every
	// «Αλλαγή» of screen 70, card w51-w6 §3; «Διόρθωση» stays out until step 7.
	// Rewrites «… no «Διόρθωση» until step 7»: D-W51-61 / 62 (step 7, card w51-w7 §1, which overturns D-W51-39 for it)
	// draw «Διόρθωση» with the server's `actions.correction` (its tests below) — a kept visit ahead has none.
	it('🔴 D-W51-49 · D-W51-51 / 52 · D-W51-61: «Αλλαγή» of «Ημέρα και ώρα», «Υπηρεσίες», «Κόστος» leads to its 70 with the server’s `actions`; no «Διόρθωση» without `actions.correction`; «Ακύρωση ραντεβού» leads to 69', async () => {
		serve({
			read: doctorAppointmentDetailRow({
				actions: { canReschedule: true, canCancel: true, canEditCharges: true }
			})
		});
		open();
		await ready();
		const changes = [...page().querySelectorAll('[data-slot="change-link"]')];
		expect(
			changes.map((link) => [
				link.closest('[data-slot="fact-row"]')?.getAttribute('data-row'),
				link.getAttribute('href'),
				link.getAttribute('aria-label')
			])
		).toEqual([
			['date-time', `/doctor/appointments/${ID}/time?tab=history`, 'Αλλαγή: Ημέρα και ώρα'],
			['services', `/doctor/appointments/${ID}/services?tab=history`, 'Αλλαγή: Υπηρεσίες'],
			['price', `/doctor/appointments/${ID}/services?tab=history`, 'Αλλαγή: Κόστος']
		]);
		expect(page().textContent).not.toMatch(/Διόρθωση/u);
		expect(screen.getByTestId('doctor-appointment-cancel')).toHaveAttribute(
			'href',
			`/doctor/appointments/${ID}/cancel?tab=history`
		);
		// Rewrites «The patient's box is no link until screen 73 (step 9)» of card w51-w4: 🔴 D-W51-73 (card w51-w9 §2,
		// «ανατρέπει ρητά τον φρουρό») — since step 9 the box is ONE link, to the patient's card.
		expect(screen.getByTestId('doctor-appointment-patient').closest('a')).toBeNull();
		expect(screen.getByTestId('doctor-appointment-patient').querySelectorAll('a')).toHaveLength(1);
	});

	it('🔴 D-W51-73: το όνομα στη 68 ⇒ καρτέλα — the box opens the card of screen 73 one step on (`doctorPatient` depth 1), so its «‹» comes back here', async () => {
		serve({ read: doctorAppointmentDetailRow() });
		open();
		await ready();
		const link = screen.getByTestId('doctor-appointment-patient-link');
		// The sample's account: `patientId` of the row, no relative.
		expect(link).toHaveAttribute(
			'href',
			'/doctor/patients/account/0193d000-0000-7000-8000-0000000000e1'
		);
		expect(link).toHaveTextContent('Ιωάννα Καρρά');
		expect(link.querySelector('svg')).not.toBeNull();
		await userEvent.click(link);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(
			'/doctor/patients/account/0193d000-0000-7000-8000-0000000000e1',
			{ state: { doctorPatient: { depth: 1 } } }
		);
	});

	it('🔴 D-W51-90 (`sw.js:989` `ap-back`): opened from a line of the doctor’s notifications (`doctorNotification` depth 1), «‹» goes back ONE step to the list — at every width; opened by a link, the list of 67 as before', async () => {
		serve({ read: doctorAppointmentDetailRow() });
		const go = vi.spyOn(history, 'go').mockImplementation(() => undefined);
		appPage.state = { doctorNotification: { depth: 1 } };
		try {
			const first = open();
			await ready();
			const back = screen.getByTestId('doctor-appointment-back');
			expect(back).toHaveAttribute('data-from', 'notifications');
			expect(back.className).not.toContain('laptop:hidden');
			// The link stays the list's (a new tab, no script): only a plain press goes back.
			expect(back).toHaveAttribute('href', '/doctor/appointments?tab=history');
			await userEvent.click(back);
			expect(go).toHaveBeenCalledWith(-1);
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
			first.view.unmount();

			appPage.state = {};
			go.mockClear();
			open();
			await ready();
			const plain = screen.getByTestId('doctor-appointment-back');
			expect(plain).not.toHaveAttribute('data-from');
			expect(plain.className).toContain('laptop:hidden');
			// jsdom cannot follow the link: it stops at the document, after the page's own handler.
			let held: boolean | null = null;
			const hold = (event: MouseEvent) => {
				held = event.defaultPrevented;
				event.preventDefault();
			};
			document.addEventListener('click', hold);
			plain.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
			document.removeEventListener('click', hold);
			expect(held).toBe(false);
			expect(go).not.toHaveBeenCalled();
		} finally {
			appPage.state = {};
			go.mockRestore();
		}
	});

	it('D-W51-73: a record’s name opens the record’s card; a relative’s the relative’s; an answer without a server id is no link (U-65.6)', async () => {
		const RECORD = '0193d000-0000-7000-8000-0000000000b3';
		const RELATIVE = '0193d000-0000-7000-8000-0000000000b4';
		serve({ read: doctorAppointmentDetailRow({ patientKind: 'RECORD', patientId: RECORD }) });
		const first = open();
		await ready();
		expect(screen.getByTestId('doctor-appointment-patient-link')).toHaveAttribute(
			'href',
			`/doctor/patients/record/${RECORD}`
		);
		first.view.unmount();
		serve({
			read: doctorAppointmentDetailRow({ bookedForType: 'RELATIVE', relativeId: RELATIVE })
		});
		const second = open();
		await ready();
		expect(screen.getByTestId('doctor-appointment-patient-link')).toHaveAttribute(
			'href',
			`/doctor/patients/relative/${RELATIVE}`
		);
		second.view.unmount();
		serve({ read: doctorAppointmentDetailRow({ patientId: 'not-an-id' }) });
		open();
		await ready();
		expect(screen.queryByTestId('doctor-appointment-patient-link')).toBeNull();
		expect(screen.getByTestId('doctor-appointment-name')).toHaveTextContent('Ιωάννα Καρρά');
	});
});

describe('screen 68 · by state (88 §68)', () => {
	it('a request for a relative: its deadline, «Απόρριψη» (a link to 69) and «Επιβεβαίωση»; «Ασθενής» and «Το έκλεισε» apart; «Επιβεβαίωση από εσάς»', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open('0193d000-0000-7000-8000-0000000000a1');
		await ready();
		const block = screen.getByTestId('doctor-appointment-request');
		expect(block).toHaveAttribute('data-tone', 'warm');
		expect(block).toHaveTextContent('Το αίτημα λήγει σήμερα στις 16:30, αν δεν απαντήσετε.');
		expect(
			within(block)
				.getAllByRole('button')
				.map((button) => button.textContent?.trim())
		).toEqual(['Επιβεβαίωση']);
		expect(within(block).getByRole('link', { name: 'Απόρριψη' })).toBe(
			screen.getByTestId('doctor-appointment-reject')
		);
		// A request is refused, never canceled (`sw.js:438`): no «Ακύρωση ραντεβού» though the server allows it.
		expect(screen.queryByTestId('doctor-appointment-cancel')).toBeNull();
		expect(screen.getByTestId('doctor-appointment-name')).toHaveTextContent(
			'Νίκος Μαυρίδης (γιος)'
		);
		expect(screen.getByTestId('doctor-appointment-visits')).toHaveTextContent(
			'Πρώτη επίσκεψη σε εσάς'
		);
		expect(row('visitor')).toHaveTextContent('01021512345');
		expect(row('visitor')).toHaveTextContent('Άνδρας');
		expect(row('booker')).toHaveTextContent('Το έκλεισε');
		expect(row('booker')).toHaveTextContent('Ελένη Μαυρίδη');
		expect(row('booker')).toHaveTextContent('12057801234');
		expect(row('booker')).toHaveTextContent('123456789');
		expect(screen.getByTestId('doctor-appointment-terms')).toHaveTextContent(
			'Επιβεβαίωση από εσάς'
		);
		// No conversation and no server id of the relative to start one with: «Κλήση» alone (U-193.1).
		expect(screen.queryByTestId('doctor-appointment-message')).toBeNull();
	});

	it('🔴 D-W51-25: «Επιβεβαίωση» is one tap — one POST, the answer IS the detail (never read again), the toast', async () => {
		const confirmed = {
			...doctorRequestForRelativeRow(),
			status: 'booked',
			confirmedAt: '2026-11-14T10:41:00.000Z',
			actions: { ...doctorRequestForRelativeRow().actions, canConfirm: false, canReject: false }
		} as Detail;
		serve({ read: doctorRequestForRelativeRow(), write: { status: 200, body: confirmed } });
		const { toasts, client } = open('0193d000-0000-7000-8000-0000000000a1');
		await ready();
		const before = gets().length;
		await userEvent
			.setup({ advanceTimers: vi.advanceTimersByTime })
			.click(screen.getByTestId('doctor-appointment-confirm'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-appointment-status')).toHaveTextContent('Επιβεβαιωμένο')
		);
		const posts = calls.filter((call) => call.method === 'POST');
		expect(posts).toHaveLength(1);
		expect(posts[0].url.pathname).toMatch(/\/0193d000-0000-7000-8000-0000000000a1\/confirm$/u);
		expect(gets().filter((call) => call.url.pathname.endsWith('0000000000a1'))).toHaveLength(
			before
		);
		expect(
			client.getQueryData(doctorDashboardQueryKeys.detail('0193d000-0000-7000-8000-0000000000a1'))
		).toMatchObject({ status: 'booked' });
		expect(toasts.current?.message).toBe('Επιβεβαιώθηκε. Ο ασθενής ενημερώνεται.');
		expect(screen.queryByTestId('doctor-appointment-request')).toBeNull();
	});

	it('🔴 U-200.1 · D-W51-91: «Επιβεβαίωση» on the 68 asks the doctor’s side of the notifications again (its «Νέο αίτημα» read by the server), never the patient’s', async () => {
		const confirmed = {
			...doctorRequestForRelativeRow(),
			status: 'booked',
			actions: { ...doctorRequestForRelativeRow().actions, canConfirm: false, canReject: false }
		} as Detail;
		serve({ read: doctorRequestForRelativeRow(), write: { status: 200, body: confirmed } });
		const { client } = open('0193d000-0000-7000-8000-0000000000a1');
		client.setQueryData(['notifications', 'inbox', 'doctor', 'list', 'new', 'el'], { pages: [] });
		client.setQueryData(['notifications', 'inbox', 'patient', 'unread'], 2);
		await ready();
		await userEvent
			.setup({ advanceTimers: vi.advanceTimersByTime })
			.click(screen.getByTestId('doctor-appointment-confirm'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-appointment-status')).toHaveTextContent('Επιβεβαιωμένο')
		);
		expect(
			client.getQueryState(['notifications', 'inbox', 'doctor', 'list', 'new', 'el'])?.isInvalidated
		).toBe(true);
		expect(
			client.getQueryState(['notifications', 'inbox', 'patient', 'unread'])?.isInvalidated
		).toBe(false);
	});

	it('a visit begun: «Τι έγινε με την επίσκεψη;» with «Δεν ήρθε · Ολοκληρώθηκε», the dark one last; then the green card', async () => {
		const begun = doctorAppointmentDetailRow({
			startTime: '2026-11-14T08:30:00.000Z',
			unattendedOutcomeAt: '2026-11-15T08:30:00.000Z',
			actions: { canCancel: true, outcomes: ['ARRIVED', 'NO_SHOW', 'COMPLETED'] }
		});
		const done = {
			...begun,
			status: 'completed',
			actions: { ...begun.actions, outcomes: [] }
		} as Detail;
		serve({ read: begun, write: { status: 200, body: done } });
		open();
		await ready();
		const block = screen.getByTestId('doctor-appointment-outcome');
		expect(block).toHaveTextContent('Τι έγινε με την επίσκεψη;');
		expect(block).toHaveTextContent('Αν δεν απαντήσετε, αύριο στις 10:30 γράφεται «Ολοκληρώθηκε».');
		const buttons = within(block).getAllByRole('button');
		expect(buttons.map((button) => button.textContent?.trim())).toEqual([
			'Δεν ήρθε',
			'Ολοκληρώθηκε'
		]);
		expect(buttons[1].dataset.tone).toBe('contrast');
		await userEvent
			.setup({ advanceTimers: vi.advanceTimersByTime })
			.click(screen.getByTestId('doctor-appointment-completed'));
		const green = await screen.findByTestId('doctor-appointment-done');
		expect(green).toHaveAttribute('data-tone', 'done');
		expect(green).toHaveAttribute('role', 'status');
		expect(green).toHaveTextContent('Γράφτηκε «Ολοκληρώθηκε».');
		expect(green).toHaveTextContent('Ο ασθενής μπορεί να γράψει κριτική.');
		expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ outcome: 'COMPLETED' });
	});

	it('refused / canceled: who, when, the reason, the words; over, its length alone; a completed one the server opens no correction on says nothing', async () => {
		serve({
			read: doctorAppointmentDetailRow({
				status: 'canceled',
				canceledBy: 'DOCTOR',
				canceledAt: '2026-11-14T10:45:00.000Z',
				cancelReasonCode: 'EMERGENCY',
				cancelReasonText: 'Έκτακτη εφημερία.',
				actions: { canCancel: false, canReschedule: false }
			})
		});
		const first = open();
		await ready();
		const closed = screen.getByTestId('doctor-appointment-closed');
		expect(closed).toHaveAttribute('data-tone', 'neutral');
		expect(closed).toHaveTextContent('Το ραντεβού ακυρώθηκε.');
		expect(closed).toHaveTextContent('Από εσάς · Σάββατο 14 Νοεμβρίου, 12:45');
		expect(closed).toHaveTextContent('Λόγος: Έκτακτο περιστατικό');
		expect(closed).toHaveTextContent('Το μήνυμά σας: «Έκτακτη εφημερία.»');
		expect(closed).toHaveTextContent('Ο ασθενής ενημερώθηκε.');
		expect(screen.getByTestId('doctor-appointment-status')).toHaveTextContent('Ακυρώθηκε από εσάς');
		expect(screen.getByTestId('doctor-appointment-sub')).toHaveTextContent(/^Διάρκεια 20 λεπτά$/u);
		expect(screen.queryByTestId('doctor-appointment-terms')).toBeNull();
		first.view.unmount();
		serve({
			read: doctorAppointmentDetailRow({
				status: 'completed',
				outcomeSource: 'SYSTEM',
				actions: { canCancel: false, canReschedule: false }
			})
		});
		open();
		await ready();
		expect(page().querySelector('[data-slot="notice-card"]')).toBeNull();
		expect(page().textContent).not.toMatch(/Διόρθωση|διορθώσετε/u);
	});

	it('(negative) 403 and 404 read the same «Δεν βρήκαμε αυτό το ραντεβού» (another doctor’s is never told apart); a failure retries', async () => {
		for (const status of [403, 404]) {
			serve({ read: null, status });
			const view = open();
			await waitFor(() => expect(page()).toHaveAttribute('data-state', 'missing'));
			const missing = screen.getByTestId('doctor-appointment-missing');
			expect(missing).toHaveTextContent('Δεν βρήκαμε αυτό το ραντεβού');
			expect(within(missing).getByRole('link', { name: 'Ραντεβού' })).toHaveAttribute(
				'href',
				'/doctor/appointments?tab=history'
			);
			expect(page().textContent).not.toMatch(/ΑΜΚΑ|Κινητό/u);
			view.view.unmount();
		}
		serve({ read: null, status: 500 });
		open();
		// A failure that is no refusal is asked once more (the reads' own retry, 1″ later) before it says so.
		await vi.advanceTimersByTimeAsync(1_500);
		await waitFor(() => expect(page()).toHaveAttribute('data-state', 'failed'));
		expect(gets()).toHaveLength(2);
		serve({ read: doctorAppointmentDetailRow() });
		await userEvent
			.setup({ advanceTimers: vi.advanceTimersByTime })
			.click(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await ready();
	});

	it('(negative, U-65.6) the patient’s note, a reason’s words and a name with HTML are words, never markup', async () => {
		serve({
			read: doctorAppointmentDetailRow({
				patientNote: '<img src=x onerror=alert(1)><b>βήχας</b>',
				patientSnapshot: {
					id: 'p',
					tenantUserId: null,
					firstName: '<b>Ιωάννα</b>',
					lastName: 'Καρρά',
					phoneE164: '306977654321'
				}
			})
		});
		open();
		await ready();
		expect(page().querySelector('img, b')).toBeNull();
		expect(row('note')).toHaveTextContent('<img src=x onerror=alert(1)><b>βήχας</b>');
		expect(screen.getByTestId('doctor-appointment-name')).toHaveTextContent('<b>Ιωάννα</b> Καρρά');
	});
});

describe('🔴 D-W51-49 · screen 68 opens screen 69 (card w51-w5)', () => {
	it('«Απόρριψη» of a request — round, outlined, before the dark «Επιβεβαίωση» — opens 69 as ONE more step of the history (U-102)', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open('0193d000-0000-7000-8000-0000000000a1');
		await ready();
		const stack = screen.getByTestId('doctor-appointment-answers');
		const reject = within(stack).getByRole('link', { name: 'Απόρριψη' });
		expect(stack.firstElementChild).toBe(reject);
		expect(reject).toHaveAttribute('data-tone', 'outline');
		expect(reject.className).toContain('rounded-full');
		// The screen's own address of the step (this file's `links.step`).
		expect(reject).toHaveAttribute('href', `/doctor/appointments/${ID}/reject?tab=history`);
		await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(reject);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/appointments/${ID}/reject?tab=history`, {
			state: { doctorAppointment: { depth: 1 } }
		});
	});

	it('«Ακύρωση ραντεβού» at the end only with the server’s `canCancel`, as one more step; (negative) none without it', async () => {
		serve({ read: doctorAppointmentDetailRow({ actions: { canCancel: true } }) });
		const first = open();
		await ready();
		const cancel = screen.getByTestId('doctor-appointment-cancel');
		expect(cancel).toHaveTextContent('Ακύρωση ραντεβού');
		expect(cancel.className).toContain('underline');
		expect(cancel.className).toContain('min-h-touch');
		await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(cancel);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/appointments/${ID}/cancel?tab=history`, {
			state: { doctorAppointment: { depth: 1 } }
		});
		first.view.unmount();
		serve({ read: doctorAppointmentDetailRow({ actions: { canCancel: false } }) });
		open();
		await ready();
		expect(screen.queryByTestId('doctor-appointment-cancel')).toBeNull();
		expect(page().textContent).not.toMatch(/Ακύρωση ραντεβού/u);
	});
});

describe('screen 68 · what leads to screen 70 (step 6, D-W51-51 / 52)', () => {
	it('🔴 U-190.1 · D-W51-51: a request’s answers «Απόρριψη · Αλλαγή · Επιβεβαίωση», the dark one last; «Αλλαγή» opens its 70 as one more step', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open('0193d000-0000-7000-8000-0000000000a1');
		await ready();
		const stack = screen.getByTestId('doctor-appointment-answers');
		expect(
			[...stack.querySelectorAll('a, button')].map((entry) => entry.textContent?.trim())
		).toEqual(['Απόρριψη', 'Αλλαγή', 'Επιβεβαίωση']);
		const move = screen.getByTestId('doctor-appointment-move');
		expect(move).toHaveAttribute('href', `/doctor/appointments/${ID}/time?tab=history`);
		await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(move);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/appointments/${ID}/time?tab=history`, {
			state: { doctorAppointment: { depth: 1 } }
		});
	});

	it('D-W51-51 / 52 (negative): no «Αλλαγή» without the server’s `canReschedule` / `canEditCharges`, nor of the hour of one that is over', async () => {
		serve({
			read: doctorAppointmentDetailRow({
				actions: { canReschedule: false, canCancel: true, canEditCharges: false }
			})
		});
		const first = open();
		await ready();
		expect(page().querySelector('[data-slot="change-link"]')).toBeNull();
		first.view.unmount();
		serve({
			read: doctorAppointmentDetailRow({
				status: 'completed',
				actions: { canReschedule: true, canCancel: false, canEditCharges: false }
			})
		});
		open();
		await ready();
		expect(page().querySelector('[data-slot="change-link"]')).toBeNull();
	});

	it('D-W51-52: «Τελική τιμή που ορίσατε.» under «Κόστος» when the doctor set the price; (negative) none for the services’ own', async () => {
		serve({
			read: doctorAppointmentDetailRow({
				finalTotalAmount: 40,
				priceOverriddenAt: '2026-11-14T10:00:00.000Z',
				actions: { canEditCharges: true }
			})
		});
		const first = open();
		await ready();
		expect(row('price')).toHaveTextContent('40 €');
		expect(row('price').querySelector('[data-slot="fact-row-note"]')).toHaveTextContent(
			'Τελική τιμή που ορίσατε.'
		);
		first.view.unmount();
		serve({ read: doctorAppointmentDetailRow({ priceOverriddenAt: null }) });
		open();
		await ready();
		expect(row('price').querySelector('[data-slot="fact-row-note"]')).toBeNull();
	});

	it('🔴 D-W51-51: after the move the green card of the 52 — «Η ώρα άλλαξε και το ραντεβού επιβεβαιώθηκε.» / «Η ώρα άλλαξε.», «Ήταν …», from the screen’s memory only', async () => {
		serve({ read: doctorAppointmentDetailRow() });
		const memory = new DoctorAppointmentMemory();
		memory.remember(ID, { kind: 'moved', was: '2026-11-14T15:30:00.000Z', confirmed: true });
		const first = open(ID, memory);
		await ready();
		const card = screen.getByTestId('doctor-appointment-done');
		expect(card).toHaveAttribute('data-tone', 'done');
		expect(card).toHaveAttribute('role', 'status');
		expect(card).toHaveTextContent('Η ώρα άλλαξε και το ραντεβού επιβεβαιώθηκε.');
		expect(card).toHaveTextContent(
			'Ήταν Σάββατο 14 Νοεμβρίου · 17:30. Ο ασθενής ενημερώθηκε αυτόματα.'
		);
		first.view.unmount();
		memory.remember(ID, { kind: 'moved', was: '2026-11-14T15:30:00.000Z', confirmed: false });
		const second = open(ID, memory);
		await ready();
		expect(screen.getByTestId('doctor-appointment-done')).toHaveTextContent('Η ώρα άλλαξε.');
		expect(screen.getByTestId('doctor-appointment-done')).not.toHaveTextContent('επιβεβαιώθηκε');
		second.view.unmount();
		// (negative) another appointment's save, or none, says nothing here.
		memory.remember('0193d000-0000-7000-8000-0000000000ff', { kind: 'charges' });
		open(ID, memory);
		await ready();
		expect(screen.queryByTestId('doctor-appointment-done')).toBeNull();
	});

	it('D-W51-52: after «Υπηρεσίες και κόστος» «Αποθηκεύτηκε.» and what the patient sees; (negative) never over how a canceled one ended', async () => {
		serve({ read: doctorAppointmentDetailRow() });
		const memory = new DoctorAppointmentMemory();
		memory.remember(ID, { kind: 'charges' });
		const first = open(ID, memory);
		await ready();
		const card = screen.getByTestId('doctor-appointment-done');
		expect(card).toHaveTextContent('Αποθηκεύτηκε.');
		expect(card).toHaveTextContent('Ο ασθενής βλέπει τις νέες υπηρεσίες και την τελική τιμή.');
		first.view.unmount();
		serve({
			read: doctorAppointmentDetailRow({
				status: 'canceled',
				canceledBy: 'PATIENT',
				canceledAt: '2026-11-14T10:30:00.000Z',
				actions: { canCancel: false, canReschedule: false }
			})
		});
		open(ID, memory);
		await ready();
		expect(screen.queryByTestId('doctor-appointment-done')).toBeNull();
		expect(screen.getByTestId('doctor-appointment-closed')).toBeInTheDocument();
	});
});

describe('🔴 screen 71 · the outcome’s blocks on the 68 (D-W51-61, card w51-w7)', () => {
	const ONGOING = {
		// 12:30 – 12:50 Athens, «now» 12:40: the visit lasts.
		startTime: '2026-11-14T10:30:00.000Z',
		unattendedOutcomeAt: '2026-11-15T10:50:00.000Z',
		actions: { canCancel: true, outcomes: ['ARRIVED', 'NO_SHOW', 'COMPLETED'] }
	};

	it('🔴 U-190.1: Δεν ήρθε · Ολοκληρώθηκε το ένα κάτω από το άλλο — one column at every width, round, the dark one last; what each means under them', async () => {
		serve({ read: doctorAppointmentDetailRow(ONGOING) });
		open();
		await ready();
		const block = screen.getByTestId('doctor-appointment-outcome');
		expect(block).toHaveTextContent('Η επίσκεψη είναι σε εξέλιξη.');
		const stack = within(block).getByTestId('doctor-appointment-answers');
		expect(stack.className).toContain('grid-cols-1');
		expect(stack.className).not.toMatch(/(?:tablet|laptop|split):grid-cols-/u);
		const buttons = [...stack.querySelectorAll('button')];
		expect(buttons.map((button) => button.textContent?.trim())).toEqual([
			'Δεν ήρθε',
			'Ολοκληρώθηκε'
		]);
		for (const button of buttons) expect(button.className).toContain('rounded-full');
		expect(buttons[1].dataset.tone).toBe('contrast');
		expect(screen.getByTestId('doctor-appointment-outcome-meaning')).toHaveTextContent(
			'«Ολοκληρώθηκε»: ο ασθενής μπορεί να γράψει κριτική. «Δεν ήρθε»: ο ασθενής ενημερώνεται και δεν γράφει κριτική.'
		);
	});

	it('🔴 D-W51-61: σε εξέλιξη ⇒ ARRIVED — «Ήρθε, είναι ακόμα στο ιατρείο» is one tap (`ARRIVED`), then «Ο ασθενής είναι στο ιατρείο.» with the two buttons and no link', async () => {
		const read = doctorAppointmentDetailRow(ONGOING);
		const arrived = {
			...read,
			status: 'checked_in',
			actions: { ...read.actions, outcomes: ['NO_SHOW', 'COMPLETED'] }
		} as Detail;
		serve({ read, write: { status: 200, body: arrived } });
		const { toasts } = open();
		await ready();
		const link = screen.getByTestId('doctor-appointment-arrived');
		expect(link).toHaveTextContent('Ήρθε, είναι ακόμα στο ιατρείο');
		expect(link.className).toContain('min-h-touch');
		await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(link);
		await waitFor(() =>
			expect(screen.getByTestId('doctor-appointment-outcome')).toHaveTextContent(
				'Ο ασθενής είναι στο ιατρείο.'
			)
		);
		const posts = calls.filter((call) => call.method === 'POST');
		expect(posts).toHaveLength(1);
		expect(posts[0].url.pathname).toMatch(new RegExp(`/${ID}/outcome$`, 'u'));
		expect(posts[0].body).toEqual({ outcome: 'ARRIVED' });
		expect(toasts.current?.message).toBe('Στο ιατρείο');
		expect(screen.queryByTestId('doctor-appointment-arrived')).toBeNull();
		expect(screen.queryByTestId('doctor-appointment-done')).toBeNull();
		expect(screen.getByTestId('doctor-appointment-no-show')).toBeInTheDocument();
		expect(screen.getByTestId('doctor-appointment-completed')).toBeInTheDocument();
	});

	it('(negative) no «Ήρθε» link once the visit is over, nor without the server’s `ARRIVED`', async () => {
		serve({
			read: doctorAppointmentDetailRow({ ...ONGOING, startTime: '2026-11-14T08:30:00.000Z' })
		});
		const first = open();
		await ready();
		expect(screen.getByTestId('doctor-appointment-outcome')).toHaveTextContent(
			'Τι έγινε με την επίσκεψη;'
		);
		expect(screen.queryByTestId('doctor-appointment-arrived')).toBeNull();
		first.view.unmount();
		serve({
			read: doctorAppointmentDetailRow({
				...ONGOING,
				actions: { canCancel: true, outcomes: ['NO_SHOW', 'COMPLETED'] }
			})
		});
		open();
		await ready();
		expect(screen.queryByTestId('doctor-appointment-arrived')).toBeNull();
	});

	it('🔴 U-196.1 · D-W51-62: the doctor’s own answer — «Γράψατε «Δεν ήρθε». Αν έγινε λάθος, …» and «Διόρθωση», which opens screen 71 as one more step (U-102: διόρθωση = οθόνη)', async () => {
		serve({
			read: doctorAppointmentDetailRow({
				status: 'no_show',
				startTime: '2026-11-13T16:00:00.000Z',
				outcomeSource: 'DOCTOR',
				outcomeAt: '2026-11-13T16:40:00.000Z',
				outcomeCorrectableUntil: '2026-11-15T16:20:00.000Z',
				actions: {
					canCancel: false,
					canReschedule: false,
					correction: { to: 'COMPLETED', until: '2026-11-15T16:20:00.000Z' } as never
				}
			})
		});
		open();
		await ready();
		const block = screen.getByTestId('doctor-appointment-correction');
		expect(block).toHaveAttribute('data-tone', 'neutral');
		expect(block).toHaveTextContent(
			'Γράψατε «Δεν ήρθε». Αν έγινε λάθος, μπορείτε να το διορθώσετε ως αύριο, 18:20.'
		);
		const fix = within(block).getByRole('link', { name: 'Διόρθωση' });
		expect(fix).toBe(screen.getByTestId('doctor-appointment-correct'));
		expect(fix).toHaveAttribute('data-tone', 'outline');
		expect(fix.className).toContain('rounded-full');
		expect(fix).toHaveAttribute('href', `/doctor/appointments/${ID}/correction?tab=history`);
		await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(fix);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(
			`/doctor/appointments/${ID}/correction?tab=history`,
			{ state: { doctorAppointment: { depth: 1 } } }
		);
		expect(document.querySelector('[role="dialog"], [aria-modal]')).toBeNull();
	});

	it('D-W51-61: the system’s «Ολοκληρώθηκε» — «Το «Ολοκληρώθηκε» γράφτηκε αυτόματα, …» and «Διόρθωση»; at the end of the window the appointment is read again', async () => {
		const until = new Date(TODAY_NOW + 5 * 60_000).toISOString();
		serve({
			read: doctorAppointmentDetailRow({
				status: 'completed',
				startTime: '2026-11-12T10:25:00.000Z',
				outcomeSource: 'SYSTEM',
				outcomeCorrectableUntil: until,
				actions: {
					canCancel: false,
					canReschedule: false,
					correction: { to: 'NO_SHOW', until } as never
				}
			})
		});
		open();
		await ready();
		expect(screen.getByTestId('doctor-appointment-correction')).toHaveTextContent(
			'Το «Ολοκληρώθηκε» γράφτηκε αυτόματα, γιατί δεν δηλώσατε έκβαση. Μπορείτε να το διορθώσετε ως σήμερα, 12:45.'
		);
		serve({ read: doctorAppointmentDetailRow({ status: 'completed', outcomeSource: 'SYSTEM' }) });
		// Nothing is read again before the window ends; at its end (+1″) the appointment is.
		await vi.advanceTimersByTimeAsync(4 * 60_000);
		expect(gets()).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(60_000 + 1_500);
		await waitFor(() => expect(screen.queryByTestId('doctor-appointment-correction')).toBeNull());
		expect(gets().length).toBeGreaterThan(0);
		expect(page().textContent).not.toMatch(/Διόρθωση/u);
	});

	it('🔴 D-W51-62: back from screen 71 the green card «Διορθώθηκε σε «Δεν ήρθε».» from the screen’s memory, over the correction still open', async () => {
		serve({
			read: doctorAppointmentDetailRow({
				status: 'no_show',
				startTime: '2026-11-13T16:00:00.000Z',
				outcomeSource: 'DOCTOR',
				outcomeCorrectableUntil: '2026-11-15T16:20:00.000Z',
				actions: {
					canCancel: false,
					correction: { to: 'COMPLETED', until: '2026-11-15T16:20:00.000Z' } as never
				}
			})
		});
		const memory = new DoctorAppointmentMemory();
		memory.remember(ID, { kind: 'corrected', to: 'NO_SHOW' });
		open(ID, memory);
		await ready();
		const card = screen.getByTestId('doctor-appointment-done');
		expect(card).toHaveAttribute('data-tone', 'done');
		expect(card).toHaveAttribute('role', 'status');
		expect(card).toHaveTextContent('Διορθώθηκε σε «Δεν ήρθε».');
		expect(card).toHaveTextContent('Ο ασθενής ενημερώθηκε· η πρόσκληση για κριτική ακυρώθηκε.');
		expect(screen.queryByTestId('doctor-appointment-correction')).toBeNull();
	});
});
