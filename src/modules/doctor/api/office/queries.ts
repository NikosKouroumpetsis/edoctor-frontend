import { queryOptions } from '@tanstack/svelte-query';
import { doctorQueryKeys } from '$modules/doctor/api/profile';
import { getDoctorPublicOffice } from './endpoints';
import { mapDoctorOffice } from './map';

/** One office of one doctor, by the language of its address (the application's `doctorOfficeQueryKeys.detail`). */
export const doctorOfficeQueryKeys = {
	all: [...doctorQueryKeys.all, 'office'] as const,
	detail: (doctorId: string, officeId: string, lang: string) =>
		[...doctorOfficeQueryKeys.all, doctorId, officeId, lang] as const
};

/**
 * 🔴 U-39.1: a non-main office's facts, asked ONCE the page makes it active (TanStack's cache keeps it: switching
 * back asks nothing), never for the main office, whose facts came with the profile (D-103).
 */
export function doctorOfficeQuery(doctorId: string, officeId: string, lang: string) {
	return queryOptions({
		queryKey: doctorOfficeQueryKeys.detail(doctorId, officeId, lang),
		queryFn: async ({ signal }) =>
			mapDoctorOffice(await getDoctorPublicOffice(doctorId, officeId, lang, { signal }), officeId),
		staleTime: Infinity
	});
}
