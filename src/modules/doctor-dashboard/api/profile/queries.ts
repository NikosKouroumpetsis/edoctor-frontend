import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { readServerNow } from '$shared/lib/server-clock';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	getMyPracticeLicence,
	getMyProfile,
	getMyProfilePreview,
	getMyProfileText
} from './endpoints';
import type {
	DoctorDescriptionReader,
	DoctorMyProfileFacts,
	DoctorPracticeLicenceFacts,
	DoctorProfilePreviewAnswer,
	DoctorProfilePreviewRead,
	DoctorProfileTextFacts
} from './types';

/** A refusal (`401` the session, `403` no licence, `404` no doctor) is an answer: asking again changes nothing. */
const retry = (failures: number, error: unknown) =>
	!(error instanceof ApiError && [401, 403, 404].includes(error.status)) && failures < 1;

/**
 * 🔴 D-W52-17 · U-65.6: «Το προφίλ μου» of the session's own doctor, in the browser only (the cookies live on the API),
 * personal (`personalQueryMeta`: gone at a sign-out). Asked again whenever the page comes back to the front: the team's
 * check, or a change made in another tab, shows without a reload. An answer that is no profile is a failed read.
 */
export function doctorMyProfileQuery(locale: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileOverview(locale),
		queryFn: async ({ signal }): Promise<DoctorMyProfileFacts> => {
			const facts = await getMyProfile(locale, signal);
			if (!facts) throw new ApiError('Not a doctor profile', 0, '/doctor/me/profile');
			return facts;
		},
		refetchOnWindowFocus: 'always',
		retry,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 D-W52-18 (U-224): «Δείτε πώς σας βλέπουν» — the public page's answer for the doctor of the session. `read` is the
 * `doctor` module's reader of that answer, handed in by the screen (a module never imports another: the way the profile's
 * screen hands the search's read to the doctor's page, `similarAreaQuery`); what the cache keeps is its FACTS, never the
 * wire. `null` from it is a page that cannot be drawn (`doctor: null`, as the public profile answers a doctor it does not
 * show). Read anew each time the page opens (a change just saved shows), never again by itself while it is read (the
 * public page's own rule, D-103). Personal: gone at a sign-out.
 */
export function doctorMyProfilePreviewQuery<Profile>(
	locale: string,
	read: (answer: DoctorProfilePreviewAnswer) => Profile | null
) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profilePreview(locale),
		queryFn: async ({ signal }): Promise<DoctorProfilePreviewRead<Profile>> => {
			const answer = await getMyProfilePreview(locale, signal);
			return { profile: read(answer), readAt: readServerNow() };
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 D-W52-47 / D-W52-48 (screen 79, U-207): «Όνομα και περιγραφή» — the Greek name and description of the public page of
 * the session's own doctor, in the browser only, personal, under the profile's root. `read` is the public page's reader
 * of a description, handed in by the screen (a module never imports another, the preview's way); what the cache keeps
 * is its plain paragraphs, never the wire. Asked again whenever the page comes back to the front: what the team wrote
 * shows without a reload. An answer that is no text is a failed read.
 */
export function doctorMyProfileTextQuery(read: DoctorDescriptionReader) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileText(),
		queryFn: async ({ signal }): Promise<DoctorProfileTextFacts> => {
			const facts = await getMyProfileText(read, signal);
			if (!facts) throw new ApiError('Not a profile text', 0, '/doctor/profile/translations/el');
			return facts;
		},
		refetchOnWindowFocus: 'always',
		retry,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 D-W52-59 (screen 80, U-209.2): «Άδεια ασκήσεως» — the number and the day of the practice licence of the session's
 * own doctor, in the browser only, personal, under the profile's root. Only the team changes them: asked again whenever
 * the page comes back to the front, so a correction shows without a reload. An answer that is no base profile is a
 * failed read.
 */
export function doctorMyPracticeLicenceQuery() {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileLicence(),
		queryFn: async ({ signal }): Promise<DoctorPracticeLicenceFacts> => {
			const facts = await getMyPracticeLicence(signal);
			if (!facts) throw new ApiError('Not a base profile', 0, '/doctor/profile/base');
			return facts;
		},
		refetchOnWindowFocus: 'always',
		retry,
		meta: personalQueryMeta
	});
}
