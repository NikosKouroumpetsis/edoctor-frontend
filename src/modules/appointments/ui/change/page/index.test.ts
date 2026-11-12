import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick, type Component } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import { resetServerClock } from '$shared/lib/server-clock';
import type { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import type {
	AppointmentActionsFacts,
	AppointmentDetailFacts
} from '$modules/appointments/api/appointment';
import {
	appointmentActionsSample,
	appointmentDetailSample
} from '$modules/appointments/api/appointment/appointment.sample';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import type { AppointmentDoctorFacts, AppointmentsLinks } from '$modules/appointments/types';
import { AppointmentsMemory } from '$modules/appointments/ui/memory';
import Harness from './change.harness.svelte';

/*
 * Screen 52 «Αλλαγή ραντεβού» (record §8, U-136; P-W4 §4.3): the hour, the person, a new relative, the note — each a
 * screen of its own (U-102), sent by «Αποθήκευση» (U-136.3), back to the appointment with the page's memory (D-W4-33).
 * The server's answers are stubbed; made-up people and offices.
 */

const ID = appointmentDetailSample.id;
/** The server's «now», Tuesday 10 November 21:00 in Athens: the hours below stand outside or inside the 24 hours by it. */
const NOW = new Date('2026-11-10T19:00:00.000Z');
const NEW_HOUR = '2026-11-13T08:00:00.000Z';
/** Thirteen hours from «now»: its cancellation deadline (24 hours before) has already passed. */
const NEAR_HOUR = '2026-11-11T08:00:00.000Z';
const OTHER_HOUR = '2026-11-13T09:00:00.000Z';

const maria: AppointmentDoctorFacts = {
	doctorSlug: 'dr-maria',
	name: 'Μαρία Τριανταφύλλου',
	professional: { name: 'Δερματολόγος' },
	images: [{ url: '/maria.jpg', thumbUrl: '/maria-thumb.jpg', alt: '' }],
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

/** The server's answer of a write: the appointment (`AppointmentDetailResponseView`) at its new hour. */
const view = (extra: Record<string, unknown> = {}) => ({
	id: ID,
	doctorId: 'doc-maria',
	officeId: 'off-ermou',
	patientId: 'pat-1',
	officeTimeZone: 'Europe/Athens',
	status: 'booked',
	bookedForType: 'SELF',
	relativeId: null,
	startTime: NEW_HOUR,
	endTime: '2026-11-13T08:30:00.000Z',
	confirmationModeSnapshot: 'AUTO',
	confirmedAt: '2026-11-01T09:00:00.000Z',
	patientSnapshot: { id: 'pat-1', firstName: 'Ελένη', lastName: 'Παππά', email: 'p@example.test' },
	serviceLines: [],
	actions: { canCancel: true, canReschedule: true, cancellationCutoffHours: 24 },
	...extra
});

type Call = { url: string; method: string; body?: Record<string, unknown> };
let calls: Call[];
let answers: Record<string, () => Response>;
let readiness: Record<string, unknown>;
let patient: Record<string, unknown>;

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
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	resetServerClock();
	calls = [];
	answers = {};
	readiness = { firstVisitKnown: true, blockers: [] };
	patient = {
		id: 'pat-1',
		firstName: 'Ελένη',
		lastName: 'Παππά',
		relatives: [
			{
				id: 'rel-1',
				firstName: 'Γιώργος',
				lastName: 'Παππάς',
				relationship: 'CHILD',
				gender: 'MALE'
			},
			{
				id: 'rel-2',
				firstName: 'Άννα',
				lastName: 'Παππά',
				relationship: 'PARENT',
				gender: 'FEMALE'
			}
		]
	};
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
			const path = new URL(url, 'https://api.test').pathname.replace(/^\/api\/v\d+/u, '');
			const answer = answers[`${method} ${path}`];
			if (answer) return answer();
			if (path === '/patient/me') return json(patient);
			if (path === '/appointment/booking-readiness') return json(readiness);
			if (method === 'PATCH') return json(view());
			return json({});
		})
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	page.state = {};
});

type Step = 'time' | 'for-whom' | 'relative' | 'note';

function draw(
	step: Step,
	{
		value = appointment(),
		depth = 1,
		hours = [NEW_HOUR, OTHER_HOUR],
		memory = new AppointmentsMemory(),
		toasts = new ToastState()
	}: {
		value?: AppointmentDetailFacts;
		depth?: number;
		hours?: string[];
		memory?: AppointmentsMemory;
		toasts?: ToastState;
	} = {}
) {
	page.state = depth ? { appointment: { depth } } : {};
	const go = vi.spyOn(history, 'go').mockImplementation(() => {});
	const onRepick = vi.fn();
	const onGone = vi.fn();
	const handle: {
		session?: Session;
		client?: QueryClient;
		reread?: (next: AppointmentDetailFacts) => void;
	} = {};
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				step,
				props: { locale: 'el', appointment: value, doctor: maria, links },
				hours,
				memory,
				toasts,
				toMobilePhone: (dialCode: string, typed: string) => {
					const digits = typed.replace(/\D/gu, '');
					return dialCode === '+30' && /^69\d{8}$/u.test(digits) ? `+30${digits}` : null;
				},
				onRepick,
				onGone,
				onReady: (ready: Required<typeof handle>) => Object.assign(handle, ready)
			}
		}
	});
	const reread = vi.spyOn(handle.client as QueryClient, 'invalidateQueries');
	/** The appointment as the page read it again (the screen's read, D-W4-37). */
	const redraw = async (next: AppointmentDetailFacts) => {
		handle.reread?.(next);
		await tick();
	};
	return { go, onRepick, onGone, memory, toasts, handle, reread, redraw };
}

/** The appointment asked of the server again (D-W4-37). */
const readAgain = { queryKey: appointmentsQueryKeys.detail(ID) };

const user = () => userEvent.setup({ delay: null });
const save = () => screen.getByTestId('booking-save');
const cancel = () => screen.getByTestId('booking-cancel');
const writes = () => calls.filter((call) => call.method !== 'GET');

describe('🔴 U-102 / U-136.2: a screen of its own, never a modal', () => {
	it('each of the four is a section of the page with «←», a title and «Άκυρο / Αποθήκευση» — no dialog, no sheet', () => {
		for (const step of ['time', 'for-whom', 'relative', 'note'] as const) {
			const { unmount } = render(QueryHarness, {
				props: {
					component: Harness as unknown as Component<never>,
					props: {
						step,
						props: { locale: 'el', appointment: appointment(), doctor: maria, links }
					}
				}
			});
			const frame = document.querySelector('[data-slot="booking-change-screen"]');
			expect(frame?.tagName).toBe('SECTION');
			expect(frame).toHaveAttribute('data-placement', 'pane');
			expect(screen.queryByRole('dialog')).toBeNull();
			expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
			expect(screen.getByTestId('booking-back')).toHaveAttribute('href');
			unmount();
		}
	});
});

describe('screen 52 · «Αλλαγή ώρας» (U-136.3, U-136.4)', () => {
	it('🔴 D-W4-68: the box’s photo (52, 53, 54) that does not load gives way to the shared silhouette — never «Φωτογραφία γιατρού» as words', async () => {
		draw('time');
		const box = screen.getByTestId('appointment-context');
		const photo = box.querySelector('[data-slot="avatar"]') as HTMLElement;
		expect(photo).toHaveClass('size-row', 'rounded-sm');
		const image = photo.querySelector('img') as HTMLImageElement;
		const alt = image.getAttribute('alt') ?? '';
		await fireEvent.error(image);
		expect(box.querySelector('img')).toBeNull();
		expect(photo.querySelector('[data-slot="media-placeholder"]')).toBeInTheDocument();
		if (alt) expect(box).not.toHaveTextContent(alt);
	});

	it('the box «Το ραντεβού σας», the help, the hours; «Αποθήκευση» locked until an hour is chosen, then «Ήταν / Νέα ώρα»', async () => {
		draw('time');
		expect(screen.getByRole('heading', { level: 2, name: 'Αλλαγή ώρας' })).toBeInTheDocument();
		const box = screen.getByTestId('appointment-context');
		expect(box).toHaveTextContent('Το ραντεβού σας');
		expect(box).toHaveTextContent('Πέμπτη 12 Νοεμβρίου · 12:30');
		expect(box).toHaveTextContent('Dr. Μαρία Τριανταφύλλου · Απλή επίσκεψη · 30 λεπτά');
		expect(box).toHaveTextContent('Ερμού 101, Αθήνα');
		expect(
			screen.getByText('Η ώρα αλλάζει στο ίδιο ιατρείο και για την ίδια υπηρεσία.')
		).toBeInTheDocument();
		expect(save()).toBeDisabled();
		expect(screen.queryByTestId('appointment-time-diff')).toBeNull();
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		const diff = screen.getByTestId('appointment-time-diff');
		expect(diff).toHaveTextContent('Ήταν');
		expect(within(diff).getByText('Πέμπτη 12 Νοεμβρίου · 12:30').tagName).toBe('S');
		expect(diff).toHaveTextContent('Νέα ώρα');
		expect(diff).toHaveTextContent('Παρασκευή 13 Νοεμβρίου · 10:00');
		expect(diff).toHaveTextContent(
			'Το ραντεβού μένει επιβεβαιωμένο. Ο γιατρός ενημερώνεται για τη νέα ώρα.'
		);
		expect(save()).toBeEnabled();
		// Two moves left (P-B4 §13.3.3): not the last one.
		expect(screen.queryByTestId('appointment-time-last')).toBeNull();
	});

	it('«Αποθήκευση» sends the hour ALONE; back to the appointment with «Η ώρα άλλαξε.» remembered (D-W4-33), never in the address', async () => {
		const { go, memory } = draw('time');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(writes()).toHaveLength(1);
		expect(writes()[0]).toMatchObject({ method: 'PATCH', body: { startTime: NEW_HOUR } });
		expect(writes()[0]?.url).toContain(`/appointment/appointments/${ID}`);
		expect(Object.keys(writes()[0]?.body ?? {})).toEqual(['startTime']);
		expect(memory.doneOf(ID)).toEqual({ kind: 'time', was: appointmentDetailSample.startTime });
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('a request stays pending; the last move is said (P-B4 §13.3.3); opened from «Θέλετε απλώς άλλη ώρα;» the save goes back two', async () => {
		const { go } = draw('time', {
			value: appointment({ status: 'pending', confirmedAt: null }, { reschedulesLeft: 1 }),
			depth: 2
		});
		expect(screen.getByTestId('appointment-context')).toHaveTextContent('Το αίτημά σας');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		expect(screen.getByTestId('appointment-time-diff')).toHaveTextContent(
			'Το αίτημα μένει σε αναμονή μέχρι να απαντήσει ο γιατρός.'
		);
		expect(screen.getByTestId('appointment-time-last')).toHaveTextContent(
			'Είναι η τελευταία αλλαγή ώρας που μπορείτε να κάνετε σε αυτό το ραντεβού.'
		);
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-2));
	});

	it('🔴 U-136.4: inside the cutoff the «yes» is asked IN the screen — «Άλλη ώρα» writes nothing, «Αλλαγή ώρας» sends the acknowledgement', async () => {
		let first = true;
		answers[`PATCH /appointment/appointments/${ID}`] = () => {
			if (first) {
				first = false;
				return refusal(
					422,
					'Acknowledge the cancellation cutoff: RESCHEDULE_INSIDE_CANCELLATION_CUTOFF'
				);
			}
			return json(view());
		};
		const { go, onRepick } = draw('time');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		const ask = await screen.findByTestId('appointment-time-ask');
		expect(ask).toHaveTextContent(
			'Για τις Παρ 13 Νοε · 10:00 η προθεσμία ακύρωσης έχει ήδη περάσει: αν αλλάξετε ώρα, θα μπορείτε να την ακυρώσετε μόνο τηλεφωνικά με το ιατρείο.'
		);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(cancel()).toHaveTextContent('Άλλη ώρα');
		expect(save()).toHaveTextContent('Αλλαγή ώρας');
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(writes()[1]?.body).toEqual({
			startTime: NEW_HOUR,
			acknowledgeInsideCancellationCutoff: true
		});
		expect(onRepick).not.toHaveBeenCalled();
	});

	it('🔴 D-W4-67 (live check w4-live-web Δ6, the prototype’s `c=ask`): an hour whose deadline has already passed asks its «yes» the moment it is chosen — nothing written yet; «Αλλαγή ώρας» then sends the acknowledgement in ONE write', async () => {
		const { go } = draw('time', { hours: [NEAR_HOUR, NEW_HOUR] });
		expect(screen.queryByTestId('appointment-time-ask')).toBeNull();
		await user().click(screen.getByTestId(`hour-${NEAR_HOUR}`));
		expect(screen.getByTestId('appointment-time-ask')).toHaveTextContent(
			'Για τις Τετ 11 Νοε · 10:00 η προθεσμία ακύρωσης έχει ήδη περάσει: αν αλλάξετε ώρα, θα μπορείτε να την ακυρώσετε μόνο τηλεφωνικά με το ιατρείο.'
		);
		expect(cancel()).toHaveTextContent('Άλλη ώρα');
		expect(save()).toHaveTextContent('Αλλαγή ώρας');
		expect(writes()).toEqual([]);
		// Another hour, outside the deadline: the question goes with the hour it was about.
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		expect(screen.queryByTestId('appointment-time-ask')).toBeNull();
		expect(save()).toHaveTextContent('Αποθήκευση');
		await user().click(screen.getByTestId(`hour-${NEAR_HOUR}`));
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(writes()).toHaveLength(1);
		expect(writes()[0].body).toEqual({
			startTime: NEAR_HOUR,
			acknowledgeInsideCancellationCutoff: true
		});
	});

	it('D-W4-67: «Άλλη ώρα» on a question the page foresaw takes the hour away and writes nothing', async () => {
		const { go, onRepick } = draw('time', { hours: [NEAR_HOUR, NEW_HOUR] });
		await user().click(screen.getByTestId(`hour-${NEAR_HOUR}`));
		await user().click(cancel());
		expect(onRepick).toHaveBeenCalledOnce();
		expect(writes()).toEqual([]);
		expect(go).not.toHaveBeenCalled();
	});

	it('D-W4-67 (negative): the server stays the judge — a request is never asked (U-91.1 A1), nor an appointment whose hours of the deadline the page does not know, nor an hour exactly on its deadline', async () => {
		const pending = draw('time', {
			value: appointment({ status: 'pending' }),
			hours: [NEAR_HOUR]
		});
		await user().click(screen.getByTestId(`hour-${NEAR_HOUR}`));
		expect(screen.queryByTestId('appointment-time-ask')).toBeNull();
		expect(save()).toHaveTextContent('Αποθήκευση');
		expect(pending.go).not.toHaveBeenCalled();
		cleanup();

		draw('time', {
			value: appointment({}, { cancellationCutoffHours: null }),
			hours: [NEAR_HOUR]
		});
		await user().click(screen.getByTestId(`hour-${NEAR_HOUR}`));
		expect(screen.queryByTestId('appointment-time-ask')).toBeNull();
		cleanup();

		// Exactly 24 hours from «now»: on the deadline is on time (the server's `isLateCancellation`, D-19).
		const onDeadline = '2026-11-11T19:00:00.000Z';
		draw('time', { hours: [onDeadline] });
		await user().click(screen.getByTestId(`hour-${onDeadline}`));
		expect(screen.queryByTestId('appointment-time-ask')).toBeNull();
		expect(writes()).toEqual([]);
	});

	it('U-136.4 (negative): «Άλλη ώρα» takes the hour away and writes nothing; the next hour asks afresh', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () =>
			refusal(422, 'Acknowledge the cancellation cutoff: RESCHEDULE_INSIDE_CANCELLATION_CUTOFF');
		const { go, onRepick } = draw('time');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		await screen.findByTestId('appointment-time-ask');
		await user().click(cancel());
		expect(onRepick).toHaveBeenCalledOnce();
		expect(screen.queryByTestId('appointment-time-ask')).toBeNull();
		expect(save()).toBeDisabled();
		expect(writes()).toHaveLength(1);
		expect(go).not.toHaveBeenCalled();
		await user().click(screen.getByTestId(`hour-${OTHER_HOUR}`));
		expect(save()).toHaveTextContent('Αποθήκευση');
	});

	it('a taken hour (409): «Αυτή η ώρα δεν είναι πλέον διαθέσιμη.», the hour leaves the grid, nothing goes back', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () =>
			refusal(409, 'APPOINTMENT_SLOT_NOT_AVAILABLE');
		const { go, onGone } = draw('time');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		expect(await screen.findByTestId('appointment-time-gone')).toHaveTextContent(
			'Αυτή η ώρα δεν είναι πλέον διαθέσιμη.'
		);
		expect(onGone).toHaveBeenCalledWith(NEW_HOUR);
		expect(save()).toBeDisabled();
		expect(go).not.toHaveBeenCalled();
		await user().click(screen.getByTestId(`hour-${OTHER_HOUR}`));
		expect(screen.queryByTestId('appointment-time-gone')).toBeNull();
	});

	it('🔴 D-W4-35: a change nobody answered says «Η αλλαγή δεν αποθηκεύτηκε…», never the booking’s; the moves spent say the booking’s words', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () => refusal(500, 'boom');
		draw('time');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		expect(await screen.findByTestId('appointment-change-failure')).toHaveTextContent(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(document.body).not.toHaveTextContent('Η κράτηση δεν ολοκληρώθηκε');
		answers[`PATCH /appointment/appointments/${ID}`] = () =>
			refusal(422, 'No more moves: PATIENT_RESCHEDULE_LIMIT_REACHED');
		await user().click(save());
		await waitFor(() =>
			expect(screen.getByTestId('appointment-change-failure')).toHaveTextContent(
				'Έχετε αλλάξει την ώρα όσες φορές επιτρέπεται.'
			)
		);
	});

	it('🔴 U-84: a `401` opens the sign-in over the screen; the hour stays chosen and nothing goes back', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () => refusal(401, 'Unauthorized');
		const { go, handle, reread } = draw('time');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		await waitFor(() => expect(handle.session?.flowOpen).toBe(true));
		expect(screen.getByTestId('appointment-time-diff')).toBeInTheDocument();
		expect(go).not.toHaveBeenCalled();
		// D-W4-37 (negative): the session decided nothing about the appointment.
		expect(reread).not.toHaveBeenCalledWith(readAgain);
	});

	it('🔴 D-W4-37.1 (review w4-w5 R1 MAJOR-1, reverses the silent way back): a 403 with no code — the patient STAYS with the hour chosen, reads «Η αλλαγή δεν αποθηκεύτηκε…», and the appointment is read again', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () => refusal(403, 'Forbidden');
		const { go, reread } = draw('time');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		expect(await screen.findByTestId('appointment-change-failure')).toHaveTextContent(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(screen.getByTestId('appointment-time-diff')).toBeInTheDocument();
		expect(save()).toBeEnabled();
		expect(reread).toHaveBeenCalledWith(readAgain);
		expect(go).not.toHaveBeenCalled();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 review w4-a6 R1 MINOR-1 (parity, D-W4-37.1): a `422` naming a code the page does not know, or a `400` naming no field, is a refusal with NO known reason — «Η αλλαγή δεν αποθηκεύτηκε…» (never the booking’s «Η κράτηση δεν ολοκληρώθηκε…»), the hour stays, the appointment is read again', async () => {
		for (const [status, message] of [
			[422, 'Validation Error: SOME_NEW_CODE'],
			[400, 'Invalid input']
		] as const) {
			answers[`PATCH /appointment/appointments/${ID}`] = () => refusal(status, message);
			const { go, reread } = draw('time');
			await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
			await user().click(save());
			const failure = await screen.findByTestId('appointment-change-failure');
			expect(failure, message).toHaveTextContent(
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
			);
			expect(failure).not.toHaveTextContent('Η κράτηση δεν ολοκληρώθηκε');
			expect(screen.getByTestId('appointment-time-diff')).toBeInTheDocument();
			expect(save()).toBeEnabled();
			expect(reread).toHaveBeenCalledWith(readAgain);
			expect(go).not.toHaveBeenCalled();
			go.mockRestore();
			cleanup();
		}
	});

	it('review w4-a6 R1 MINOR-1 (parity, D-W4-37.2): after such a refusal the appointment read again may no longer move — only then the screen gives way to the 51', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () =>
			refusal(422, 'Validation Error: SOME_NEW_CODE');
		const { redraw } = draw('time', { depth: 0 });
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		await screen.findByTestId('appointment-change-failure');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		await redraw(appointment({}, { canReschedule: false, rescheduleDenial: 'LIMIT_REACHED' }));
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${ID}`, { replaceState: true })
		);
	});

	it('🔴 D-W4-37.3 (review w4-w5 R1 MINOR-1): a refusal with its code says its own words AND reads the appointment again, so the 51 never offers it', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () =>
			refusal(422, 'No more moves: PATIENT_RESCHEDULE_LIMIT_REACHED');
		const { go, reread } = draw('time');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		expect(await screen.findByTestId('appointment-change-failure')).toHaveTextContent(
			'Έχετε αλλάξει την ώρα όσες φορές επιτρέπεται.'
		);
		expect(reread).toHaveBeenCalledWith(readAgain);
		expect(go).not.toHaveBeenCalled();
	});

	it('D-W4-37.2: read again after the refusal, the hour may no longer move — only then the screen gives way to the 51, which tells why', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () => refusal(403, 'Forbidden');
		const { go, redraw } = draw('time');
		await user().click(screen.getByTestId(`hour-${NEW_HOUR}`));
		await user().click(save());
		await screen.findByTestId('appointment-change-failure');
		expect(go).not.toHaveBeenCalled();
		await redraw(appointment({}, { canReschedule: false }));
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
	});

	it('P-W4 §4.3 (negative): opened by its address once the hour may not move, it gives way to the appointment in place', async () => {
		draw('time', { value: appointment({}, { canReschedule: false }), depth: 0 });
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${ID}`, { replaceState: true })
		);
		expect(writes()).toHaveLength(0);
	});
});

describe('screen 52 · «Για ποιον είναι το ραντεβού;» (record §8.2, U-139.5, D-70)', () => {
	it('the booking’s list with the word under each name; the current one chosen; «Αποθήκευση» only for another person', async () => {
		draw('for-whom');
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		const rows = within(group).getAllByRole('radio');
		expect(rows.map((row) => row.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'Για μένα Ελένη Παππά',
			'Γιώργος Παππάς Γιος',
			'Άννα Παππά Μητέρα'
		]);
		expect(rows[0]).toHaveAttribute('aria-checked', 'true');
		expect(save()).toBeDisabled();
	});

	it('another person the doctor never saw: «Είναι το πρώτο ραντεβού με Dr. …;» about that person, «Ναι» first; the answer travels', async () => {
		readiness = { firstVisitKnown: false, blockers: [] };
		const { go, memory } = draw('for-whom');
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		await user().click(within(group).getByRole('radio', { name: /Γιώργος Παππάς/u }));
		const question = await screen.findByRole('radiogroup', {
			name: 'Είναι το πρώτο ραντεβού με Dr. Μαρία Τριανταφύλλου;'
		});
		expect(screen.getByText('Η απάντηση αφορά: Γιώργος Παππάς.')).toBeInTheDocument();
		expect(within(question).getByRole('radio', { name: 'Ναι' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		await user().click(within(question).getByRole('radio', { name: 'Όχι' }));
		expect(
			calls.some(
				(call) => call.url.includes('booking-readiness') && call.url.includes('relativeId=rel-1')
			)
		).toBe(true);
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(writes()[0]?.body).toEqual({
			bookedForType: 'RELATIVE',
			relativeId: 'rel-1',
			firstVisit: false
		});
		expect(memory.doneOf(ID)).toEqual({ kind: 'for-whom' });
	});

	it('(negative) a person the doctor already saw: no question, no answer sent', async () => {
		const { go } = draw('for-whom');
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		await user().click(within(group).getByRole('radio', { name: /Άννα Παππά/u }));
		await waitFor(() => expect(save()).toBeEnabled());
		expect(screen.queryByText(/Είναι το πρώτο ραντεβού/u)).toBeNull();
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalled());
		expect(writes()[0]?.body).toEqual({ bookedForType: 'RELATIVE', relativeId: 'rel-2' });
	});

	it('🔴 D-70: a REQUEST handed to a person with a request of their own is refused here; (negative) a kept visit never is', async () => {
		readiness = { firstVisitKnown: false, blockers: ['PATIENT_PENDING_LIMIT_REACHED'] };
		draw('for-whom', { value: appointment({ status: 'pending', confirmedAt: null }) });
		let group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		await user().click(within(group).getByRole('radio', { name: /Γιώργος Παππάς/u }));
		expect(await screen.findByTestId('appointment-for-whom-limit')).toHaveTextContent(
			'Υπάρχει ήδη ένα αίτημα σε αναμονή για το ίδιο πρόσωπο σε αυτόν τον επαγγελματία.'
		);
		expect(save()).toBeDisabled();
		expect(screen.queryByText(/Είναι το πρώτο ραντεβού/u)).toBeNull();
		document.body.innerHTML = '';
		draw('for-whom');
		group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		await user().click(within(group).getByRole('radio', { name: /Γιώργος Παππάς/u }));
		await waitFor(() => expect(save()).toBeEnabled());
		expect(screen.queryByTestId('appointment-for-whom-limit')).toBeNull();
	});

	it('record §11.4 / U-139.4: a relative deleted since still reads as the person it is for, from the snapshot, with its word', async () => {
		draw('for-whom', {
			value: appointment({
				relativeId: 'rel-gone',
				snapshot: {
					...appointmentDetailSample.snapshot,
					visitor: { kind: 'relative', name: 'Μαρίνα Παππά' }
				},
				relative: {
					relativeId: 'rel-gone',
					firstName: 'Μαρίνα',
					lastName: 'Παππά',
					relationship: 'CHILD',
					gender: 'FEMALE'
				}
			})
		});
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		const gone = within(group).getByRole('radio', { name: /Μαρίνα Παππά/u });
		expect(gone).toHaveAttribute('aria-checked', 'true');
		expect(gone).toHaveTextContent('Κόρη');
	});

	it('«Προσθήκη συγγενή» is the relative form one step further; the relative just added comes back chosen', async () => {
		const memory = new AppointmentsMemory();
		draw('for-whom', { memory });
		await user().click(await screen.findByTestId('appointment-for-whom-add-relative'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${ID}/relative`, {
			state: { appointment: { depth: 2 } }
		});
		document.body.innerHTML = '';
		memory.choose(ID, 'rel-2');
		draw('for-whom', { memory });
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		expect(within(group).getByRole('radio', { name: /Άννα Παππά/u })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		await user().click(cancel());
		expect(memory.chosenFor(ID)).toBeNull();
	});

	it('review w4-w5 R1 MINOR-2 (negative, a second opening): the relative just added is chosen until «Αποθήκευση» — saved, it is let go and the next «Για ποιον…» starts from whom the visit is for', async () => {
		const memory = new AppointmentsMemory();
		memory.choose(ID, 'rel-2');
		const { go } = draw('for-whom', { memory });
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		expect(within(group).getByRole('radio', { name: /Άννα Παππά/u })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		await waitFor(() => expect(save()).toBeEnabled());
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(memory.chosenFor(ID)).toBeNull();
		document.body.innerHTML = '';
		draw('for-whom', { memory });
		const again = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		expect(within(again).getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true');
		expect(within(again).getByRole('radio', { name: /Άννα Παππά/u })).toHaveAttribute(
			'aria-checked',
			'false'
		);
		expect(save()).toBeDisabled();
	});

	it('🔴 D-W4-37.4: a relative deleted meanwhile (403 with no code) is a refusal of the person — the patient stays on «Για ποιον…», reads «Η αλλαγή δεν αποθηκεύτηκε…», the relatives and the appointment are read again', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () =>
			refusal(403, 'relative does not belong to patient.');
		const { go, reread } = draw('for-whom');
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		await user().click(within(group).getByRole('radio', { name: /Άννα Παππά/u }));
		await waitFor(() => expect(save()).toBeEnabled());
		const reads = () => calls.filter((call) => call.url.includes('/patient/me')).length;
		const before = reads();
		patient = { ...patient, relatives: (patient.relatives as unknown[]).slice(0, 1) };
		await user().click(save());
		expect(await screen.findByTestId('appointment-change-failure')).toHaveTextContent(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		await waitFor(() => expect(reads()).toBeGreaterThan(before));
		await waitFor(() => expect(screen.queryByRole('radio', { name: /Άννα Παππά/u })).toBeNull());
		expect(screen.getByTestId('appointment-change-for-whom')).toBeInTheDocument();
		expect(reread).toHaveBeenCalledWith(readAgain);
		expect(go).not.toHaveBeenCalled();
	});

	it('🔴 review w4-a6 R1 (parity, D-W4-37.4): the relative chosen is gone from the list read again — the choice goes back to whom the appointment is for, never to nobody; «Αποθήκευση» sleeps with nothing to change', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () =>
			refusal(403, 'relative does not belong to patient.');
		draw('for-whom');
		const group = await screen.findByRole('radiogroup', { name: 'Για ποιον είναι το ραντεβού;' });
		const mine = within(group).getByRole('radio', { name: /Για μένα/u });
		expect(mine).toBeChecked();
		await user().click(within(group).getByRole('radio', { name: /Άννα Παππά/u }));
		expect(mine).not.toBeChecked();
		await waitFor(() => expect(save()).toBeEnabled());
		patient = { ...patient, relatives: (patient.relatives as unknown[]).slice(0, 1) };
		await user().click(save());
		await waitFor(() => expect(screen.queryByRole('radio', { name: /Άννα Παππά/u })).toBeNull());
		await waitFor(() =>
			expect(within(group).getByRole('radio', { name: /Για μένα/u })).toBeChecked()
		);
		expect(
			within(group)
				.getAllByRole('radio')
				.filter(
					(radio) =>
						(radio as HTMLInputElement).checked || radio.getAttribute('aria-checked') === 'true'
				)
		).toHaveLength(1);
		expect(save()).toBeDisabled();
		expect(screen.getByTestId('appointment-change-failure')).toHaveTextContent(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
	});
});

describe('screen 52 · «Προσθήκη συγγενή» (record §8.2, P-W4 Σ-27)', () => {
	it('the ONE relative form; saved ⇒ back one step to «Για ποιον…» with the new one chosen, «Ο … προστέθηκε και επιλέχθηκε.» (U-139.5)', async () => {
		answers['POST /patient/pat-1/relatives'] = () =>
			json(
				{
					id: 'rel-new',
					patientId: 'pat-1',
					firstName: 'Νίκος',
					lastName: 'Παππάς',
					relationship: 'SIBLING',
					gender: 'MALE'
				},
				201
			);
		const toasts = new ToastState();
		const { go, memory } = draw('relative', { depth: 2, toasts });
		expect(screen.getByRole('heading', { level: 2, name: 'Νέος συγγενής' })).toBeInTheDocument();
		await waitFor(() => expect(calls.some((call) => call.url.includes('/patient/me'))).toBe(true));
		await user().type(screen.getByTestId('appointment-relative-first-name'), 'Νίκος');
		await user().type(screen.getByTestId('appointment-relative-last-name'), 'Παππάς');
		await user().click(screen.getByTestId('appointment-relative-relationship'));
		await user().click(await screen.findByRole('option', { name: 'Αδελφός/ή' }));
		await user().click(screen.getByTestId('appointment-relative-gender'));
		await user().click(await screen.findByRole('option', { name: 'Άνδρας' }));
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(memory.chosenFor(ID)).toBe('rel-new');
		expect(toasts.current?.message).toBe('Ο Νίκος Παππάς προστέθηκε και επιλέχθηκε.');
	});

	it('«Άκυρο» keeps nobody and goes back to «Για ποιον…»; opened alone, it takes its place', async () => {
		const { go, memory } = draw('relative', { depth: 0 });
		await user().click(cancel());
		expect(go).not.toHaveBeenCalled();
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${ID}/for-whom`, {
			replaceState: true
		});
		expect(memory.chosenFor(ID)).toBeNull();
		expect(writes()).toHaveLength(0);
	});
});

describe('screen 52 · «Σημείωση για τον γιατρό» (record §8.2)', () => {
	it('the note as it is, its «/500» and the help; saved ⇒ the PATCH of the note alone and «Η σημείωση αποθηκεύτηκε.»', async () => {
		const { go, memory } = draw('note');
		const field = screen.getByTestId('appointment-note-field');
		expect(field).toHaveValue('Έχω μαζί μου τις εξετάσεις του Σεπτεμβρίου.');
		expect(field).toHaveAccessibleName('Σημείωση για τον γιατρό');
		expect(screen.getByText('43/500')).toBeInTheDocument();
		expect(screen.getByText('Ο γιατρός τη βλέπει όταν ανοίγει το ραντεβού.')).toBeInTheDocument();
		await user().clear(field);
		await user().type(field, ' Και τη συνταγή. ');
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(writes()[0]?.body).toEqual({ patientNote: 'Και τη συνταγή.' });
		expect(memory.doneOf(ID)).toEqual({ kind: 'note', removed: false });
	});

	it('🔴 D-W4-63 · D-W4-33: what was saved is said from the page’s memory — the address the screen leaves by is the appointment’s alone: no `done`, no word a person wrote, nothing after `?`', async () => {
		const { memory } = draw('note', { depth: 0 });
		const field = screen.getByTestId('appointment-note-field');
		await user().clear(field);
		await user().type(field, 'Αλλεργία στην πενικιλίνη');
		await user().click(save());
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalled());
		expect(memory.doneOf(ID)).toEqual({ kind: 'note', removed: false });
		for (const [href] of vi.mocked(goto).mock.calls) {
			expect(String(href)).toBe(`/appointments/${ID}`);
			expect(decodeURIComponent(String(href))).not.toMatch(/Αλλεργία|πενικιλίνη|done|name/u);
		}
		expect(page.url.search).toBe('');
	});

	it('an empty note removes it (`null`, «Η σημείωση αφαιρέθηκε.»); 🔴 U-65.6 / D-W4-36.8: a paste past 500 is cut, markup stays text', async () => {
		const { go, memory } = draw('note');
		const field = screen.getByTestId('appointment-note-field');
		await user().clear(field);
		await user().click(save());
		await waitFor(() => expect(go).toHaveBeenCalled());
		expect(writes()[0]?.body).toEqual({ patientNote: null });
		expect(memory.doneOf(ID)).toEqual({ kind: 'note', removed: true });
		document.body.innerHTML = '';
		draw('note', {
			value: appointment({ patientNote: `<img src=x onerror=alert(1)>${'α'.repeat(600)}` })
		});
		expect(screen.getByText('500/500')).toBeInTheDocument();
		expect(document.querySelector('img[src="x"]')).toBeNull();
	});

	it('🔴 D-W4-37.1 (review w4-w5 R1 MAJOR-1 (β)): a `409` «changed concurrently» keeps what was written — «Η αλλαγή δεν αποθηκεύτηκε…» under it, the appointment read again, no way back', async () => {
		answers[`PATCH /appointment/appointments/${ID}`] = () =>
			refusal(409, 'Appointment was changed concurrently. Reload and try again.');
		const { go, reread } = draw('note', { value: appointment({ status: 'pending' }) });
		const field = screen.getByTestId('appointment-note-field');
		await user().clear(field);
		await user().type(field, 'Τετρακόσιοι χαρακτήρες που δεν πρέπει να χαθούν.');
		await user().click(save());
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(field).toHaveValue('Τετρακόσιοι χαρακτήρες που δεν πρέπει να χαθούν.');
		expect(reread).toHaveBeenCalledWith(readAgain);
		expect(go).not.toHaveBeenCalled();
	});
});
