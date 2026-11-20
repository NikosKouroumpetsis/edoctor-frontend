import {
	httpSessionDelete,
	httpSessionGet,
	httpSessionPatch,
	httpSessionPost
} from '$shared/lib/http';
import {
	mapDoctorReview,
	mapDoctorReviewsPage,
	mapDoctorReviewsSummary,
	toDoctorReviewReplyBody,
	toDoctorReviewReportBody
} from './map';
import type {
	DoctorReviewFacts,
	DoctorReviewReplyView,
	DoctorReviewReportReason,
	DoctorReviewReportView,
	DoctorReviewsFilter,
	DoctorReviewsPageFacts,
	DoctorReviewsPageView,
	DoctorReviewsSummaryFacts,
	DoctorReviewsSummaryView,
	DoctorReviewView
} from './types';

const RATINGS_PATH = '/appointment-rating/ratings';
const SUMMARY_PATH = '/doctor/me/reviews/summary';
const ratingPath = (ratingId: string) => `${RATINGS_PATH}/${encodeURIComponent(ratingId)}`;

/**
 * 🔴 D-W52-84 (U-219.1 Ε1 Α): one page of the session's own doctor's PUBLISHED reviews, newest first (`as=doctor`,
 * `APPROVED`, `no-store`, with the cookies) — «Χωρίς απάντηση» as `replyModerationStatus=NONE` (the server reads a
 * rejected reply as none too), a visit's day, hour and services for each, and the reviews the doctor reported. Nothing
 * in the request names a doctor. `null` for an answer that is no page.
 */
export async function listDoctorReviews(
	input: { filter: DoctorReviewsFilter; limit: number; cursor?: string },
	signal?: AbortSignal
): Promise<DoctorReviewsPageFacts | null> {
	return mapDoctorReviewsPage(
		await httpSessionGet<DoctorReviewsPageView>(RATINGS_PATH, {
			params: {
				as: 'doctor',
				ratingModerationStatus: 'APPROVED',
				...(input.filter === 'unanswered' ? { replyModerationStatus: 'NONE' } : {}),
				limit: input.limit,
				cursor: input.cursor
			},
			signal
		})
	);
}

/**
 * 🔴 D-W52-89 (U-220.1): the published review of ONE appointment of the doctor — the list's own filter
 * (`appointmentId` + `APPROVED` + `limit=1`), no route of its own; its visit and whether it is reported come with it.
 */
export async function getDoctorAppointmentReview(
	appointmentId: string,
	signal?: AbortSignal
): Promise<DoctorReviewsPageFacts | null> {
	return mapDoctorReviewsPage(
		await httpSessionGet<DoctorReviewsPageView>(RATINGS_PATH, {
			params: { as: 'doctor', appointmentId, ratingModerationStatus: 'APPROVED', limit: 1 },
			signal
		})
	);
}

/**
 * D-W52-84: one review by its id, as its doctor reads it — published only (any other answers the one `403` of D-107).
 * `null` for an answer that is no review.
 */
export async function getDoctorReview(
	ratingId: string,
	signal?: AbortSignal
): Promise<DoctorReviewFacts | null> {
	return mapDoctorReview(await httpSessionGet<DoctorReviewView>(ratingPath(ratingId), { signal }));
}

/**
 * 🔴 D-W52-85: the summary for the doctor alone — the same numbers and labels as the public page, also before the doctor
 * shows in the search, and how many new reviews the team still checks. `null` for an answer that is no summary.
 */
export async function getDoctorReviewsSummary(
	locale: string,
	signal?: AbortSignal
): Promise<DoctorReviewsSummaryFacts | null> {
	return mapDoctorReviewsSummary(
		await httpSessionGet<DoctorReviewsSummaryView>(SUMMARY_PATH, {
			params: { lang: locale === 'en' ? 'en' : 'el' },
			signal
		})
	);
}

/**
 * 🔴 D-W52-86 (U-219.1 Ε2 Α): the reply of the doctor — a new one (`POST`, after none or after a rejected one) or its
 * change (`PATCH`, checked again by the team): ONE call. The review as the server now keeps it; `null` for no review.
 */
export async function writeDoctorReviewReply(
	ratingId: string,
	reply: string,
	mode: 'new' | 'change'
): Promise<DoctorReviewFacts | null> {
	const path = `${ratingPath(ratingId)}/reply`;
	const options = { body: toDoctorReviewReplyBody(reply) };
	return mapDoctorReview(
		mode === 'new'
			? await httpSessionPost<DoctorReviewReplyView>(path, options)
			: await httpSessionPatch<DoctorReviewReplyView>(path, options)
	);
}

/** 🔴 D-W52-86: the reply leaves the page (`DELETE`). The review as the server now keeps it; `null` for no review. */
export async function deleteDoctorReviewReply(ratingId: string): Promise<DoctorReviewFacts | null> {
	return mapDoctorReview(
		await httpSessionDelete<DoctorReviewReplyView>(`${ratingPath(ratingId)}/reply`)
	);
}

/**
 * 🔴 D-W52-87 (U-219.1 Ε3 Α): a report of one review to the team — one of the five reasons and, when written, more words.
 * The review stays published while the team looks. Whether the server took it (`201`).
 */
export async function reportDoctorReview(
	ratingId: string,
	reason: DoctorReviewReportReason,
	text: string
): Promise<boolean> {
	const answer = await httpSessionPost<DoctorReviewReportView>(`${ratingPath(ratingId)}/report`, {
		body: toDoctorReviewReportBody(reason, text)
	});
	return typeof answer === 'object' && answer !== null && answer.ratingId === ratingId;
}
