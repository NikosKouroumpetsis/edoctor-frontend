import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import { refreshNotificationInboxSide } from '$shared/lib/notification-inbox';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import {
	declareDoctorAppointmentOutcome,
	doctorAppointmentQuery,
	readDoctorCorrectionFailure,
	type DoctorAppointmentDetailFacts,
	type DoctorAppointmentVerdict
} from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { doctorCorrectionEntry } from '$modules/doctor-dashboard/lib/correction';
import { getDoctorAppointmentMemoryOptional } from '$modules/doctor-dashboard/ui/memory';
import type { DoctorCorrectionRefusal, DoctorCorrectionState } from '../types';

/**
 * Wave 5.1 · screen 71 «Διόρθωση έκβασης» (D-W51-62, U-196.1): the appointment the address names, read as screen 68
 * reads it (the same cache, read again at once: the server's `actions.correction` is today's), and its ONE write — the
 * existing `POST …/outcome` with the opposite verdict (w51-b5). 🔴 D-W51-06: a `403` and a `404` read «δεν βρέθηκε».
 * After the write:
 * - success ⇒ the answer IS the detail, put in its cache as it came; the lists read again; the correction remembered
 *   for the 68's green card «Διορθώθηκε σε «…».» (never in the address); back to 68 (`onDone`);
 * - `409` naming the review (U-196.1) ⇒ «Ο ασθενής έχει ήδη γράψει κριτική· η διόρθωση δεν γίνεται.»; any other `409`,
 *   `403`, `404` (the window passed, the outcome changed meanwhile) ⇒ «δεν γίνεται πια» — both with one way back, the
 *   appointment and the lists read again;
 * - a lost request, `5xx`, `422`, `429` ⇒ its words, the choice STAYS; `401` ⇒ the sign-in over the screen (U-84).
 * 🔴 No second press: the button waits while one is on its way, and none goes once the server took it. At the end of
 * the window the appointment is read again (the server then opens no correction: «δεν γίνεται πια»).
 */
export function useDoctorCorrection(options: {
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

	let sent = $state(false);
	// The visit as the page drew it when the press went (a reference, never a copy in a rune): the screen stays as it was
	// while it leaves (the 69's `sent`), never the corrected answer drawn as a new form.
	let sentFrom: DoctorAppointmentDetailFacts | null = null;
	let refusal = $state<DoctorCorrectionRefusal | null>(null);
	let failure = $state<string | null>(null);

	const entry = $derived(appointment ? doctorCorrectionEntry(appointment) : null);
	const state = $derived.by((): DoctorCorrectionState => {
		if (appointment) {
			if (refusal) return 'closed';
			return sent || entry === 'form' ? 'form' : 'closed';
		}
		if (missing) return 'missing';
		if (read.isError) return 'failed';
		return 'loading';
	});

	const readAgain = (id: string) => {
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
	};

	// The window ends while the doctor looks: the appointment is read again (its correction goes with it).
	$effect(() => {
		const until = appointment?.actions.correction?.until;
		const id = appointment?.id;
		if (!until || !id || sent) return;
		const wait = Date.parse(until) - readServerNow();
		if (!Number.isFinite(wait) || wait < 0) return;
		const timer = setTimeout(
			() =>
				untrack(
					() => void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) })
				),
			wait + 1_000
		);
		return () => clearTimeout(timer);
	});

	type Write = { id: string; to: DoctorAppointmentVerdict };
	const write = createMutation<DoctorAppointmentDetailFacts | null, unknown, Write>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ id, to }: Write) => declareDoctorAppointmentOutcome(id, to),
		onSuccess: (answered: DoctorAppointmentDetailFacts | null, { id, to }: Write) => {
			sent = true;
			if (answered) client.setQueryData(doctorDashboardQueryKeys.detail(id), answered);
			else void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
			// 🔴 U-200.1 · D-W51-91: the server read this answer's «Νέο αίτημα» / «Τι έγινε;» itself; the doctor's dot follows.
			refreshNotificationInboxSide(client, 'doctor');
			memory?.remember(id, { kind: 'corrected', to });
			options.onDone();
		},
		onError: (error: unknown, { id }: Write) => {
			sentFrom = null;
			const locale = options.locale();
			const outcome = readDoctorCorrectionFailure(error);
			if (outcome.kind === 'session') {
				// 🔴 U-84: the session ended under the screen; the choice stays for the same person.
				session?.expire({});
				return;
			}
			if (outcome.kind === 'rated' || outcome.kind === 'closed') {
				refusal = outcome.kind;
				readAgain(id);
				return;
			}
			failure =
				outcome.kind === 'rate-limited'
					? m.doctor_reason_rate_limited({}, { locale })
					: m.doctor_correction_failed({}, { locale });
		}
	}));

	return {
		/** What the page draws: its wait, the form, «δεν γίνεται πια», «δεν βρέθηκε», a read that failed. */
		get state() {
			return state;
		},
		get appointment() {
			return sent && sentFrom ? sentFrom : appointment;
		},
		/** Why «δεν γίνεται πια»: the patient's review, or another refusal; `null` while nothing refused it. */
		get refusal() {
			return refusal;
		},
		/** The words of the last write nobody decided, under the form. */
		get failure() {
			return failure;
		},
		get sending() {
			return write.isPending;
		},
		/** A new choice clears the last failure's words. */
		clearFailure() {
			failure = null;
		},
		/** 🔴 ONE press — refused while one is on its way or once the server took it. */
		send(to: DoctorAppointmentVerdict) {
			if (write.isPending || sent) return;
			failure = null;
			sentFrom = appointment;
			write.mutate({ id: options.appointmentId(), to });
		},
		retry() {
			void query.refetch();
		}
	};
}

export type DoctorCorrectionRead = ReturnType<typeof useDoctorCorrection>;
