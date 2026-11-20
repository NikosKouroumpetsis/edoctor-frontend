import { untrack } from 'svelte';
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { doctorCredentialsQuery } from '$modules/doctor-dashboard/api/credentials';
import { buildDoctorCvGroups, doctorCvLimitText } from '$modules/doctor-dashboard/lib/cv';
import type { DoctorCvView } from '../types';

/**
 * Wave 5.2 · screen 81 «Βιογραφικό» (U-210, D-W52-63): the page READS and writes nothing (a row is added, changed or
 * deleted on a page of its own). ONE read of the session's own doctor — `GET /doctor/profile/credentials`, whatever
 * the page's language (U-207.3: Greek alone) — in the SERVER's order, asked again whenever the page comes back to the
 * front (a row saved in another tab, or by the team, shows without a reload). A session the server no longer knows
 * (`401`) ends here; any other failed read offers «Δοκιμάστε ξανά».
 */
export function useDoctorCv(options: { locale: () => SupportedLocale }) {
	const session = getSessionOptional();
	const read = createQuery(() => ({
		...doctorCredentialsQuery(),
		refetchOnWindowFocus: 'always' as const,
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answer = $derived({ data: read.data, isError: read.isError, error: read.error });

	const view = $derived.by((): DoctorCvView => {
		if (answer.data !== undefined) return 'ready';
		return answer.isError ? 'failed' : 'loading';
	});

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = answer.error;
		if (!(error instanceof ApiError) || error.status !== 401 || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	const groups = $derived(buildDoctorCvGroups(answer.data ?? [], options.locale()));

	return {
		get view() {
			return view;
		},
		/** «Σπουδές · Εμπειρία · Συνέδρια», always the three, each with its rows in the server's order. */
		get groups() {
			return groups;
		},
		/** «Έως 20.»: in the place of «Προσθήκη» of a group that holds its twenty. */
		get limitText() {
			return doctorCvLimitText(options.locale());
		},
		retry() {
			void read.refetch();
		}
	};
}

export type DoctorCv = ReturnType<typeof useDoctorCv>;
