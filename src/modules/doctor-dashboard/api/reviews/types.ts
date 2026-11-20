import type { ApiRequestBody, ApiResponseData } from '$shared/lib/api-client';

/** The calls of screen 84 as the contract writes them (D-W52-84 … 90, `w52-b8` §10); they stay inside `api/`. */
export type DoctorReviewsPageView = ApiResponseData<'listRatings', 200>;
export type DoctorReviewView = ApiResponseData<'getRating', 200>;
export type DoctorReviewsSummaryView = ApiResponseData<'getDoctorMyReviewsSummary', 200>;
export type DoctorReviewReplyView = ApiResponseData<'replyToRating', 200>;
export type DoctorReviewReportView = ApiResponseData<'reportRating', 201>;
export type DoctorReviewReplyBody = ApiRequestBody<'replyToRating'>;
export type DoctorReviewReportBody = ApiRequestBody<'reportRating'>;

/** The four states of the doctor's reply (U-218.1): none, being checked, published, not published. */
export type DoctorReviewReplyStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

/** The five reasons of a report (D-W52-87), the server's own words. */
export type DoctorReviewReportReason =
	| 'NOT_MY_PATIENT'
	| 'OFFENSIVE'
	| 'PERSONAL_DATA'
	| 'NOT_ABOUT_VISIT'
	| 'OTHER';

/** The six topics of «Οι ασθενείς αναφέρουν» (U-91.2), the server's own words. */
export type DoctorReviewTopic =
	| 'COURTESY'
	| 'EXPLANATION'
	| 'ORGANIZATION'
	| 'CLEANLINESS'
	| 'PATIENCE'
	| 'ACCESS';

/**
 * FACTS of one published review as its doctor reads it (D-W52-84): the server's ids, the patient as the public page
 * names them (a given name and the initial of the surname, U-219.1), the stars (0–5, U-49), the patient's words, the
 * doctor's reply with its state and day, and when it was written. Of the team's notes ONLY the reason a rejected reply
 * was not published (D-W52-86α: the doctor's list alone, `null` in every other state); never the review's note.
 */
export type DoctorReviewFacts = {
	id: string;
	appointmentId: string;
	patientName: string | null;
	patientInitial: string | null;
	stars: number;
	comment: string | null;
	reply: string | null;
	replyAt: string | null;
	replyStatus: DoctorReviewReplyStatus;
	/** 🔴 D-W52-86α: why the team did not publish the reply — only while it is `REJECTED`, else `null`. */
	replyRejectionReason: string | null;
	createdAt: string;
};

/** FACTS of the visit a review names (D-W52-84, U-219.4): its start, the office's IANA zone, its services. */
export type DoctorReviewVisitFacts = {
	appointmentId: string;
	startTime: string;
	timeZone: string;
	serviceTitles: string[];
};

/**
 * One page of the doctor's reviews (D-W52-84 / 87): the reviews, the next page's cursor, the whole set's count, the
 * visits they name and the reviews of the page the doctor reported (since when).
 */
export type DoctorReviewsPageFacts = {
	items: DoctorReviewFacts[];
	nextCursor: string | null;
	total: number;
	visits: DoctorReviewVisitFacts[];
	openReports: { ratingId: string; reportedAt: string }[];
};

/**
 * FACTS of the summary for the doctor alone (D-W52-85): the average on the stars (`null` without a review), the count,
 * how many of each star (5 → 1), the five averages (`null` without them), the topics with their counts, and how many
 * new reviews the team still checks.
 */
export type DoctorReviewsSummaryFacts = {
	count: number;
	average: number | null;
	distribution: { star: 1 | 2 | 3 | 4 | 5; count: number }[];
	aspects: {
		trust: number;
		expertise: number;
		punctuality: number;
		friendliness: number;
		inDepth: number;
	} | null;
	topics: { topic: DoctorReviewTopic; count: number }[];
	pendingCount: number;
};

/** The choice of the list (U-218.1): every published review, or those still without a reply (`NONE`). */
export type DoctorReviewsFilter = 'all' | 'unanswered';

/**
 * Why a write of screen 84 was refused (D-W52-86 / 87, `w52-b8` §10): the session, the rate, a review no longer
 * published or not the doctor's (`gone`: the 409 «not published» and the one 403 of D-107), a reply that changed in the
 * meantime (`changed`: «already exists» / «does not exist»), a report already open (`reported`), words the server would
 * not take (`invalid`), anything else (`unknown`: what was typed stays).
 */
export type DoctorReviewsFailure =
	| 'session'
	| 'rate-limited'
	| 'gone'
	| 'changed'
	| 'reported'
	| 'invalid'
	| 'unknown';
