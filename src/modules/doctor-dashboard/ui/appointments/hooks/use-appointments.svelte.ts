import { untrack } from 'svelte';
import { createInfiniteQuery, createQuery } from '@tanstack/svelte-query';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	doctorHistoryQuery,
	doctorRequestsQuery,
	doctorTodayScopeQuery,
	doctorUpcomingQuery,
	type DoctorAppointmentFacts
} from '$modules/doctor-dashboard/api/appointments';
import { doctorOfficesQuery } from '$modules/doctor-dashboard/api/offices';
import {
	doctorHistoryRows,
	doctorOfficeLine,
	doctorWaitingRequests,
	groupDoctorAhead,
	groupDoctorHistory
} from '$modules/doctor-dashboard/lib/appointments';
import type { DoctorAppointmentsTab } from '$modules/doctor-dashboard/lib/paths';
import { useDoctorDesk, type DoctorCardAnswer } from '$modules/doctor-dashboard/ui/card';
import type { DoctorAppointmentsView, DoctorOfficeChoice } from '../types';

/**
 * Wave 5.1 · screen 67 «Ραντεβού» (D-W51-29): the module's ONE home of the book's reads, always `as=doctor`.
 * - the doctor's offices: the filter shows only with more than one; an office of the address that is not one of them
 *   (or with a single office) reads every office; with an office in the address the lists wait for that answer;
 * - «Αιτήματα» (`status=pending`, to the end — its number is on its pill whatever pill shows), «Επερχόμενα»
 *   (`scope=today` still ahead + `scope=upcoming`), «Ιστορικό» (`scope=history&sortDir=desc`, page after page, the
 *   closed ones only) — each read only while its pill shows, each narrowed to the office;
 * - the clocks and the one-tap «Επιβεβαίωση» are the doctor's desk (`ui/card`), the same as «Σήμερα»'s (D-W51-25).
 */
export function useDoctorAppointments(options: {
	locale: () => SupportedLocale;
	tab: () => DoctorAppointmentsTab;
	officeId: () => string | null;
}) {
	const tab = $derived(options.tab());
	const offices = createQuery(() => doctorOfficesQuery());
	// 🔴 Every read's `data` and `isError` are READ every time, never behind a `&&` (the library tells a result only the
	// properties it saw read — «Σήμερα»'s gotcha, `documentation/state-management.md`).
	const officeRead = $derived({ data: offices.data, isError: offices.isError });
	const officeList = $derived(officeRead.data ?? []);
	const filterShown = $derived(officeList.length > 1);
	const asked = $derived(options.officeId());
	const officeKnown = $derived(
		asked === null || officeRead.data !== undefined || officeRead.isError
	);
	const office = $derived(
		filterShown && asked !== null && officeList.some((entry) => entry.id === asked) ? asked : null
	);

	const requests = createQuery(() => ({ ...doctorRequestsQuery(office), enabled: officeKnown }));
	const today = createQuery(() => ({
		...doctorTodayScopeQuery(office),
		enabled: officeKnown && tab === 'upcoming'
	}));
	const upcoming = createQuery(() => ({
		...doctorUpcomingQuery(office),
		enabled: officeKnown && tab === 'upcoming'
	}));
	const history = createInfiniteQuery(() => ({
		...doctorHistoryQuery(office),
		enabled: officeKnown && tab === 'history'
	}));

	const read = $derived({
		requests: { data: requests.data, isError: requests.isError },
		today: { data: today.data, isError: today.isError },
		upcoming: { data: upcoming.data, isError: upcoming.isError },
		history: {
			data: history.data,
			isError: history.isError,
			hasMore: history.hasNextPage,
			fetchingMore: history.isFetchingNextPage
		}
	});

	const desk = useDoctorDesk({
		locale: options.locale,
		requests: () => ({ read: read.requests.data?.items, shown: shownRequests })
	});
	const now = $derived(desk.now);

	const waiting = $derived(
		read.requests.data ? doctorWaitingRequests(read.requests.data.items, now) : null
	);
	const days = $derived(
		groupDoctorAhead({
			today: read.today.data?.items ?? [],
			upcoming: read.upcoming.data?.items ?? [],
			now,
			locale: options.locale()
		})
	);
	const historyRows = $derived(
		doctorHistoryRows(read.history.data?.pages.flatMap((page) => page.items) ?? [])
	);
	const months = $derived(groupDoctorHistory(historyRows, options.locale()));
	// The requests the page shows now: its deadline is the desk's next look (D-W51-23).
	const shownRequests = $derived.by((): DoctorAppointmentFacts[] => {
		if (tab === 'requests') return waiting ?? [];
		if (tab === 'upcoming') {
			return days.flatMap((day) => day.items).filter((item) => item.status === 'pending');
		}
		return [];
	});

	const view = $derived.by((): DoctorAppointmentsView => {
		if (tab === 'requests') {
			const answer = read.requests;
			if (answer.isError && answer.data === undefined) return 'failed';
			if (!waiting) return 'loading';
			return waiting.length > 0 ? 'ready' : 'empty';
		}
		if (tab === 'upcoming') {
			const answers = [read.today, read.upcoming];
			if (answers.some((answer) => answer.isError && answer.data === undefined)) return 'failed';
			if (answers.some((answer) => answer.data === undefined)) return 'loading';
			return days.length > 0 ? 'ready' : 'empty';
		}
		const answer = read.history;
		if (answer.isError && answer.data === undefined) return 'failed';
		if (answer.data === undefined) return 'loading';
		if (historyRows.length > 0) return 'ready';
		// Pages of open visits only (the days before): the next page is read before «nothing» is said.
		if (answer.hasMore) return answer.isError ? 'failed' : 'loading';
		return 'empty';
	});

	// The history read so far shows nothing yet more is there: the next page, at once (no end on screen to near).
	$effect(() => {
		const answer = read.history;
		if (tab !== 'history' || answer.data === undefined || historyRows.length > 0) return;
		if (!answer.hasMore || answer.fetchingMore || answer.isError) return;
		untrack(() => void history.fetchNextPage());
	});

	// 🔴 D-W51-36: the first card of the pill on screen, the one that opens beside the list from 1128 (the 50's way).
	const first = $derived.by((): string | undefined => {
		if (view !== 'ready') return undefined;
		if (tab === 'requests') return waiting?.[0]?.id;
		if (tab === 'upcoming') return days[0]?.items[0]?.id;
		return months[0]?.items[0]?.id;
	});

	const officeChoices = $derived<DoctorOfficeChoice[]>(
		officeList.map((entry) => ({ id: entry.id, label: doctorOfficeLine(entry, options.locale()) }))
	);

	return {
		get tab() {
			return tab;
		},
		get view() {
			return view;
		},
		get now() {
			return now;
		},
		/** The first card of the pill on screen, once read (`undefined` before, or with none). */
		get first() {
			return first;
		},
		/** «Αιτήματα (n)»: the requests still waiting, once read (`null` before). */
		get requestCount() {
			return waiting?.length ?? null;
		},
		get requests() {
			return waiting ?? [];
		},
		get days() {
			return days;
		},
		get months() {
			return months;
		},
		/** «Ιστορικό» has more pages to read: the end of the list asks for the next as it nears the screen. */
		get hasMore() {
			return read.history.hasMore;
		},
		/** How many pages of «Ιστορικό» are read: the end of the list is observed again after each. */
		get pagesRead() {
			return read.history.data?.pages.length ?? 0;
		},
		/** The office filter: shown only with more than one office (D-W51-29). */
		get filterShown() {
			return filterShown;
		},
		get offices() {
			return officeChoices;
		},
		/** The office the lists are narrowed to (`null`: every office). */
		get office() {
			return office;
		},
		loadMore() {
			if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
		},
		answeringOf: (id: string): DoctorCardAnswer | null => desk.answeringOf(id),
		/** 🔴 D-W51-25: the same one tap as «Σήμερα»'s. */
		answer(id: string, answer: DoctorCardAnswer) {
			desk.answer(id, answer);
		},
		retry() {
			if (tab === 'requests') void requests.refetch();
			else if (tab === 'upcoming') {
				for (const answer of [today, upcoming]) if (answer.isError) void answer.refetch();
			} else if (history.data && history.hasNextPage) void history.fetchNextPage();
			else void history.refetch();
		}
	};
}

export type DoctorAppointments = ReturnType<typeof useDoctorAppointments>;
