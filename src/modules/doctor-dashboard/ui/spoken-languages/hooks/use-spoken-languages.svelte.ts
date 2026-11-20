import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	doctorLanguageOptionsQuery,
	doctorLanguagesQuery,
	readDoctorLanguagesFailure,
	replaceDoctorLanguages,
	type DoctorLanguageFacts
} from '$modules/doctor-dashboard/api/languages';
import { DOCTOR_LANGUAGE_SEARCH_MAX_LENGTH } from '$modules/doctor-dashboard/config';
import {
	buildDoctorLanguagePick,
	doctorLanguagesCountText,
	doctorLanguagesFailureText,
	doctorLanguagesLimitNote,
	sameDoctorLanguages,
	toggleDoctorLanguage
} from '$modules/doctor-dashboard/lib/languages';
import type { DoctorSpokenLanguagesState } from '../types';

/**
 * Wave 5.2 · screen 82, the choice of the languages the doctor speaks (U-211, U-112, D-W52-66 / 69).
 * - Two reads, in the page's language: the catalogue (public) and the languages of the session's own doctor.
 * - The choice is the page's own until «Αποθήκευση»: it starts as the saved languages, a press takes one out or — below
 *   ten — puts one in. Nothing is shown as saved before the server says so. At ten the limit's sentence stands over
 *   the page's buttons, always in sight (D-W52-59α).
 * - No words in the search: «Οι γλώσσες σας» — the saved languages, as the page opened — keeps its rows in place while
 *   the doctor presses them, over «Όλες οι γλώσσες». Words: ONE list of what they find, the chosen ones with their tick
 *   among them; a chosen language they do not find is not in it (D-W52-69α, `sw.js` `slPickPage`).
 * - «Αποθήκευση» sends the WHOLE set in ONE call. Done ⇒ the languages are the server's answer, «Το προφίλ μου» and
 *   everything under it are read again, «Αποθηκεύτηκε.», and the page closes.
 * - A refusal says why in the page's words and the choice STAYS; when the server says the catalogue no longer holds a
 *   code, or the write met another, the lists are read again. A `401` ends the session.
 */
export function useDoctorSpokenLanguages(options: {
	locale: () => SupportedLocale;
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const messages = () => ({ locale: options.locale() });

	const list = createQuery(() => ({
		...doctorLanguageOptionsQuery(options.locale()),
		enabled: browser
	}));
	const saved = createQuery(() => ({
		...doctorLanguagesQuery(options.locale()),
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const catalogue = $derived({ data: list.data, isError: list.isError, error: list.error });
	const spoken = $derived({ data: saved.data, isError: saved.isError, error: saved.error });

	const state = $derived.by((): DoctorSpokenLanguagesState => {
		if (catalogue.data !== undefined && spoken.data !== undefined) return 'ready';
		const failed =
			(catalogue.data === undefined && catalogue.isError) ||
			(spoken.data === undefined && spoken.isError);
		return failed ? 'failed' : 'loading';
	});

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = [catalogue.error, spoken.error].find(
			(entry) => entry instanceof ApiError && entry.status === 401
		);
		if (!error || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	// What the doctor pressed since the page opened; until then the choice IS the saved languages. Only codes the
	// catalogue still holds count: a line it lost cannot be sent (the server would refuse the whole set).
	let draft = $state<string[] | null>(null);
	const known = $derived((catalogue.data ?? []).map((line) => line.code));
	const savedCodes = $derived(
		(spoken.data ?? []).map((language) => language.code).filter((code) => known.includes(code))
	);
	const chosen = $derived((draft ?? savedCodes).filter((code) => known.includes(code)));

	// The words of the search. With none, «Οι γλώσσες σας» holds the saved languages — as the page opened (D-W52-69α):
	// a language chosen on the page stays in «Όλες οι γλώσσες», ticked, where it was pressed.
	let query = $state('');
	const pick = $derived(
		buildDoctorLanguagePick({
			catalogue: catalogue.data ?? [],
			top: savedCodes,
			chosen,
			query,
			locale: options.locale()
		})
	);

	let failure = $state<string | null>(null);
	// The write's own gate: the library tells of a write that began only a timer later (the `writing` gate of the
	// sign-up's steps), so a second press in between would send the choice twice.
	let saving = $state(false);

	const write = createMutation<DoctorLanguageFacts[] | null, unknown, string[]>(() => ({
		networkMode: 'always' as const,
		mutationFn: (codes: string[]) => replaceDoctorLanguages(codes, options.locale()),
		onSettled: () => {
			saving = false;
		},
		onSuccess: (answer) => {
			if (answer) {
				client.setQueryData<DoctorLanguageFacts[]>(
					doctorDashboardQueryKeys.profileLanguages(options.locale()),
					answer
				);
			}
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
			toasts?.show({ message: m.doctor_photos_saved({}, messages()) });
			options.onDone();
		},
		onError: (error: unknown) => {
			const reason = readDoctorLanguagesFailure(error);
			if (reason === 'session') {
				session?.expire({});
				return;
			}
			if (reason === 'not-in-catalogue' || reason === 'conflict' || reason === 'invalid') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
			}
			failure = doctorLanguagesFailureText(reason, options.locale());
		}
	}));

	return {
		get state() {
			return state;
		},
		/** The words of the search, as typed. */
		get query() {
			return query;
		},
		/** No words: «Οι γλώσσες σας» and «Όλες οι γλώσσες». Words: the one list they find, or «Καμία γλώσσα με «…».». */
		get pick() {
			return pick;
		},
		get chosen() {
			return chosen;
		},
		/** «2 από 10»: how many are chosen, under the lists. */
		get hint() {
			return doctorLanguagesCountText(chosen.length, options.locale());
		},
		/** 🔴 D-W52-59α: at ten «Διαλέξατε 10. Για να διαλέξετε άλλη, βγάλτε μία.», over the page's buttons; `''` below. */
		get limitNote() {
			return doctorLanguagesLimitNote(chosen.length, options.locale());
		},
		/** «Αποθήκευση» waits for a change. */
		get changed() {
			return !sameDoctorLanguages(chosen, savedCodes);
		},
		get failure() {
			return failure;
		},
		get saving() {
			return saving;
		},
		/** The search was typed in (or cleared). Nothing is sent. */
		search(typed: string) {
			query = typed.slice(0, DOCTOR_LANGUAGE_SEARCH_MAX_LENGTH);
		},
		/** A press on a row: out, or — below the limit — in. Nothing is sent. */
		toggle(code: string) {
			if (saving || state !== 'ready' || !known.includes(code)) return;
			draft = toggleDoctorLanguage(chosen, code);
			failure = null;
		},
		/** One press, one write: the whole choice as it stands now. */
		save() {
			if (saving || state !== 'ready' || sameDoctorLanguages(chosen, savedCodes)) return;
			saving = true;
			failure = null;
			write.mutate([...chosen]);
		},
		/** «Δοκιμάστε ξανά»: the reads without an answer are asked for again. */
		retry() {
			if (catalogue.data === undefined) void list.refetch();
			if (spoken.data === undefined) void saved.refetch();
		}
	};
}

export type DoctorSpokenLanguages = ReturnType<typeof useDoctorSpokenLanguages>;
