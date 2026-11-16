import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import { refreshNotificationInboxSide } from '$shared/lib/notification-inbox';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import {
	cancelDoctorAppointment,
	doctorAppointmentQuery,
	readDoctorActionFailure,
	rejectDoctorAppointment,
	type DoctorAppointmentDetailFacts,
	type DoctorCancelRequest,
	type DoctorRejectRequest
} from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DOCTOR_TODAY_POLL_MS } from '$modules/doctor-dashboard/config';
import type { DoctorReasonStep } from '$modules/doctor-dashboard/lib/paths';
import { doctorReasonCopy, doctorReasonEntry } from '$modules/doctor-dashboard/lib/reason';
import type { DoctorReasonState } from '../types';

/** What one press sends: the refusal's body or the cancellation's. */
type DoctorReasonBody = DoctorRejectRequest | DoctorCancelRequest;

/**
 * Wave 5.1 · screen 69 (D-W51-46 … 48): the appointment the address names, read as screen 68 reads it (the same cache:
 * opened from 68 it is there, and read again at once — `staleTime` 0 — so the server's `actions` are today's), and its
 * ONE write. 🔴 D-W51-06: a `403` and a `404` read «δεν βρέθηκε». After the write (D-W51-48):
 * - success ⇒ the answer IS the detail, put in its cache as it came; the lists (66 / 67, «Ιστορικό») read again; the
 *   toast; back to 68 (`onDone`), the screen as it was meanwhile (`sent`);
 * - `409` ⇒ the state changed meanwhile (the request expired, the patient canceled): its words on the page, the detail and
 *   the lists read again, and the step that is no longer allowed gives way to «δεν γίνεται πια»;
 * - `422`, a lost request, `5xx`, `429` ⇒ its words, the reason and the words STAY;
 * - `401` ⇒ the sign-in over the screen (U-84); `403` / `404` ⇒ read again (the page then says «δεν βρέθηκε»).
 * 🔴 No second press: the button waits while one is on its way, and none goes once the server took it.
 */
export function useDoctorReason(options: {
	appointmentId: () => string;
	step: () => DoctorReasonStep;
	locale: () => SupportedLocale;
	/** Back to screen 68 once the server took it. */
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
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
	// «Το ραντεβού είναι σε 20 λεπτά» stays true while the doctor reads (the minute's clock of the desk).
	$effect(() => {
		const tick = setInterval(() => (now = readServerNow()), DOCTOR_TODAY_POLL_MS);
		return () => clearInterval(tick);
	});

	let sent = $state(false);
	let conflict = $state(false);
	let failure = $state<string | null>(null);

	const entry = $derived(appointment ? doctorReasonEntry(appointment, options.step()) : null);
	const state = $derived.by((): DoctorReasonState => {
		if (appointment) return sent || entry === 'form' ? 'form' : 'closed';
		if (missing) return 'missing';
		if (read.isError) return 'failed';
		return 'loading';
	});

	const readAgain = (id: string) => {
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
	};

	type Write = { id: string; step: DoctorReasonStep; body: DoctorReasonBody };
	const write = createMutation<DoctorAppointmentDetailFacts | null, unknown, Write>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ id, step, body }: Write) =>
			step === 'reject'
				? rejectDoctorAppointment(id, body as DoctorRejectRequest)
				: cancelDoctorAppointment(id, body as DoctorCancelRequest),
		onSuccess: (answered: DoctorAppointmentDetailFacts | null, { id, step }: Write) => {
			sent = true;
			if (answered) client.setQueryData(doctorDashboardQueryKeys.detail(id), answered);
			else void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
			// 🔴 U-200.1 · D-W51-91: the server read this answer's «Νέο αίτημα» / «Τι έγινε;» itself; the doctor's dot follows.
			refreshNotificationInboxSide(client, 'doctor');
			toasts?.show({ message: doctorReasonCopy(step, options.locale()).done });
			options.onDone();
		},
		onError: (error: unknown, { id, step }: Write) => {
			const locale = options.locale();
			const outcome = readDoctorActionFailure(error);
			if (outcome.kind === 'session') {
				// 🔴 U-84: the session ended under the screen; the reason and the words stay for the same person.
				session?.expire({});
				return;
			}
			if (outcome.kind === 'conflict') {
				conflict = true;
				failure = m.doctor_reason_conflict({}, { locale });
				readAgain(id);
				return;
			}
			if (outcome.kind === 'refused') readAgain(id);
			failure =
				outcome.status === 429
					? m.doctor_reason_rate_limited({}, { locale })
					: doctorReasonCopy(step, locale).failed;
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
		/** A `409` came: «δεν γίνεται πια» says the state changed meanwhile. */
		get conflict() {
			return conflict;
		},
		/** The words of the last refused write, under the form. */
		get failure() {
			return failure;
		},
		get sending() {
			return write.isPending;
		},
		/** A new choice clears the last refusal's words. */
		clearFailure() {
			failure = null;
		},
		/** 🔴 D-W51-47: ONE press — refused while one is on its way or once the server took it. */
		send(body: DoctorReasonBody) {
			if (write.isPending || sent) return;
			failure = null;
			write.mutate({ id: options.appointmentId(), step: options.step(), body });
		},
		retry() {
			void query.refetch();
		}
	};
}

export type DoctorReasonRead = ReturnType<typeof useDoctorReason>;
