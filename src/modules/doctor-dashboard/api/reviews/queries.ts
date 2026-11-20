import { infiniteQueryOptions, queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { isFinalDoctorRefusal } from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DOCTOR_REVIEWS_PAGE_LIMIT } from '$modules/doctor-dashboard/config';
import {
	getDoctorAppointmentReview,
	getDoctorReview,
	getDoctorReviewsSummary,
	listDoctorReviews
} from './endpoints';
import type {
	DoctorReviewFacts,
	DoctorReviewsFilter,
	DoctorReviewsPageFacts,
	DoctorReviewsSummaryFacts
} from './types';

/** A refusal (`401` the session, `403` / `404` another doctor's or none) is an answer: asking again changes nothing. */
const retry = (failures: number, error: unknown) => !isFinalDoctorRefusal(error) && failures < 1;

const notAPage = (path: string) => new ApiError('Not a page of reviews', 0, path);

/**
 * 🔴 D-W52-84 · D-W52-91: the doctor's published reviews for one choice, page after page by the server's cursor, newest
 * first — in the browser only, personal (gone at a sign-out), under the reviews' root (a reply or a report reads them
 * again). An answer that is no page is a failed read.
 */
export function doctorReviewsListQuery(filter: DoctorReviewsFilter) {
	return infiniteQueryOptions({
		queryKey: doctorDashboardQueryKeys.reviewList(filter),
		queryFn: async ({ pageParam, signal }): Promise<DoctorReviewsPageFacts> => {
			const page = await listDoctorReviews(
				{ filter, limit: DOCTOR_REVIEWS_PAGE_LIMIT, cursor: pageParam },
				signal
			);
			if (!page) throw notAPage('/appointment-rating/ratings');
			return page;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		staleTime: 30_000,
		retry,
		meta: personalQueryMeta
	});
}

/** 🔴 D-W52-85: the summary for the doctor alone, in the page's language; personal, under the reviews' root. */
export function doctorReviewsSummaryQuery(locale: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.reviewSummary(locale),
		queryFn: async ({ signal }): Promise<DoctorReviewsSummaryFacts> => {
			const summary = await getDoctorReviewsSummary(locale, signal);
			if (!summary) throw new ApiError('Not a summary', 0, '/doctor/me/reviews/summary');
			return summary;
		},
		staleTime: 30_000,
		retry,
		meta: personalQueryMeta
	});
}

/**
 * D-W52-92: ONE review by its id (the pages of a reply and of a report) — as the server keeps it now, so a page never
 * writes over a reply that changed elsewhere. A `403` (D-107) is a review no longer on the doctor's page.
 */
export function doctorReviewQuery(ratingId: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.review(ratingId),
		queryFn: async ({ signal }): Promise<DoctorReviewFacts> => {
			const review = await getDoctorReview(ratingId, signal);
			if (!review) throw notAPage('/appointment-rating/ratings/:id');
			return review;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		retry,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 D-W52-89 (U-220.1): the published review of ONE appointment of the doctor, with its visit and its report — the row
 * of 68, and the lines a reply or a report shows over its words. `null` items: no published review.
 */
export function doctorAppointmentReviewQuery(appointmentId: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.appointmentReview(appointmentId),
		queryFn: async ({ signal }): Promise<DoctorReviewsPageFacts> => {
			const page = await getDoctorAppointmentReview(appointmentId, signal);
			if (!page) throw notAPage('/appointment-rating/ratings');
			return page;
		},
		staleTime: 30_000,
		retry,
		meta: personalQueryMeta
	});
}
