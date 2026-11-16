import { createInfiniteQuery, createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import { readServerNow } from '$shared/lib/server-clock';
import type { DoctorAppointmentFacts } from '$modules/doctor-dashboard/api/appointments';
import {
	doctorPatientAppointmentsQuery,
	doctorPatientCardQuery,
	type DoctorPatientAppointmentsSection
} from '$modules/doctor-dashboard/api/patients';
import { DOCTOR_TODAY_POLL_MS } from '$modules/doctor-dashboard/config';
import type { DoctorPatientAddressKey } from '$modules/doctor-dashboard/lib/paths';
import type { DoctorPatientState } from '../types';

/**
 * Wave 5.1 · screen 73's card (D-W51-65, D-W51-75): the patient the address names, read in the browser (`GET
 * …/patients/{kind}/{id}`, with the first page of «Επόμενα» and «Προηγούμενα»). 🔴 D-W51-63: a `404` and a `403` read
 * the same — «δεν βρέθηκε» —, another doctor's patient is never told apart from one that does not exist. «Περισσότερα»
 * of a list reads its next pages from the card's cursor (`…/appointments?section=`), only when pressed.
 */
export function useDoctorPatientCard(options: { patientKey: () => DoctorPatientAddressKey }) {
	let now = $state(readServerNow());
	$effect(() => {
		const tick = setInterval(() => (now = readServerNow()), DOCTOR_TODAY_POLL_MS);
		return () => clearInterval(tick);
	});

	const card = createQuery(() => ({
		...doctorPatientCardQuery(options.patientKey()),
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const read = $derived({
		data: card.data,
		error: card.error,
		isError: card.isError,
		isSuccess: card.isSuccess
	});
	const facts = $derived(read.data ?? null);
	const missing = $derived(
		(read.error instanceof ApiError && [403, 404].includes(read.error.status)) ||
			(read.isSuccess && read.data === null)
	);
	const state = $derived.by((): DoctorPatientState => {
		if (facts) return 'ready';
		if (missing) return 'missing';
		if (read.isError) return 'failed';
		return 'loading';
	});

	// «Περισσότερα» pressed, per list (the next pages are read only then).
	let wanted = $state({ upcoming: false, past: false });
	const firstCursor = (section: DoctorPatientAppointmentsSection) =>
		(section === 'upcoming' ? facts?.upcoming.nextCursor : facts?.past.nextCursor) ?? '';
	const pagesOf = (section: DoctorPatientAppointmentsSection) =>
		createInfiniteQuery(() => ({
			...doctorPatientAppointmentsQuery(options.patientKey(), section, firstCursor(section)),
			enabled: browser && wanted[section] && firstCursor(section) !== ''
		}));
	const more = { upcoming: pagesOf('upcoming'), past: pagesOf('past') };
	const moreRead = $derived({
		upcoming: {
			data: more.upcoming.data,
			hasNext: more.upcoming.hasNextPage,
			fetching: more.upcoming.isFetching,
			isError: more.upcoming.isError
		},
		past: {
			data: more.past.data,
			hasNext: more.past.hasNextPage,
			fetching: more.past.isFetching,
			isError: more.past.isError
		}
	});

	/** The card's first page and every page read after it, each appointment once. */
	const listOf = (section: DoctorPatientAppointmentsSection): DoctorAppointmentFacts[] => {
		const first = (section === 'upcoming' ? facts?.upcoming.items : facts?.past.items) ?? [];
		const rest = moreRead[section].data?.pages.flatMap((page) => page.items) ?? [];
		return [...first, ...rest].filter(
			(item, index, all) => all.findIndex((other) => other.id === item.id) === index
		);
	};
	const upcoming = $derived(listOf('upcoming'));
	const past = $derived(listOf('past'));
	const hasMoreOf = (section: DoctorPatientAppointmentsSection) =>
		wanted[section] ? moreRead[section].hasNext : firstCursor(section) !== '';

	return {
		get state() {
			return state;
		},
		get card() {
			return facts;
		},
		/** The server's «now», a minute at a time («Σήμερα», «πρώτη …»). */
		get now() {
			return now;
		},
		get upcoming() {
			return upcoming;
		},
		get past() {
			return past;
		},
		hasMore: (section: DoctorPatientAppointmentsSection) => hasMoreOf(section),
		/** «Περισσότερα» is on its way (it waits, never a second read). */
		loadingMore: (section: DoctorPatientAppointmentsSection) => moreRead[section].fetching,
		/** «Περισσότερα»: the first page after the card's, then each next one. */
		showMore(section: DoctorPatientAppointmentsSection) {
			if (!wanted[section]) {
				wanted = { ...wanted, [section]: true };
				return;
			}
			const pages = more[section];
			if (pages.isError) void pages.refetch();
			else if (pages.hasNextPage && !pages.isFetchingNextPage) void pages.fetchNextPage();
		},
		retry() {
			void card.refetch();
		}
	};
}

export type DoctorPatientCardRead = ReturnType<typeof useDoctorPatientCard>;
