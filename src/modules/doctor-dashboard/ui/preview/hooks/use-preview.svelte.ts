import { untrack } from 'svelte';
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import {
	doctorMyProfilePreviewQuery,
	doctorMyProfileQuery,
	type DoctorProfilePreviewAnswer
} from '$modules/doctor-dashboard/api/profile';
import { buildDoctorProfilePreviewNote } from '$modules/doctor-dashboard/lib/profile';
import type { DoctorProfilePreviewView } from '../types';

/**
 * Wave 5.2 · «Δείτε πώς σας βλέπουν» (D-W52-18, D-W52-26): the page's two reads, both of the session's own doctor and in
 * the browser only — the public page's answer for its owner (read by the screen's reader, once per opening) and «Το
 * προφίλ μου», for the band's line alone (whether the search shows the doctor; the band says nothing of it until it is
 * known; 🔴 D-W52-26α: a licence that ended has its own line). A session the server no longer knows (`401`) ends here;
 * any other failed read offers «Δοκιμάστε ξανά».
 */
export function useDoctorProfilePreview<Profile>(options: {
	locale: () => SupportedLocale;
	read: (answer: DoctorProfilePreviewAnswer) => Profile | null;
}) {
	const session = getSessionOptional();
	const page = createQuery(() => ({
		...doctorMyProfilePreviewQuery(options.locale(), options.read),
		enabled: browser
	}));
	const overview = createQuery(() => ({
		...doctorMyProfileQuery(options.locale()),
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answer = $derived({ data: page.data, isError: page.isError, error: page.error });
	const standing = $derived({ data: overview.data, error: overview.error });

	const view = $derived.by((): DoctorProfilePreviewView => {
		if (answer.data !== undefined) return answer.data.profile === null ? 'missing' : 'ready';
		return answer.isError ? 'failed' : 'loading';
	});
	const note = $derived(
		buildDoctorProfilePreviewNote(standing.data?.visibility ?? null, options.locale())
	);

	// One refusal ends the session once, whichever read met it first.
	let ended = false;
	$effect(() => {
		const refused = [answer.error, standing.error].some(
			(error) => error instanceof ApiError && error.status === 401
		);
		if (!refused || ended) return;
		ended = true;
		untrack(() => session?.expire({}));
	});

	return {
		get view() {
			return view;
		},
		/** The facts read and the server's «now» of the read; only while `view` is `ready`. */
		get read() {
			const data = answer.data;
			return data && data.profile !== null ? { profile: data.profile, readAt: data.readAt } : null;
		},
		/** The band's second line, `null` while it is not known whether the search shows the doctor. */
		get note() {
			return note;
		},
		retry() {
			void page.refetch();
		}
	};
}
