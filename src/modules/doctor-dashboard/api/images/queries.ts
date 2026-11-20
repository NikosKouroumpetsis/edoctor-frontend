import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { getDoctorProfileImages } from './endpoints';
import type { DoctorProfileImageFacts } from './types';

/** A refusal (`401` the session, `403` no licence, `404` no doctor) is an answer: asking again changes nothing. */
const retry = (failures: number, error: unknown) =>
	!(error instanceof ApiError && [401, 403, 404].includes(error.status)) && failures < 1;

/**
 * 🔴 D-W52-36 · U-65.6: the photos of the session's own doctor, in the browser only (the cookies live on the API),
 * personal (`personalQueryMeta`: gone at a sign-out), under the profile's root — so every write of a section reads them
 * again with «Το προφίλ μου». Never asked again by itself while the page is worked on (a drag is not undone by a read
 * that happened to come back); a write reads it. An answer that is no list is a failed read.
 */
export function doctorProfileImagesQuery() {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileImages(),
		queryFn: async ({ signal }): Promise<DoctorProfileImageFacts[]> => {
			const images = await getDoctorProfileImages(signal);
			if (!images) throw new ApiError('Not a list of images', 0, '/doctor/profile/images');
			return images;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry,
		meta: personalQueryMeta
	});
}
