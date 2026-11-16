import {
	createInfiniteQuery,
	createMutation,
	createQuery,
	useQueryClient
} from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import { refreshNotificationInboxSide } from '$shared/lib/notification-inbox';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import {
	doctorAppointmentQuery,
	doctorRescheduleSlotsQuery,
	moveDoctorAppointment,
	readDoctorWriteFailure,
	type DoctorAppointmentDetailFacts
} from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DOCTOR_TODAY_POLL_MS } from '$modules/doctor-dashboard/config';
import {
	buildDoctorMoveDays,
	doctorMoveEntry,
	doctorMoveSelectedDay
} from '$modules/doctor-dashboard/lib/move';
import { getDoctorAppointmentMemoryOptional } from '$modules/doctor-dashboard/ui/memory';
import type { DoctorMoveSlotsState, DoctorMoveState } from '../types';

/**
 * Wave 5.1 · screen 70 «Αλλαγή ώρας» (D-W51-41, D-W51-51): the appointment the address names, read as screen 68 reads it
 * (the same cache, read again at once: the server's `actions` are today's), the doctor's REAL free hours a week at a
 * time (U-189.1, only while the hour may move), the hour chosen and its ONE write (`PATCH …/{id}`). 🔴 D-W51-06: a `403`
 * and a `404` read «δεν βρέθηκε». After the write (D-W51-51):
 * - success ⇒ the answer IS the detail (a request is now confirmed, U-190.2), put in its cache as it came; the lists
 *   read again; the save remembered for the 68's green card (never in the address); back to 68 (`onDone`);
 * - `409` (the hour taken, the appointment changed meanwhile) and `422 RESCHEDULE_INTO_THE_PAST` ⇒ the hour leaves the
 *   grid, the hours and the appointment are read again, and the page says so; a step no longer allowed then gives way
 *   to «δεν γίνεται πια»;
 * - `403` / `404` ⇒ «δεν γίνεται πια» (the appointment read again: one gone says «δεν βρέθηκε»);
 * - a lost request, `5xx`, `422`, `429` ⇒ its words, the chosen hour STAYS; `401` ⇒ the sign-in over the screen (U-84).
 * 🔴 No second press: the button waits while one is on its way, and none goes once the server took it.
 */
export function useDoctorMove(options: {
	appointmentId: () => string;
	locale: () => SupportedLocale;
	/** Back to screen 68 once the server took it. */
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const memory = getDoctorAppointmentMemoryOptional();
	const query = createQuery(() => doctorAppointmentQuery(options.appointmentId()));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const read = $derived({
		data: query.data,
		error: query.error,
		isError: query.isError,
		isSuccess: query.isSuccess
	});
	const appointment = $derived(read.data ?? null);
	const missing = $derived(
		(read.error instanceof ApiError && [403, 404].includes(read.error.status)) ||
			(read.isSuccess && read.data === null)
	);

	let now = $state(readServerNow());
	// An hour that passes while the doctor looks leaves the grid (the minute's clock of the desk).
	$effect(() => {
		const tick = setInterval(() => (now = readServerNow()), DOCTOR_TODAY_POLL_MS);
		return () => clearInterval(tick);
	});

	let sent = $state(false);
	let refused = $state(false);
	let conflict = $state(false);
	let failure = $state<string | null>(null);
	let gone = $state<string[]>([]);
	let picked = $state<string | null>(null);
	let chosenDay = $state<string | null>(null);

	const state = $derived.by((): DoctorMoveState => {
		if (appointment) {
			if (sent) return 'form';
			return !refused && doctorMoveEntry(appointment) === 'form' ? 'form' : 'closed';
		}
		if (missing) return 'missing';
		if (read.isError) return 'failed';
		return 'loading';
	});

	const slots = createInfiniteQuery(() => ({
		...doctorRescheduleSlotsQuery(options.appointmentId()),
		enabled: state === 'form' && !sent
	}));
	const slotsRead = $derived({
		data: slots.data,
		isError: slots.isError,
		hasNextPage: slots.hasNextPage,
		isFetchingNextPage: slots.isFetchingNextPage
	});
	const pages = $derived(slotsRead.data?.pages ?? []);
	const days = $derived(buildDoctorMoveDays({ pages, gone, now, locale: options.locale() }));
	const day = $derived(doctorMoveSelectedDay(days, chosenDay));
	const timeZone = $derived(pages[0]?.timeZone ?? appointment?.officeTimeZone ?? '');
	const slotsState = $derived.by((): DoctorMoveSlotsState => {
		if (slotsRead.data) return 'ready';
		return slotsRead.isError ? 'failed' : 'loading';
	});
	// The hour chosen counts only while the grid still offers it (one taken, one that passed, goes with it).
	const pickedOffered = $derived(
		picked !== null && days.some((day) => day.slots.some((slot) => slot.startTime === picked))
	);

	const readAgain = (id: string) => {
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
	};
	const readHoursAgain = (id: string) =>
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.rescheduleSlots(id) });

	type Write = { id: string; startTime: string; was: string; confirmed: boolean };
	const write = createMutation<DoctorAppointmentDetailFacts | null, unknown, Write>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ id, startTime }: Write) => moveDoctorAppointment(id, startTime),
		onSuccess: (answered: DoctorAppointmentDetailFacts | null, { id, was, confirmed }: Write) => {
			sent = true;
			if (answered) client.setQueryData(doctorDashboardQueryKeys.detail(id), answered);
			else void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
			client.removeQueries({ queryKey: doctorDashboardQueryKeys.rescheduleSlots(id) });
			// 🔴 U-200.1 · D-W51-91: the server read this answer's «Νέο αίτημα» / «Τι έγινε;» itself; the doctor's dot follows.
			refreshNotificationInboxSide(client, 'doctor');
			memory?.remember(id, { kind: 'moved', was, confirmed });
			options.onDone();
		},
		onError: (error: unknown, { id, startTime }: Write) => {
			const locale = options.locale();
			const outcome = readDoctorWriteFailure(error);
			if (outcome.kind === 'session') {
				// 🔴 U-84: the session ended under the screen; the hour chosen stays for the same person.
				session?.expire({});
				return;
			}
			if (outcome.kind === 'conflict' || outcome.kind === 'past') {
				gone = [...gone, startTime];
				picked = null;
				conflict = outcome.kind === 'conflict';
				failure = m.booking_blocker_slot_unavailable({}, { locale });
				readHoursAgain(id);
				readAgain(id);
				return;
			}
			if (outcome.kind === 'closed') {
				refused = true;
				readAgain(id);
				return;
			}
			failure =
				outcome.kind === 'rate-limited'
					? m.doctor_reason_rate_limited({}, { locale })
					: m.appointments_change_failed({}, { locale });
		}
	}));

	return {
		/** What the page draws: its wait, the form, «δεν γίνεται πια», «δεν βρέθηκε», a read that failed. */
		get state() {
			return state;
		},
		get appointment() {
			return appointment;
		},
		/** The server's «now», drawn again every minute. */
		get now() {
			return now;
		},
		/** The hours' own read: its wait, a failure, the days. */
		get slotsState() {
			return slotsState;
		},
		/** Every day read, with only the hours still free. */
		get days() {
			return days;
		},
		/** The office's zone the hours are told in. */
		get timeZone() {
			return timeZone;
		},
		/** «Επόμενες ημέρες»: the server lists a week more. */
		get hasMoreDays() {
			return slotsRead.hasNextPage;
		},
		get readingMoreDays() {
			return slotsRead.isFetchingNextPage;
		},
		/** The day the strip shows: the one pressed while it has an hour, else the first with one. */
		get day() {
			return day;
		},
		/** The hour chosen, while the grid still offers it; `null` for none. */
		get picked() {
			return pickedOffered ? picked : null;
		},
		/** A `409` came and the appointment no longer moves: «δεν γίνεται πια» says it changed meanwhile. */
		get conflict() {
			return conflict;
		},
		/** The words of the last refused write, under the hours. */
		get failure() {
			return failure;
		},
		get sending() {
			return write.isPending;
		},
		/** Another day: the hour chosen on the last one goes (`sw.js:1000`). */
		chooseDay(date: string) {
			if (date === day?.date) return;
			chosenDay = date;
			picked = null;
		},
		pick(startTime: string) {
			picked = startTime;
			failure = null;
		},
		moreDays() {
			if (slots.hasNextPage && !slots.isFetchingNextPage) void slots.fetchNextPage();
		},
		/** 🔴 D-W51-51: ONE press, only with an hour — refused while one is on its way or once the server took it. */
		send() {
			const current = appointment;
			const startTime = pickedOffered ? picked : null;
			if (!current || !startTime || write.isPending || sent) return;
			failure = null;
			write.mutate({
				id: current.id,
				startTime,
				was: current.startTime,
				confirmed: current.status === 'pending'
			});
		},
		retry() {
			void query.refetch();
		},
		retryHours() {
			void slots.refetch();
		}
	};
}

export type DoctorMoveRead = ReturnType<typeof useDoctorMove>;
