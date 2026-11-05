import { infiniteQueryOptions, queryOptions } from '@tanstack/svelte-query';
import { doctorQueryKeys } from '$modules/doctor/api/profile';
import type { DoctorReviewTopic } from '$modules/doctor/config/review-topics';
import {
	getDoctorPublicReviews,
	getDoctorPublicReviewsSummary,
	type DoctorReviewsOrder
} from './endpoints';
import { mapDoctorReviews, mapDoctorReviewsSummary, type DoctorReviewsPage } from './map';

/** U-66.3: ten at a time; the next ones as the reader nears the end. */
export const DOCTOR_REVIEWS_PAGE_LIMIT = 10;

/** 🔴 U-65.6: what the search takes, as the articles' (the server checks the same). */
export const DOCTOR_REVIEWS_SEARCH_MAX_LENGTH = 100;
export const DOCTOR_REVIEWS_SEARCH_MAX_WORDS = 8;

/** The search as it is sent: no control characters, trimmed, at most 100 characters and 8 words, `null` when empty. */
export function normalizeDoctorReviewSearch(value: string | null | undefined): string | null {
	const words = (value ?? '')
		.replace(/\p{Cc}/gu, ' ')
		.slice(0, DOCTOR_REVIEWS_SEARCH_MAX_LENGTH)
		.trim()
		.split(/\s+/u)
		.filter(Boolean)
		.slice(0, DOCTOR_REVIEWS_SEARCH_MAX_WORDS);
	return words.length > 0 ? words.join(' ') : null;
}

/** What one list of the window reads: the order, the words and the topic, each with its own cache entry. */
export type DoctorReviewsListScope = {
	sort: DoctorReviewsOrder;
	q: string | null;
	mention: DoctorReviewTopic | null;
};

export const doctorReviewsQueryKeys = {
	list: (doctorSlug: string, lang: string, scope: DoctorReviewsListScope) =>
		[
			...doctorQueryKeys.all,
			'reviews',
			doctorSlug,
			lang,
			scope.sort,
			scope.q ?? '',
			scope.mention ?? ''
		] as const,
	summary: (doctorSlug: string, lang: string) =>
		[...doctorQueryKeys.all, 'reviews-summary', doctorSlug, lang] as const
};

const EMPTY_PAGE: DoctorReviewsPage = { reviews: [], nextCursor: null, total: null };

/** The window's list as an INFINITE (cursor) read, sorted, searched and filtered on the server (U-66.3, U-66.2). */
export function doctorReviewsInfiniteQuery(
	doctorSlug: string,
	lang: string,
	scope: DoctorReviewsListScope
) {
	return infiniteQueryOptions({
		queryKey: doctorReviewsQueryKeys.list(doctorSlug, lang, scope),
		queryFn: async ({ pageParam, signal }) =>
			mapDoctorReviews(
				await getDoctorPublicReviews(
					doctorSlug,
					lang,
					{
						limit: DOCTOR_REVIEWS_PAGE_LIMIT,
						sort: scope.sort,
						...(pageParam ? { cursor: pageParam } : {}),
						...(scope.q ? { q: scope.q } : {}),
						...(scope.mention ? { mention: scope.mention } : {})
					},
					{ signal }
				)
			) ?? EMPTY_PAGE,
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
	});
}

/** The window's totals, read once per doctor and language when it opens (D-103: at the press). */
export function doctorReviewsSummaryQuery(doctorSlug: string, lang: string) {
	return queryOptions({
		queryKey: doctorReviewsQueryKeys.summary(doctorSlug, lang),
		queryFn: async ({ signal }) =>
			mapDoctorReviewsSummary(await getDoctorPublicReviewsSummary(doctorSlug, lang, { signal })),
		staleTime: 60_000
	});
}
