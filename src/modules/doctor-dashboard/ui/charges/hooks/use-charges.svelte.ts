import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import { refreshNotificationInboxSide } from '$shared/lib/notification-inbox';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import {
	doctorAppointmentQuery,
	doctorServicesQuery,
	editDoctorAppointmentCharges,
	readDoctorWriteFailure,
	type DoctorAppointmentDetailFacts,
	type DoctorChargesRequest
} from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	doctorAmountError,
	doctorChargesClashText,
	doctorChargesEntry,
	doctorChargesInitialAmount,
	doctorChargesInitialChoice,
	doctorChargesTotals,
	formatDoctorAmount,
	toDoctorChargesRequest,
	toggleDoctorCharge,
	type DoctorChargeChoice
} from '$modules/doctor-dashboard/lib/charges';
import { getDoctorAppointmentMemoryOptional } from '$modules/doctor-dashboard/ui/memory';
import type { DoctorChargesState, DoctorServicesState } from '../types';

/**
 * Wave 5.1 · screen 70 «Υπηρεσίες και κόστος» (D-W51-44, D-W51-52): the appointment the address names (screen 68's cache,
 * read again at once), the doctor's services (only while the server lets them change), what is chosen, «Τελική τιμή»
 * as typed, and the ONE write (`PUT …/charges`). 🔴 D-W51-06: a `403` and a `404` read «δεν βρέθηκε». After the write:
 * - success ⇒ the answer IS the detail, put in its cache as it came; the lists read again; the save remembered for the
 *   68's green card; back to 68 (`onDone`);
 * - `409 CHARGES_DO_NOT_FIT` ⇒ «Δεν χωράει…» from the server's facts, what is chosen STAYS (a service to take off);
 * - any other `409` ⇒ the appointment changed meanwhile: its words, it is read again, and a step no longer allowed
 *   gives way to «δεν γίνεται πια»; `403` / `404` ⇒ «δεν γίνεται πια»;
 * - a lost request, `5xx`, `422`, `429` ⇒ its words, the form STAYS; `401` ⇒ the sign-in over the screen (U-84).
 * 🔴 No second press: the button waits while one is on its way, and none goes once the server took it.
 */
export function useDoctorCharges(options: {
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
	let refused = $state(false);
	let conflict = $state(false);
	let failure = $state<string | null>(null);
	let clash = $state<string | null>(null);
	let edited = $state<DoctorChargeChoice[] | null>(null);
	let typed = $state<string | null>(null);
	let touched = $state(false);

	const state = $derived.by((): DoctorChargesState => {
		if (appointment) {
			if (sent) return 'form';
			return !refused && doctorChargesEntry(appointment) === 'form' ? 'form' : 'closed';
		}
		if (missing) return 'missing';
		if (read.isError) return 'failed';
		return 'loading';
	});

	const services = createQuery(() => ({
		...doctorServicesQuery(options.locale()),
		enabled: state === 'form' && !sent
	}));
	const servicesRead = $derived({ data: services.data, isError: services.isError });
	const catalogue = $derived(servicesRead.data ?? []);
	const servicesState = $derived.by((): DoctorServicesState => {
		if (servicesRead.data) return 'ready';
		return servicesRead.isError ? 'failed' : 'loading';
	});

	const choice = $derived(
		edited ?? (appointment ? doctorChargesInitialChoice(appointment, catalogue) : [])
	);
	const totals = $derived(doctorChargesTotals(choice, catalogue));
	const amount = $derived(
		typed ?? (appointment ? doctorChargesInitialAmount(appointment, totals, options.locale()) : '')
	);
	const amountError = $derived(touched ? doctorAmountError(amount, options.locale()) : null);
	const request = $derived(toDoctorChargesRequest({ choice, amount, totals }));

	const readAgain = (id: string) => {
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
	};

	type Write = { id: string; body: DoctorChargesRequest; timeZone: string };
	const write = createMutation<DoctorAppointmentDetailFacts | null, unknown, Write>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ id, body }: Write) => editDoctorAppointmentCharges(id, body),
		onSuccess: (answered: DoctorAppointmentDetailFacts | null, { id }: Write) => {
			sent = true;
			if (answered) client.setQueryData(doctorDashboardQueryKeys.detail(id), answered);
			else void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
			// 🔴 U-200.1 · D-W51-91: the server read this answer's «Νέο αίτημα» / «Τι έγινε;» itself; the doctor's dot follows.
			refreshNotificationInboxSide(client, 'doctor');
			memory?.remember(id, { kind: 'charges' });
			options.onDone();
		},
		onError: (error: unknown, { id, timeZone }: Write) => {
			const locale = options.locale();
			const outcome = readDoctorWriteFailure(error);
			if (outcome.kind === 'session') {
				// 🔴 U-84: the session ended under the screen; what is chosen stays for the same person.
				session?.expire({});
				return;
			}
			if (outcome.kind === 'clash') {
				clash = doctorChargesClashText(outcome.clash, timeZone, locale);
				return;
			}
			if (outcome.kind === 'conflict') {
				conflict = true;
				failure = m.doctor_reason_conflict({}, { locale });
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
		/** The services' own read: its wait, a failure, the rows. */
		get servicesState() {
			return servicesState;
		},
		/** The doctor's services, in the server's order. */
		get services() {
			return catalogue;
		},
		/** What is chosen, with the counts the appointment had. */
		get choice() {
			return choice;
		},
		get totals() {
			return totals;
		},
		/** «Τελική τιμή» as the field shows it. */
		get amount() {
			return amount;
		},
		/** The field's own words when what is typed is no amount (D-W51-52). */
		get amountError() {
			return amountError;
		},
		/** «Δεν χωράει…» of the last write, while nothing else was chosen. */
		get clash() {
			return clash;
		},
		/** A `409` came and the services no longer change: «δεν γίνεται πια» says it changed meanwhile. */
		get conflict() {
			return conflict;
		},
		get failure() {
			return failure;
		},
		get sending() {
			return write.isPending;
		},
		/** «Αποθήκευση» wakes with a service and an amount. */
		get ready() {
			return request !== null;
		},
		/** 🔴 U-112: a press on a row; the price starts again from the new total (`sw.js:1011`). */
		toggle(doctorServiceId: string) {
			const next = toggleDoctorCharge(choice, doctorServiceId);
			edited = next;
			typed = formatDoctorAmount(doctorChargesTotals(next, catalogue).sum, options.locale());
			touched = false;
			clash = null;
			failure = null;
		},
		type(value: string) {
			typed = value;
			touched = true;
			failure = null;
		},
		/** 🔴 D-W51-52: ONE press — refused without a valid amount, while one is on its way or once the server took it. */
		send() {
			touched = true;
			const current = appointment;
			const body = request;
			if (!current || !body || write.isPending || sent) return;
			failure = null;
			clash = null;
			write.mutate({ id: current.id, body, timeZone: current.officeTimeZone });
		},
		retry() {
			void query.refetch();
		},
		retryServices() {
			void services.refetch();
		}
	};
}

export type DoctorChargesRead = ReturnType<typeof useDoctorCharges>;
