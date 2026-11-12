import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { ApiError } from '$shared/lib/http';
import { getDoctorPublicProfile } from './endpoints';
import { getDoctorMemberProfile } from './load';
import { DoctorProfileNotFoundError, mapDoctorProfile } from './map';
import type { DoctorProfile } from './types';
import { doctorQueryKeys } from './query-keys';

/**
 * 🔴 U-34.4 / U-80.1 Ε6: the profile as a member sees it (the prices), ONE read in the browser, never again by itself
 * (no focus, no reconnect, D-103), gone at a sign-out. The profile's page and the booking read the SAME key.
 */
export function doctorMemberProfileQuery(slug: string, lang: string) {
	return queryOptions({
		queryKey: doctorQueryKeys.memberProfile(slug, lang),
		queryFn: ({ signal }) => getDoctorMemberProfile(slug, lang, signal),
		meta: personalQueryMeta,
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});
}

/**
 * 🔴 D-W4-29 (P-W4 Σ-4 = Α, Σ-5): the doctor of a patient's appointment (screens 50–54), by the id the appointment
 * names — ONE anonymous read per different doctor of the page (the application's `readAppointmentDoctorIds`), never one
 * per row. The answer is public, yet WHICH doctors a person sees is a fact of their health: it lives on a key of its
 * own and goes at a sign-out (`personalQueryMeta`). A doctor nobody may see (`doctor: null`, a 404) is `null`: the card
 * leaves the line out; any other failure is the read's error. Never again by itself (D-103).
 */
export function doctorPublicProfileQuery(doctorId: string, lang: string) {
	return queryOptions({
		queryKey: doctorQueryKeys.publicProfile(doctorId, lang),
		queryFn: async ({ signal }): Promise<DoctorProfile | null> => {
			try {
				const data = await getDoctorPublicProfile(doctorId, lang, { signal });
				return mapDoctorProfile(data, { slug: doctorId, lang });
			} catch (error) {
				if (error instanceof DoctorProfileNotFoundError) return null;
				if (error instanceof ApiError && error.status === 404) return null;
				throw error;
			}
		},
		meta: personalQueryMeta,
		staleTime: 5 * 60_000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});
}
