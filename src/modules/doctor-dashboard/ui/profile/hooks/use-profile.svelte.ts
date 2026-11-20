import { untrack } from 'svelte';
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { doctorMyProfileQuery } from '$modules/doctor-dashboard/api/profile';
import {
	buildDoctorProfileRows,
	buildDoctorProfileStatus
} from '$modules/doctor-dashboard/lib/profile';
import type { DoctorProfileView } from '../types';

/**
 * Wave 5.2 · screen 77 «Το προφίλ μου» (D-W52-17, D-W52-23 … 25): the page's ONE read — `GET /doctor/me/profile` of the
 * session's own doctor, in the page's language, again whenever the page comes back to the front — and what the page
 * draws of it: the status and the six rows, built by the module's pure rules. A session the server no longer knows
 * (`401`) ends here (`expire`); any other failed read offers «Δοκιμάστε ξανά».
 */
export function useDoctorProfile(options: { locale: () => SupportedLocale }) {
	const session = getSessionOptional();
	const read = createQuery(() => ({
		...doctorMyProfileQuery(options.locale()),
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answer = $derived({ data: read.data, isError: read.isError, error: read.error });

	const view = $derived.by((): DoctorProfileView => {
		if (answer.data !== undefined) return 'ready';
		return answer.isError ? 'failed' : 'loading';
	});
	const rows = $derived(answer.data ? buildDoctorProfileRows(answer.data, options.locale()) : []);
	const status = $derived(
		answer.data ? buildDoctorProfileStatus(answer.data, rows, options.locale()) : null
	);

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = answer.error;
		if (error === ended || !(error instanceof ApiError) || error.status !== 401) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	return {
		get view() {
			return view;
		},
		get rows() {
			return rows;
		},
		get status() {
			return status;
		},
		retry() {
			void read.refetch();
		}
	};
}

export type DoctorProfile = ReturnType<typeof useDoctorProfile>;
