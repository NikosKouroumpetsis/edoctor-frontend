import { createQuery } from '@tanstack/svelte-query';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	doctorDayQuery,
	doctorRequestsQuery,
	doctorUpcomingQuery
} from '$modules/doctor-dashboard/api/appointments';
import { doctorReadinessQuery } from '$modules/doctor-dashboard/api/readiness';
import {
	doctorDayWindow,
	groupDoctorUpcoming,
	isDoctorNotTaking,
	isDoctorTodayEmpty,
	splitDoctorToday,
	type DoctorTodayGroups
} from '$modules/doctor-dashboard/lib/today';
import { useDoctorDesk, type DoctorCardAnswer } from '$modules/doctor-dashboard/ui/card';
import type { DoctorTodayView } from '../types';

const NO_GROUPS: DoctorTodayGroups = { requests: [], outcome: [], next: [], done: [] };

/**
 * Wave 5.1 · screen 66 «Σήμερα» (D-W51-22 … 25): the module's ONE home of the page's reads.
 * - the reads (D-W51-22): the requests, yesterday-and-today, from tomorrow — each to its end, every 60″ while the page
 *   shows and at once when it comes back (D-W51-24) — and the readiness only when there is no appointment at all;
 * - the clocks and the one-tap answers are the doctor's desk (`ui/card`, shared with screen 67): «now» is the server's,
 *   the earliest deadline makes the request go with «Το αίτημα έληξε», an answer is ONE tap.
 */
export function useDoctorToday(options: { locale: () => SupportedLocale }) {
	const requests = createQuery(() => doctorRequestsQuery());
	const desk = useDoctorDesk({
		locale: options.locale,
		requests: () => ({ read: requests.data?.items, shown: groups.requests })
	});
	const now = $derived(desk.now);
	const dayWindow = $derived(doctorDayWindow(now));

	const day = createQuery(() => doctorDayQuery(dayWindow));
	const upcoming = createQuery(() => doctorUpcomingQuery());

	const reads = $derived([requests, day, upcoming]);
	// 🔴 Every read's `data` and `isError` are READ every time, never behind a `&&`: the library tells a result only the
	// properties it saw read (its tracked props), so a read skipped once would never be told it arrived.
	const answers = $derived(reads.map((read) => ({ data: read.data, isError: read.isError })));
	const loaded = $derived(answers.every((read) => read.data !== undefined));
	const failed = $derived(answers.some((read) => read.isError && read.data === undefined));
	const requestRows = $derived(answers[0].data?.items);
	const dayRows = $derived(answers[1].data?.items);
	const groups = $derived(
		requestRows && dayRows
			? splitDoctorToday({ requests: requestRows, day: dayRows, now })
			: NO_GROUPS
	);
	const ahead = $derived(answers[2].data?.items ?? []);
	const upcomingDays = $derived(groupDoctorUpcoming(ahead, now));
	const nothing = $derived(loaded && isDoctorTodayEmpty(groups) && ahead.length === 0);

	const readiness = createQuery(() => ({ ...doctorReadinessQuery(), enabled: nothing }));

	const view = $derived.by((): DoctorTodayView => {
		const blockers = readiness.data?.blockers;
		const refused = readiness.isError;
		if (failed) return 'failed';
		if (!loaded) return 'loading';
		if (!nothing) return 'ready';
		if (blockers === undefined && !refused) return 'loading';
		return isDoctorNotTaking({ groups, upcoming: ahead, blockers: blockers ?? [] })
			? 'notready'
			: 'ready';
	});

	return {
		get view() {
			return view;
		},
		get now() {
			return now;
		},
		get groups() {
			return groups;
		},
		get upcoming() {
			return ahead;
		},
		get upcomingDays() {
			return upcomingDays;
		},
		/** The answer on its way for a card, if any (its button waits, D-W51-25). */
		answeringOf: (id: string): DoctorCardAnswer | null => desk.answeringOf(id),
		/** 🔴 D-W51-25: one tap; a second press while the first is on its way is refused. */
		answer(id: string, answer: DoctorCardAnswer) {
			desk.answer(id, answer);
		},
		retry() {
			for (const read of reads) if (read.isError) void read.refetch();
		}
	};
}

export type DoctorToday = ReturnType<typeof useDoctorToday>;
