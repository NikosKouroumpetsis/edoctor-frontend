import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick, type Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session } from '$shared/state/session';
import type {
	AppointmentActionsFacts,
	AppointmentDetailFacts
} from '$modules/appointments/api/appointment';
import {
	appointmentActionsSample,
	appointmentDetailSample
} from '$modules/appointments/api/appointment/appointment.sample';
import type { AppointmentDoctorFacts, AppointmentsLinks } from '$modules/appointments/types';
import { AppointmentsMemory } from '$modules/appointments/ui/memory';
import Harness from './cancel.harness.svelte';

/*
 * Screen 53 «Ακύρωση ραντεβού» (record §9, U-137; P-W4 §4.4): a screen of its own, the deadline in two lines, the offer
 * of another hour, the five reasons, the words to 500, ONE press; the deadline that passed meanwhile; and 🔴 U-137.5:
 * never «εκπρόθεσμα». The server's answers are stubbed; made-up people and offices.
 */

const ID = appointmentDetailSample.id;
const NBSP = ' ';

const maria: AppointmentDoctorFacts = {
	doctorSlug: 'dr-maria',
	name: 'Μαρία Τριανταφύλλου',
	professional: { name: 'Δερματολόγος' },
	images: [],
	rating: 4.9,
	reviewCount: 22
};

const links: AppointmentsLinks = {
	list: (tab) => (tab === 'history' ? '/appointments?tab=history' : '/appointments'),
	appointment: (id) => `/appointments/${id}`,
	step: (id, step) => `/appointments/${id}/${step}`,
	rating: (id) => `/ratings/${id}`,
	doctor: (slug) => `/doctors/${slug}`,
	search: '/',
	help: '/help'
};

const appointment = (
	extra: Partial<AppointmentDetailFacts> = {},
	actions: Partial<AppointmentActionsFacts> = {}
): AppointmentDetailFacts => ({
	...appointmentDetailSample,
	...extra,
	actions: { ...appointmentActionsSample, ...actions }
});

/** The server's canceled appointment, by the patient. */
const canceledView = {
	id: ID,
	doctorId: 'doc-maria',
	officeId: 'off-ermou',
	officeTimeZone: 'Europe/Athens',
	status: 'canceled',
	bookedForType: 'SELF',
	startTime: appointmentDetailSample.startTime,
	confirmedAt: '2026-11-01T09:00:00.000Z',
	canceledAt: '2026-11-10T19:05:00.000Z',
	canceledBy: 'PATIENT',
	canceledLate: true,
	cancelReasonCode: 'SCHEDULE_CONFLICT',
	patientSnapshot: { id: 'pat-1', firstName: 'Ελένη', lastName: 'Παππά', email: 'p@example.test' },
	serviceLines: [],
	actions: { canCancel: false, canReschedule: false, cancellationCutoffHours: 24 }
};

type Call = { url: string; method: string; body?: Record<string, unknown> };
let calls: Call[];
let answer: () => Response;

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
	answer = () => json(canceledView);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
			return method === 'POST' ? answer() : json({});
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	page.state = {};
});

function draw({
	value = appointment(),
	depth = 1,
	memory = new AppointmentsMemory()
}: { value?: AppointmentDetailFacts; depth?: number; memory?: AppointmentsMemory } = {}) {
	page.state = depth ? { appointment: { depth } } : {};
	const go = vi.spyOn(history, 'go').mockImplementation(() => {});
	const onReread = vi.fn();
	const handle: { session?: Session; reread?: (next: AppointmentDetailFacts) => void } = {};
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				props: { locale: 'el', appointment: value, doctor: maria, links, onReread },
				memory,
				onReady: (ready: Required<typeof handle>) => Object.assign(handle, ready)
			}
		}
	});
	/** The appointment as the page read it again (the screen's read, D-W4-37). */
	const redraw = async (next: AppointmentDetailFacts) => {
		handle.reread?.(next);
		await tick();
	};
	return { go, onReread, memory, handle, redraw };
}

const user = () => userEvent.setup({ delay: null });
const submit = () => screen.getByTestId('booking-save');
const keep = () => screen.getByTestId('booking-cancel');
const posts = () => calls.filter((call) => call.method === 'POST');
const reasons = () => screen.getByRole('radiogroup', { name: 'Επιλέξτε τον λόγο' });

describe('screen 53 · the form (record §9.2, U-137)', () => {
	it('🔴 U-137.2 / U-102: a screen of its own, never a sheet — the box, the deadline in two lines, the offer, the five reasons, what follows', () => {
		const { onReread } = draw();
		expect(document.querySelector('[data-slot="booking-change-screen"]')?.tagName).toBe('SECTION');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByRole('heading', { level: 2, name: 'Ακύρωση ραντεβού' })).toBeInTheDocument();
		expect(screen.getByTestId('appointment-context')).toHaveTextContent('Το ραντεβού σας');
		const terms = screen.getByTestId('appointment-cancel-terms');
		expect(terms).toHaveTextContent('Προθεσμία ακύρωσης');
		expect(terms).toHaveTextContent('Έως Τετάρτη 11 Νοεμβρίου, 12:30');
		expect(terms).toHaveTextContent('Ακυρώνετε από εδώ.');
		// 🔴 D-W4-36.3: the office's phone as the prototype writes it.
		expect(terms.textContent).toContain(`Μόνο τηλεφωνικά με το ιατρείο · 210${NBSP}321${NBSP}0101`);
		const offer = screen.getByTestId('appointment-cancel-offer');
		expect(offer).toHaveTextContent('Θέλετε απλώς άλλη ώρα;');
		expect(offer).toHaveTextContent('Αλλάξτε την ώρα και το ραντεβού μένει.');
		expect(
			within(reasons())
				.getAllByRole('radio')
				.map((radio) => radio.textContent?.trim())
		).toEqual([
			'Δεν με βολεύει η ώρα',
			'Αισθάνομαι καλύτερα',
			'Βρήκα άλλον γιατρό',
			'Προσωπικοί λόγοι',
			'Άλλος λόγος'
		]);
		expect(screen.getByText('Θα λάβετε email επιβεβαίωσης.')).toBeInTheDocument();
		expect(keep()).toHaveTextContent('Να μείνει');
		expect(submit()).toHaveTextContent('Ακύρωση ραντεβού');
		expect(submit()).toBeDisabled();
		// P-W4 §4.4: the opening reads the appointment again.
		expect(onReread).toHaveBeenCalledOnce();
	});

	it('U-137.1: ONE press cancels with the reason and the words; back on the canceled visit, its email said there (D-W4-11)', async () => {
		const { go, memory } = draw();
		await user().click(within(reasons()).getByRole('radio', { name: 'Βρήκα άλλον γιατρό' }));
		await user().type(screen.getByTestId('appointment-cancel-text'), '  Βρήκα ώρα πιο κοντά.  ');
		expect(submit()).toBeEnabled();
		await user().click(submit());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(posts()).toHaveLength(1);
		expect(posts()[0]?.url).toContain(`/appointment/appointments/${ID}/cancel`);
		expect(posts()[0]?.body).toEqual({
			reasonCode: 'FOUND_ANOTHER_DOCTOR',
			reasonText: 'Βρήκα ώρα πιο κοντά.'
		});
		expect(memory.justCanceled(ID)).toBe(true);
	});

	it('(negative) blank words are not sent; a paste past 500 is cut (D-W4-36.8); nothing is sent without a reason', async () => {
		draw();
		await user().click(submit());
		expect(posts()).toHaveLength(0);
		await user().click(within(reasons()).getByRole('radio', { name: 'Άλλος λόγος' }));
		const field = screen.getByTestId('appointment-cancel-text');
		await user().click(field);
		await user().paste('α'.repeat(600));
		expect(screen.getByText('500/500')).toBeInTheDocument();
		// Review w4-w5 R1 NIT-2: the prototype's short field (`.a-area.short` 96 = `textarea-xl`), not screen 30's 104.
		expect(field).toHaveClass('min-h-textarea-xl');
		expect(field).not.toHaveClass('min-h-checkout-note');
		await user().clear(field);
		await user().type(field, '   ');
		await user().click(submit());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0]?.body).toEqual({ reasonCode: 'OTHER' });
	});

	it('U-137.4: a request reads «Ακύρωση αιτήματος» and «Έως την ώρα του ραντεβού · Ακυρώνετε το αίτημα από εδώ.»; a relative’s visit says for whom', () => {
		draw({
			value: appointment({
				status: 'pending',
				confirmedAt: null,
				relativeId: 'rel-1',
				snapshot: {
					...appointmentDetailSample.snapshot,
					visitor: { kind: 'relative', name: 'Γιώργος Παππάς' }
				},
				relative: {
					relativeId: 'rel-1',
					firstName: 'Γιώργος',
					lastName: 'Παππάς',
					relationship: 'CHILD',
					gender: 'MALE'
				}
			})
		});
		expect(
			screen.getByRole('heading', { level: 2, name: 'Ακύρωση αιτήματος' })
		).toBeInTheDocument();
		expect(submit()).toHaveTextContent('Ακύρωση αιτήματος');
		const terms = screen.getByTestId('appointment-cancel-terms');
		expect(terms).toHaveTextContent('Έως την ώρα του ραντεβού');
		expect(terms).toHaveTextContent('Ακυρώνετε το αίτημα από εδώ.');
		expect(terms).not.toHaveTextContent('Μετά');
		const box = screen.getByTestId('appointment-context');
		expect(box).toHaveTextContent('Το αίτημά σας');
		expect(box).toHaveTextContent('Για: Γιώργος Παππάς (γιος)');
		expect(screen.getByTestId('appointment-cancel-offer')).toHaveTextContent(
			'Αλλάξτε την ώρα και το αίτημα μένει.'
		);
	});

	it('U-137.3: «Θέλετε απλώς άλλη ώρα;» only while the hour may move, and it opens «Αλλαγή ώρας» one step further', async () => {
		draw();
		await user().click(screen.getByTestId('appointment-cancel-offer-time'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${ID}/time`, {
			state: { appointment: { depth: 2 } }
		});
		document.body.innerHTML = '';
		draw({ value: appointment({}, { canReschedule: false, rescheduleDenial: 'LIMIT_REACHED' }) });
		expect(screen.queryByTestId('appointment-cancel-offer')).toBeNull();
	});

	it('«Να μείνει» writes nothing and goes back to the appointment', async () => {
		const { go } = draw();
		await user().click(keep());
		expect(go).toHaveBeenCalledWith(-1);
		expect(posts()).toHaveLength(0);
	});
});

describe('screen 53 · the hard moments (record §9.2)', () => {
	it('the deadline passed with the screen open (403 `CANCEL_AFTER_CANCELLATION_CUTOFF`): the deadline, the office to call, ONE way back', async () => {
		answer = () =>
			refusal(403, 'The cancellation deadline has passed: CANCEL_AFTER_CANCELLATION_CUTOFF');
		const { go, onReread } = draw();
		await user().click(within(reasons()).getByRole('radio', { name: 'Προσωπικοί λόγοι' }));
		await user().click(submit());
		const late = await screen.findByTestId('appointment-cancel-deadline');
		// 🔴 D-W4-37.3 (review w4-w5 R1 MINOR-1): read again, so the 51 offers the cancellation no more.
		expect(onReread).toHaveBeenCalledTimes(2);
		expect(late).toHaveTextContent('Η προθεσμία ακύρωσης έληξε· επικοινωνήστε με το ιατρείο.');
		expect(screen.getByTestId('appointment-cancel-call')).toHaveAttribute(
			'href',
			'tel:+302103210101'
		);
		expect(screen.getByTestId('appointment-cancel-call').textContent).toContain(
			`Κλήση ιατρείου · 210${NBSP}321${NBSP}0101`
		);
		expect(screen.queryByTestId('booking-cancel')).toBeNull();
		expect(submit()).toHaveTextContent('Πίσω στο ραντεβού');
		await user().click(submit());
		expect(go).toHaveBeenCalledWith(-1);
	});

	it('🔴 D-W4-37.1 (review w4-w5 R1 MAJOR-1) · review w4-w3 R1 MINOR-1 (negative): a 403 with no code is NO deadline and NO silent way back — the patient stays with the reason and the words, reads «Η ακύρωση δεν ολοκληρώθηκε…», the appointment is read again', async () => {
		answer = () => refusal(403, 'member cannot cancel in current status.');
		const { go, onReread } = draw();
		await user().click(within(reasons()).getByRole('radio', { name: 'Προσωπικοί λόγοι' }));
		await user().type(screen.getByTestId('appointment-cancel-text'), 'Μένουν.');
		await user().click(submit());
		expect(await screen.findByTestId('appointment-cancel-failure')).toHaveTextContent(
			'Η ακύρωση δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(within(reasons()).getByRole('radio', { name: 'Προσωπικοί λόγοι' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(screen.getByTestId('appointment-cancel-text')).toHaveValue('Μένουν.');
		expect(onReread).toHaveBeenCalledTimes(2);
		expect(go).not.toHaveBeenCalled();
		expect(screen.queryByTestId('appointment-cancel-deadline')).toBeNull();
		expect(document.body).not.toHaveTextContent('Η προθεσμία ακύρωσης έληξε');
	});

	it('🔴 D-W4-37.2: read again after the refusal — a visit closed meanwhile gives way to the 51; a deadline passed shows its view; (negative) still allowed, the form stays', async () => {
		answer = () => refusal(409, 'Appointment was changed concurrently. Reload and try again.');
		const first = draw();
		await user().click(within(reasons()).getByRole('radio', { name: 'Προσωπικοί λόγοι' }));
		await user().click(submit());
		await screen.findByTestId('appointment-cancel-failure');
		await first.redraw(appointment({ status: 'pending' }));
		expect(screen.getByTestId('appointment-cancel-failure')).toBeInTheDocument();
		expect(first.go).not.toHaveBeenCalled();
		await first.redraw(
			appointment({ status: 'canceled' }, { canCancel: false, canReschedule: false })
		);
		await waitFor(() => expect(first.go).toHaveBeenCalledWith(-1));
		document.body.innerHTML = '';
		first.go.mockClear();

		const second = draw();
		await user().click(within(reasons()).getByRole('radio', { name: 'Προσωπικοί λόγοι' }));
		await user().click(submit());
		await screen.findByTestId('appointment-cancel-failure');
		await second.redraw(
			appointment({}, { canCancel: false, canReschedule: false, isPastCancellationCutoff: true })
		);
		expect(await screen.findByTestId('appointment-cancel-deadline')).toBeInTheDocument();
		expect(second.go).not.toHaveBeenCalled();
	});

	it('opened past the deadline: the deadline’s view at once; (negative) a visit already closed gives way to the 51 in place', async () => {
		draw({
			value: appointment(
				{},
				{
					canCancel: false,
					canReschedule: false,
					isPastCancellationCutoff: true,
					cancellationDeadline: null
				}
			)
		});
		expect(screen.getByTestId('appointment-cancel-deadline')).toBeInTheDocument();
		document.body.innerHTML = '';
		draw({
			value: appointment({ status: 'rejected' }, { canCancel: false, canReschedule: false }),
			depth: 0
		});
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${ID}`, { replaceState: true })
		);
		expect(screen.queryByTestId('appointment-cancel-deadline')).toBeNull();
	});

	it('a failure keeps the reason and the words: «Η ακύρωση δεν ολοκληρώθηκε…»; too many writes «Πολλές προσπάθειες…»', async () => {
		answer = () => refusal(500, 'boom');
		const { go, onReread } = draw();
		await user().click(within(reasons()).getByRole('radio', { name: 'Αισθάνομαι καλύτερα' }));
		await user().type(screen.getByTestId('appointment-cancel-text'), 'Ευχαριστώ.');
		await user().click(submit());
		expect(await screen.findByTestId('appointment-cancel-failure')).toHaveTextContent(
			'Η ακύρωση δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(within(reasons()).getByRole('radio', { name: 'Αισθάνομαι καλύτερα' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(screen.getByTestId('appointment-cancel-text')).toHaveValue('Ευχαριστώ.');
		expect(go).not.toHaveBeenCalled();
		expect(onReread).toHaveBeenCalledTimes(2);
		answer = () => refusal(429, 'Too many');
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('appointment-cancel-failure')).toHaveTextContent(
				'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
			)
		);
	});

	it('🔴 U-84: a `401` opens the sign-in over the screen; the reason stays', async () => {
		answer = () => refusal(401, 'Unauthorized');
		const { go, handle, onReread } = draw();
		await user().click(within(reasons()).getByRole('radio', { name: 'Προσωπικοί λόγοι' }));
		await user().click(submit());
		await waitFor(() => expect(handle.session?.flowOpen).toBe(true));
		expect(within(reasons()).getByRole('radio', { name: 'Προσωπικοί λόγοι' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(go).not.toHaveBeenCalled();
		// D-W4-37 (negative): the session decided nothing; only the opening's read.
		expect(onReread).toHaveBeenCalledOnce();
	});

	it('🔴 U-137.5: no word of «εκπρόθεσμα» — not in the form, not in the deadline’s view, not after a late request', async () => {
		draw({ value: appointment({ status: 'pending', confirmedAt: null }) });
		expect(document.body.textContent).not.toMatch(/εκπρόθεσμ/iu);
		await user().click(within(reasons()).getByRole('radio', { name: 'Άλλος λόγος' }));
		await user().click(submit());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(document.body.textContent).not.toMatch(/εκπρόθεσμ/iu);
		document.body.innerHTML = '';
		draw({
			value: appointment({}, { canCancel: false, isPastCancellationCutoff: true })
		});
		expect(document.body.textContent).not.toMatch(/εκπρόθεσμ/iu);
	});
});
