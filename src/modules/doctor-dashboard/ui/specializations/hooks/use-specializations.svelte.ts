import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DOCTOR_SPECIALIZATION_LIMIT } from '$modules/doctor-dashboard/config';
import {
	doctorSpecializationOptionsQuery,
	doctorSpecializationsQuery,
	readDoctorSpecializationsFailure,
	replaceDoctorSpecializations,
	type DoctorSpecializationFacts
} from '$modules/doctor-dashboard/api/specializations';
import {
	buildDoctorSpecializationRows,
	doctorSpecializationsCountText,
	doctorSpecializationsFailureText,
	doctorSpecializationsHint,
	sameDoctorSpecializations,
	toggleDoctorSpecialization
} from '$modules/doctor-dashboard/lib/specializations';
import type { DoctorSpecializationsState } from '../types';

/**
 * Wave 5.2 · screen 80, the choice of the specializations (U-209.3, U-225, D-W52-54 / 59).
 * - Two reads of the session's own doctor, in the page's language: the list of the specialty and the doctor's picks.
 * - The choice is the page's own until «Αποθήκευση»: it starts as the saved picks, a press takes one out or — below
 *   three — puts one in. Nothing is shown as saved before the server says so. At three the limit's sentence stands
 *   over the page's buttons, always in sight (D-W52-59α).
 * - «Αποθήκευση» sends the WHOLE set in ONE call. Done ⇒ the picks are the server's answer, «Το προφίλ μου» and
 *   everything under it are read again, «Αποθηκεύτηκε.», and the page closes.
 * - A refusal says why in the page's words and the choice STAYS; when the server says the list is no longer the
 *   specialty's, or the write met another, the lists are read again (a code the list lost leaves the choice). A `401`
 *   ends the session.
 */
export function useDoctorSpecializations(options: {
	locale: () => SupportedLocale;
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const messages = () => ({ locale: options.locale() });

	const list = createQuery(() => ({
		...doctorSpecializationOptionsQuery(options.locale()),
		enabled: browser
	}));
	const saved = createQuery(() => ({
		...doctorSpecializationsQuery(options.locale()),
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const catalogue = $derived({ data: list.data, isError: list.isError, error: list.error });
	const picks = $derived({ data: saved.data, isError: saved.isError, error: saved.error });

	const state = $derived.by((): DoctorSpecializationsState => {
		if (catalogue.data !== undefined && catalogue.data.length === 0) return 'none';
		if (catalogue.data !== undefined && picks.data !== undefined) return 'ready';
		const failed =
			(catalogue.data === undefined && catalogue.isError) ||
			(picks.data === undefined && picks.isError);
		return failed ? 'failed' : 'loading';
	});

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = [catalogue.error, picks.error].find(
			(entry) => entry instanceof ApiError && entry.status === 401
		);
		if (!error || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	// What the doctor pressed since the page opened; until then the choice IS the saved picks. Only codes the list
	// still holds count: a line the specialty lost cannot be sent (the server would refuse the whole set).
	let draft = $state<string[] | null>(null);
	const known = $derived((catalogue.data ?? []).map((line) => line.code));
	const savedCodes = $derived(
		(picks.data ?? []).map((pick) => pick.code).filter((code) => known.includes(code))
	);
	const chosen = $derived((draft ?? savedCodes).filter((code) => known.includes(code)));
	const rows = $derived(
		buildDoctorSpecializationRows(catalogue.data ?? [], chosen, options.locale())
	);

	let failure = $state<string | null>(null);
	// The write's own gate: the library tells of a write that began only a timer later (the `writing` gate of the
	// sign-up's steps), so a second press in between would send the choice twice.
	let saving = $state(false);

	const write = createMutation<DoctorSpecializationFacts[] | null, unknown, string[]>(() => ({
		networkMode: 'always' as const,
		mutationFn: (codes: string[]) => replaceDoctorSpecializations(codes, options.locale()),
		onSettled: () => {
			saving = false;
		},
		onSuccess: (answer) => {
			if (answer) {
				client.setQueryData<DoctorSpecializationFacts[]>(
					doctorDashboardQueryKeys.profileSpecializations(options.locale()),
					answer
				);
			}
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
			toasts?.show({ message: m.doctor_photos_saved({}, messages()) });
			options.onDone();
		},
		onError: (error: unknown) => {
			const reason = readDoctorSpecializationsFailure(error);
			if (reason === 'session') {
				session?.expire({});
				return;
			}
			if (reason === 'not-of-specialty' || reason === 'conflict' || reason === 'invalid') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
			}
			failure = doctorSpecializationsFailureText(reason, options.locale());
		}
	}));

	return {
		get state() {
			return state;
		},
		/** The list of the specialty as rows with ticks; at the limit the rows that are not chosen are held back. */
		get rows() {
			return rows;
		},
		get chosen() {
			return chosen;
		},
		/** «2 από 3»: how many are chosen, under the list. */
		get hint() {
			return doctorSpecializationsCountText(chosen.length, options.locale());
		},
		/**
		 * 🔴 D-W52-59α: at the limit «Διαλέξατε 3. Για να διαλέξετε άλλη, βγάλτε μία.» — the line that must always be in
		 * sight, over the page's buttons (a list of seventeen rows hides what stands under it); `''` below the limit.
		 */
		get limitNote() {
			return chosen.length >= DOCTOR_SPECIALIZATION_LIMIT
				? doctorSpecializationsHint(chosen.length, options.locale())
				: '';
		},
		/** «Αποθήκευση» waits for a change. */
		get changed() {
			return !sameDoctorSpecializations(chosen, savedCodes);
		},
		get failure() {
			return failure;
		},
		get saving() {
			return saving;
		},
		/** A press on a row: out, or — below the limit — in. Nothing is sent. */
		toggle(code: string) {
			if (saving || state !== 'ready' || !known.includes(code)) return;
			draft = toggleDoctorSpecialization(chosen, code);
			failure = null;
		},
		/** One press, one write: the whole choice as it stands now. */
		save() {
			if (saving || state !== 'ready' || sameDoctorSpecializations(chosen, savedCodes)) return;
			saving = true;
			failure = null;
			write.mutate([...chosen]);
		},
		/** «Δοκιμάστε ξανά»: the reads without an answer are asked for again. */
		retry() {
			if (catalogue.data === undefined) void list.refetch();
			if (picks.data === undefined) void saved.refetch();
		}
	};
}

export type DoctorSpecializations = ReturnType<typeof useDoctorSpecializations>;
