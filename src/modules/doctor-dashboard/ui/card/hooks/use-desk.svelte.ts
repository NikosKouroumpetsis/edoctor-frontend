import { untrack } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import { doctorAppointmentStatusPill } from '$shared/lib/appointment-status';
import { msUntilNextPlatformDay } from '$shared/lib/format-day-time';
import { refreshNotificationInboxSide } from '$shared/lib/notification-inbox';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import {
	confirmDoctorAppointment,
	declareDoctorAppointmentOutcome,
	readDoctorActionFailure,
	type DoctorAppointmentDetailFacts,
	type DoctorAppointmentFacts,
	type DoctorAppointmentScanFacts
} from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DOCTOR_TODAY_POLL_MS } from '$modules/doctor-dashboard/config';
import { nextDoctorRequestExpiry } from '$modules/doctor-dashboard/lib/today';
import type { DoctorCardAnswer } from '../types';

/** The state an answer of the visit leaves: «Στο ιατρείο», «Δεν ήρθε», «Ολοκληρώθηκε» (its toast is that state's word). */
const OUTCOME_STATUS = {
	ARRIVED: 'checked_in',
	NO_SHOW: 'no_show',
	COMPLETED: 'completed'
} as const satisfies Record<Exclude<DoctorCardAnswer, 'confirm'>, string>;

/**
 * Wave 5.1 · the doctor's desk under the cards of screens 66 «Σήμερα» and 67 «Ραντεβού» (D-W51-23, D-W51-25, D-W51-29:
 * ONE hook, the same mutation on both pages, never a copy):
 * - «now» is the server's (D-118), drawn again every minute, at the platform's midnight (S-34.1) and at the earliest
 *   deadline of a request the page shows (D-W51-23): the card goes, «Το αίτημα έληξε» says why — once per request
 *   that was shown — and the requests are read again;
 * - an answer is ONE tap (D-W51-25; «Ήρθε, είναι ακόμα στο ιατρείο» of 68 too, D-W51-61): its button waits, a second
 *   press is refused, success says so and reads the lists
 *   again; `409` reads them again and says «Το αίτημα έληξε» for a request gone; `401` ends the session as everywhere;
 * - 🔴 screen 68 (D-W51-36): the server's answer of a write IS the appointment's detail — it is put in the detail's
 *   cache as it came (never read twice for one tap) and the lists alone are invalidated; what was just answered on
 *   this page is remembered (`doneOf`, the page's memory) for its green card.
 */
export function useDoctorDesk(options: {
	locale: () => SupportedLocale;
	/** The requests as read (every office's, when the page narrows them) and those the page shows now. */
	requests: () => {
		read: readonly DoctorAppointmentFacts[] | undefined;
		shown: readonly DoctorAppointmentFacts[];
	};
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();

	let now = $state(readServerNow());

	// The minute's clock: «σε 20 λεπτά», a visit that began moves on (TanStack's own interval reads, this one draws).
	$effect(() => {
		const tick = setInterval(() => (now = readServerNow()), DOCTOR_TODAY_POLL_MS);
		return () => clearInterval(tick);
	});

	// S-34.1: at the platform's midnight «today» is another day — its window, its date, its groups.
	$effect(() => {
		const wait = msUntilNextPlatformDay(now);
		const timer = setTimeout(() => (now = readServerNow()), wait);
		return () => clearTimeout(timer);
	});

	// 🔴 D-W51-23: at the earliest deadline the page looks again (the page's rules leave the expired request out).
	const nextExpiry = $derived(nextDoctorRequestExpiry(options.requests().shown, now));
	$effect(() => {
		const due = nextExpiry;
		if (due === null) return;
		const timer = setTimeout(() => (now = readServerNow()), Math.max(0, due - readServerNow()));
		return () => clearTimeout(timer);
	});

	// The requests on the page, and those already announced: «Το αίτημα έληξε» once per request, only for one shown.
	const shown = new SvelteSet<string>();
	const announced = new SvelteSet<string>();
	function announceExpired(id: string) {
		if (announced.has(id)) return;
		announced.add(id);
		toasts?.show({ message: m.doctor_today_toast_expired({}, { locale: options.locale() }) });
	}
	$effect(() => {
		const { read, shown: onPage } = options.requests();
		const at = now;
		untrack(() => {
			const expired = (read ?? []).filter(
				(item) => shown.has(item.id) && item.expiresAt !== null && Date.parse(item.expiresAt) <= at
			);
			for (const item of expired) announceExpired(item.id);
			if (expired.length > 0) {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.requests() });
			}
			for (const item of onPage) shown.add(item.id);
		});
	});

	/**
	 * After a `409` on «Επιβεβαίωση»: the request read again — in every read of the requests (each office's) — is gone,
	 * or is no request any more, or is past its deadline ⇒ it expired.
	 */
	function expiredAfterConflict(id: string): boolean {
		const found = client
			.getQueriesData<DoctorAppointmentScanFacts>({
				queryKey: doctorDashboardQueryKeys.requests()
			})
			.flatMap(([, read]) => read?.items.filter((entry) => entry.id === id) ?? []);
		return found.every(
			(item) =>
				item.status !== 'pending' ||
				(item.expiresAt !== null && Date.parse(item.expiresAt) <= readServerNow())
		);
	}

	const answering = $state<Record<string, DoctorCardAnswer>>({});
	const done = $state<Record<string, DoctorCardAnswer>>({});
	const refreshLists = () =>
		client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });

	type Answer = { id: string; answer: DoctorCardAnswer };
	const write = createMutation<DoctorAppointmentDetailFacts | null, unknown, Answer>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ id, answer }: Answer) =>
			answer === 'confirm'
				? confirmDoctorAppointment(id)
				: declareDoctorAppointmentOutcome(id, answer),
		onSuccess: async (answered: DoctorAppointmentDetailFacts | null, { id, answer }: Answer) => {
			const locale = options.locale();
			if (answered) client.setQueryData(doctorDashboardQueryKeys.detail(id), answered);
			else void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
			done[id] = answer;
			toasts?.show({
				message:
					answer === 'confirm'
						? m.doctor_today_toast_confirmed({}, { locale })
						: doctorAppointmentStatusPill(OUTCOME_STATUS[answer], null, locale).label
			});
			// 🔴 U-200.1 · D-W51-91: the server read this answer's «Νέο αίτημα» / «Τι έγινε;» itself; the doctor's dot follows.
			refreshNotificationInboxSide(client, 'doctor');
			now = readServerNow();
			await refreshLists();
		},
		onError: async (error: unknown, { id, answer }: Answer) => {
			const failure = readDoctorActionFailure(error);
			if (failure.kind === 'session') {
				// 🔴 U-84: the session ended under the page; the sign-in opens over it, as on every page.
				session?.expire({});
				return;
			}
			if (failure.kind === 'conflict') {
				// 🔴 D-W51-23: answered, expired or settled meanwhile — the page reads what is true now (the 68's too).
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
				// U-200.1: answered elsewhere (the application, the backoffice) is read on the server already.
				refreshNotificationInboxSide(client, 'doctor');
				await client.refetchQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
				now = readServerNow();
				if (answer === 'confirm' && expiredAfterConflict(id)) announceExpired(id);
				return;
			}
			toasts?.show({
				tone: 'danger',
				message: m.doctor_today_action_failed({}, { locale: options.locale() })
			});
			if (failure.kind === 'refused') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.detail(id) });
				await refreshLists();
			}
		},
		onSettled: (_answer: unknown, _error: unknown, { id }: Answer) => {
			delete answering[id];
		}
	}));

	return {
		/** The server's «now», drawn again on the desk's clocks. */
		get now() {
			return now;
		},
		/** The answer on its way for a card, if any (its button waits, D-W51-25). */
		answeringOf: (id: string): DoctorCardAnswer | null => answering[id] ?? null,
		/** What this page answered last for an appointment, once the server took it (the 68's green card). */
		doneOf: (id: string): DoctorCardAnswer | null => done[id] ?? null,
		/** 🔴 D-W51-25: one tap; a second press while the first is on its way is refused. */
		answer(id: string, answer: DoctorCardAnswer) {
			if (answering[id]) return;
			answering[id] = answer;
			write.mutate({ id, answer });
		}
	};
}

export type DoctorDesk = ReturnType<typeof useDoctorDesk>;
