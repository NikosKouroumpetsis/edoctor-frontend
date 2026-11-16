import { createInfiniteQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { useDebouncedValue } from '$shared/lib/debounce';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { doctorPatientsQuery } from '$modules/doctor-dashboard/api/patients';
import {
	DOCTOR_PATIENT_SEARCH_DEBOUNCE_MS,
	DOCTOR_TODAY_POLL_MS
} from '$modules/doctor-dashboard/config';
import { clampDoctorPatientSearch } from '$modules/doctor-dashboard/lib/new';
import { buildDoctorPatientListRows } from '$modules/doctor-dashboard/lib/patients';
import type { DoctorPatientsView } from '../types';

/**
 * Wave 5.1 · screen 73 «Οι ασθενείς μου» (D-W51-64, D-W51-74): the list's ONE read — the words typed, quiet a moment
 * (screen 72's 300 ms) and cut at 40 (U-65.6), none for every patient; page after page in the server's order (first
 * whoever has a visit ahead or a request, then by the latest visit), each next as the end of the list nears the screen.
 * «σήμερα» in the rows follows the server's clock, a minute at a time.
 */
export function useDoctorPatients(options: { locale: () => SupportedLocale }) {
	let query = $state('');
	let now = $state(readServerNow());
	$effect(() => {
		const tick = setInterval(() => (now = readServerNow()), DOCTOR_TODAY_POLL_MS);
		return () => clearInterval(tick);
	});

	const words = useDebouncedValue(
		() => clampDoctorPatientSearch(query).trim(),
		DOCTOR_PATIENT_SEARCH_DEBOUNCE_MS
	);
	const list = createInfiniteQuery(() => ({
		...doctorPatientsQuery(words.current),
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const read = $derived({
		data: list.data,
		isError: list.isError,
		hasMore: list.hasNextPage,
		fetchingMore: list.isFetchingNextPage
	});

	const patients = $derived(read.data?.pages.flatMap((page) => page.items) ?? []);
	const rows = $derived(buildDoctorPatientListRows(patients, now, options.locale()));
	const view = $derived.by((): DoctorPatientsView => {
		if (read.isError && read.data === undefined) return 'failed';
		if (read.data === undefined) return 'loading';
		if (rows.length > 0) return 'ready';
		return words.current ? 'none' : 'empty';
	});

	return {
		get query() {
			return query;
		},
		/** The words the rows answer (the quiet ones), `''` for every patient. */
		get words() {
			return words.current;
		},
		get view() {
			return view;
		},
		get rows() {
			return rows;
		},
		/** 🔴 D-W51-73: the first row on screen, the one that opens beside the list from 1128 (67's way). */
		get first() {
			return view === 'ready' ? rows[0] : undefined;
		},
		/** More pages to read: the end of the list asks for the next as it nears the screen. */
		get hasMore() {
			return read.hasMore;
		},
		/** How many pages are read: the end of the list is observed again after each. */
		get pagesRead() {
			return read.data?.pages.length ?? 0;
		},
		type(next: string) {
			query = clampDoctorPatientSearch(next);
		},
		loadMore() {
			if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
		},
		retry() {
			if (list.data && list.hasNextPage) void list.fetchNextPage();
			else void list.refetch();
		}
	};
}

export type DoctorPatientsRead = ReturnType<typeof useDoctorPatients>;
