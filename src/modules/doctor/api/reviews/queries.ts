import { queryOptions } from '@tanstack/svelte-query';
import { doctorQueryKeys } from '$modules/doctor/api/profile';
import { getDoctorPublicReviews } from './endpoints';
import { mapDoctorReviews } from './map';

/** The doctor's reviews, by language (the application's `doctorReviewsQueryKeys.list`). */
export const doctorReviewsQueryKeys = {
	list: (doctorSlug: string, lang: string) =>
		[...doctorQueryKeys.all, 'reviews', doctorSlug, lang] as const
};

/**
 * The whole list of reviews, read in the browser when the reviews window opens (D-103: at the press, the window's
 * motion beside it), once per slug and language (TanStack's cache).
 */
export function doctorReviewsQuery(doctorSlug: string, lang: string) {
	return queryOptions({
		queryKey: doctorReviewsQueryKeys.list(doctorSlug, lang),
		queryFn: async ({ signal }) =>
			mapDoctorReviews(await getDoctorPublicReviews(doctorSlug, lang, { signal }))
	});
}
