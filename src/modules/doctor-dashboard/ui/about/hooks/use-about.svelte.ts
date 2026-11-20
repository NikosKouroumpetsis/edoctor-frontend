import { untrack } from 'svelte';
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import {
	doctorMyProfileQuery,
	doctorMyProfileTextQuery,
	type DoctorDescriptionReader
} from '$modules/doctor-dashboard/api/profile';
import type { DoctorAboutView } from '../types';

/**
 * Wave 5.2 · screen 79 «Όνομα και περιγραφή» (U-207, D-W52-47 … 49): the page READS and writes nothing.
 * - Its own read: the Greek text of the public page of the session's doctor (`GET /doctor/profile/translations/el`) —
 *   the name and the description as the paragraphs a patient reads; again whenever the page comes back to the front.
 * - `nameLocked` of «Το προφίλ μου» (`GET /doctor/me/profile`, the list's own read, looked at from here: never asked
 *   again for this page's sake): the words under the name are written only once the server says the first licence
 *   locked it.
 * A session the server no longer knows (`401`) ends here; any other failed read offers «Δοκιμάστε ξανά».
 */
export function useDoctorAbout(options: {
	locale: () => SupportedLocale;
	read: () => DoctorDescriptionReader;
}) {
	const session = getSessionOptional();
	const text = createQuery(() => ({
		...doctorMyProfileTextQuery(options.read()),
		enabled: browser
	}));
	// The list's own read: this page only looks at it — it asks when nobody has yet (the page opened alone), and never
	// a second time just for having been opened beside a list that already holds the answer.
	const overview = createQuery(() => ({
		...doctorMyProfileQuery(options.locale()),
		refetchOnMount: false,
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answer = $derived({ data: text.data, isError: text.isError, error: text.error });
	const about = $derived(overview.data?.sections.about ?? null);

	const view = $derived.by((): DoctorAboutView => {
		if (answer.data !== undefined) return 'ready';
		return answer.isError ? 'failed' : 'loading';
	});

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
		/** The public page's Greek name; the name «Το προφίλ μου» reads while the page has no Greek text of its own. */
		get fullName() {
			return answer.data?.fullName ?? about?.fullName ?? null;
		},
		/** The description as the patients read it; none ⇒ «Δεν έχει γραφτεί ακόμη.». */
		get paragraphs() {
			return answer.data?.paragraphs ?? [];
		},
		get nameLocked() {
			return about?.nameLocked === true;
		},
		retry() {
			void text.refetch();
		}
	};
}

export type DoctorAbout = ReturnType<typeof useDoctorAbout>;
