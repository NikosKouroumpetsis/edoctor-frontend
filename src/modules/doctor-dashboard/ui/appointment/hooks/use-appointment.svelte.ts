import { untrack } from 'svelte';
import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { doctorAppointmentQuery } from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { doctorAppointmentReviewQuery } from '$modules/doctor-dashboard/api/reviews';
import { useDoctorDesk, type DoctorCardAnswer } from '$modules/doctor-dashboard/ui/card';
import type { DoctorAppointmentState } from '../types';

/**
 * Wave 5.1 · screen 68 «Το ραντεβού» (D-W51-38): the appointment the address names, read in the browser as the doctor's
 * side (`GET …/{id}`). 🔴 D-W51-06: a `404` and a `403` read the same — «Δεν βρήκαμε αυτό το ραντεβού» —, so another
 * doctor's appointment is never told apart from one that does not exist. The clocks and the one-tap answers are the
 * desk's (`ui/card`, D-W51-25: the same hook as 66 and 67), which puts the server's answer in this read's cache; at a
 * request's deadline and at the end of a correction window the appointment is read again (its answers go with it,
 * D-W51-23, D-W51-61).
 */
export function useDoctorAppointment(options: {
	appointmentId: () => string;
	locale: () => SupportedLocale;
}) {
	const client = useQueryClient();
	const query = createQuery(() => doctorAppointmentQuery(options.appointmentId()));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const read = $derived({
		data: query.data,
		error: query.error,
		isError: query.isError,
		isSuccess: query.isSuccess
	});
	const desk = useDoctorDesk({
		locale: options.locale,
		requests: () => ({ read: undefined, shown: [] })
	});

	// 🔴 U-220.1 · D-W52-89: the published review of a completed visit — the list's own filter, no route of its own.
	const completed = $derived(read.data?.status === 'completed');
	const reviewRead = createQuery(() => ({
		...doctorAppointmentReviewQuery(options.appointmentId()),
		enabled: completed
	}));
	const review = $derived(completed ? (reviewRead.data?.items[0] ?? null) : null);

	const missing = $derived(
		(read.error instanceof ApiError && [403, 404].includes(read.error.status)) ||
			(read.isSuccess && read.data === null)
	);
	const appointment = $derived(read.data ?? null);
	const state = $derived.by((): DoctorAppointmentState => {
		if (appointment) return 'ready';
		if (missing) return 'missing';
		if (read.isError) return 'failed';
		return 'loading';
	});

	// 🔴 D-W51-23: a request reaching its deadline while the doctor looks is read again (the server takes its answers);
	// 🔴 D-W51-61: so is a settled visit at the end of its correction window (its «Διόρθωση» goes with it).
	$effect(() => {
		const current = appointment;
		if (!current) return;
		const due =
			current.status === 'pending'
				? current.expiresAt
				: (current.actions.correction?.until ?? null);
		if (!due) return;
		const wait = Date.parse(due) - readServerNow();
		if (!Number.isFinite(wait) || wait < 0) return;
		const timer = setTimeout(
			() =>
				untrack(
					() =>
						void client.invalidateQueries({
							queryKey: doctorDashboardQueryKeys.detail(current.id)
						})
				),
			wait + 1_000
		);
		return () => clearTimeout(timer);
	});

	return {
		get state() {
			return state;
		},
		get appointment() {
			return appointment;
		},
		/** 🔴 U-220.1: the patient's published review of this visit, `null` for none (or not read yet). */
		get review() {
			return review;
		},
		/** The server's «now», drawn again on the desk's clocks. */
		get now() {
			return desk.now;
		},
		/** The answer on its way, if any (its button waits, the other too). */
		get answering(): DoctorCardAnswer | null {
			return desk.answeringOf(options.appointmentId());
		},
		/** What this page answered last, once the server took it (the green card). */
		get done(): DoctorCardAnswer | null {
			return desk.doneOf(options.appointmentId());
		},
		/** 🔴 D-W51-25 · D-W51-61: one tap (and «Ήρθε, είναι ακόμα στο ιατρείο»), the same mutation as 66 and 67. */
		answer(answer: DoctorCardAnswer) {
			desk.answer(options.appointmentId(), answer);
		},
		retry() {
			void query.refetch();
		}
	};
}

export type DoctorAppointmentRead = ReturnType<typeof useDoctorAppointment>;
