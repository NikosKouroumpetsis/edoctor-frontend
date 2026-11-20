import { isUuid } from '$shared/lib/ids';
import type {
	DoctorReviewFacts,
	DoctorReviewReplyStatus,
	DoctorReviewReportBody,
	DoctorReviewReportReason,
	DoctorReviewsPageFacts,
	DoctorReviewsSummaryFacts,
	DoctorReviewTopic,
	DoctorReviewVisitFacts
} from './types';

// The contract's words, every one of them; a word the contract adds later reads as none until it is named here.
const REPLY_STATUSES = {
	NONE: true,
	PENDING: true,
	APPROVED: true,
	REJECTED: true
} as const satisfies Record<DoctorReviewReplyStatus, true>;
const TOPICS = {
	COURTESY: true,
	EXPLANATION: true,
	ORGANIZATION: true,
	CLEANLINESS: true,
	PATIENCE: true,
	ACCESS: true
} as const satisfies Record<DoctorReviewTopic, true>;
export const DOCTOR_REVIEW_REPORT_REASONS = [
	'NOT_MY_PATIENT',
	'OFFENSIVE',
	'PERSONAL_DATA',
	'NOT_ABOUT_VISIT',
	'OTHER'
] as const satisfies readonly DoctorReviewReportReason[];

/** The most a page may bring (the server's own cap, `listPageSizeMax`), a visit's services, the topics of a summary. */
const PAGE_CAP = 100;
const SERVICES_CAP = 20;
const TOPICS_CAP = 6;
const CURSOR_CAP = 512;
/** The longest reason of a rejected reply (the server's own `…_REPLY_REJECTION_REASON_MAX_LENGTH`). */
const REASON_CAP = 1000;
const STARS = [5, 4, 3, 2, 1] as const;
// An IANA name (`Europe/Athens`), never a text of another kind.
const ZONE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** The word when it is one of the contract's, else none (a number, a list, another word, `toString`). */
function wordOf<Word extends string>(table: Record<Word, true>, value: unknown): Word | null {
	return typeof value === 'string' && Object.hasOwn(table, value) ? (value as Word) : null;
}

/** A text of the server, trimmed; empty or not a text is none. */
function textOf(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

/** An instant the server wrote (ISO), kept as it came; anything that does not parse is none. */
function instantOf(value: unknown): string | null {
	return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

/** A number of stars 0–5 (U-49), else none. */
function starsOf(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5
		? value
		: null;
}

/** A count: a whole number from 0, else none. */
function countOf(value: unknown): number | null {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * 🔴 U-65.6 · D-W52-84: one review field by field — its ids only in the server's shape (they go into a request's path
 * and an address), the stars on the scale, the reply only with a state the contract names, a reply's words only with
 * a reply (`NONE` has none). 🔴 D-W52-86α: of the team's notes only `replyRejectionReason`, as text, and only for a
 * reply that is `REJECTED`; never `ratingModerationNote` / `replyModerationNote`, never a moderator. Anything else is
 * no review (`null`).
 */
export function mapDoctorReview(view: unknown): DoctorReviewFacts | null {
	if (!isRecord(view)) return null;
	const { id, appointmentId } = view;
	if (typeof id !== 'string' || !isUuid(id)) return null;
	if (typeof appointmentId !== 'string' || !isUuid(appointmentId)) return null;
	const stars = starsOf(view.overallRating);
	const createdAt = instantOf(view.createdAt);
	const replyStatus = wordOf(REPLY_STATUSES, view.replyModerationStatus);
	if (stars === null || createdAt === null || replyStatus === null) return null;
	const reply = replyStatus === 'NONE' ? null : textOf(view.doctorReply);
	return {
		id,
		appointmentId,
		patientName: textOf(view.patientName),
		patientInitial: textOf(view.patientInitial),
		stars,
		comment: textOf(view.comment),
		// A state with no words of a reply is none at all (nothing to show, nothing to change).
		reply,
		replyAt: reply ? instantOf(view.doctorReplyAt) : null,
		replyStatus: reply ? replyStatus : 'NONE',
		replyRejectionReason:
			reply && replyStatus === 'REJECTED'
				? (textOf(view.replyRejectionReason)?.slice(0, REASON_CAP) ?? null)
				: null,
		createdAt
	};
}

/** The visit a review names (U-219.4): only with its ids, its start, an IANA zone; its services' titles as text. */
function mapVisit(view: unknown): DoctorReviewVisitFacts | null {
	if (!isRecord(view)) return null;
	const { appointmentId, officeTimeZone } = view;
	const startTime = instantOf(view.startTime);
	if (typeof appointmentId !== 'string' || !isUuid(appointmentId) || startTime === null)
		return null;
	if (typeof officeTimeZone !== 'string' || !ZONE.test(officeTimeZone)) return null;
	return {
		appointmentId,
		startTime,
		timeZone: officeTimeZone,
		serviceTitles: listOf(view.serviceTitles)
			.slice(0, SERVICES_CAP)
			.flatMap((title) => {
				const text = textOf(title);
				return text ? [text] : [];
			})
	};
}

/**
 * 🔴 U-65.6 · D-W52-84 / 87: one page of the doctor's reviews field by field — ONLY what the server gave: a review out of
 * the contract's shape stays out (the rest of the page stands), each id once, at most the server's own cap; the cursor
 * only as the short text it is; the count as a whole number (the page's count if it says none). `null` for an answer
 * that is no page at all.
 */
export function mapDoctorReviewsPage(view: unknown): DoctorReviewsPageFacts | null {
	if (!isRecord(view) || !Array.isArray(view.items)) return null;
	const seen = new Set<string>();
	const items = view.items.slice(0, PAGE_CAP).flatMap((entry) => {
		const review = mapDoctorReview(entry);
		if (!review || seen.has(review.id)) return [];
		seen.add(review.id);
		return [review];
	});
	const cursor = view.nextCursor;
	return {
		items,
		nextCursor:
			typeof cursor === 'string' && cursor.length > 0 && cursor.length <= CURSOR_CAP
				? cursor
				: null,
		total: countOf(view.total) ?? items.length,
		visits: listOf(view.visits).flatMap((entry) => {
			const visit = mapVisit(entry);
			return visit ? [visit] : [];
		}),
		openReports: listOf(view.openReports).flatMap((entry) => {
			if (!isRecord(entry) || typeof entry.ratingId !== 'string' || !isUuid(entry.ratingId))
				return [];
			const reportedAt = instantOf(entry.reportedAt);
			return reportedAt ? [{ ratingId: entry.ratingId, reportedAt }] : [];
		})
	};
}

/** The five averages on the stars, all of them or none. */
function mapAspects(view: unknown): DoctorReviewsSummaryFacts['aspects'] {
	if (!isRecord(view)) return null;
	const trust = starsOf(view.trustRating);
	const expertise = starsOf(view.expertiseRating);
	const punctuality = starsOf(view.punctualRating);
	const friendliness = starsOf(view.friendlyRating);
	const inDepth = starsOf(view.inDepthRating);
	if (
		trust === null ||
		expertise === null ||
		punctuality === null ||
		friendliness === null ||
		inDepth === null
	)
		return null;
	return { trust, expertise, punctuality, friendliness, inDepth };
}

/**
 * 🔴 D-W52-85 · U-65.6: the summary for the doctor alone field by field — the count and the new ones being checked as
 * whole numbers, the average on the stars (none without one), the five stars 5 → 1 each once (a star the server left
 * out counts 0), the five averages all or none, the topics only of the six the contract names, each once, in the
 * server's order. `null` for an answer that is no summary.
 */
export function mapDoctorReviewsSummary(view: unknown): DoctorReviewsSummaryFacts | null {
	if (!isRecord(view)) return null;
	const count = countOf(view.count);
	const pendingCount = countOf(view.pendingCount);
	if (count === null || pendingCount === null) return null;
	const counted = new Map<number, number>();
	for (const entry of listOf(view.distribution)) {
		if (!isRecord(entry)) continue;
		const star = entry.star;
		const amount = countOf(entry.count);
		if (typeof star === 'number' && STARS.some((one) => one === star) && amount !== null) {
			if (!counted.has(star)) counted.set(star, amount);
		}
	}
	const topics: DoctorReviewsSummaryFacts['topics'] = [];
	for (const entry of listOf(view.topics)) {
		if (!isRecord(entry)) continue;
		const topic = wordOf(TOPICS, entry.topic);
		const amount = countOf(entry.count);
		if (!topic || amount === null || topics.some((one) => one.topic === topic)) continue;
		topics.push({ topic, count: amount });
	}
	return {
		count,
		average: count > 0 ? starsOf(view.average) : null,
		distribution: STARS.map((star) => ({ star, count: counted.get(star) ?? 0 })),
		aspects: count > 0 ? mapAspects(view.aspectAverages) : null,
		topics: topics.slice(0, TOPICS_CAP),
		pendingCount
	};
}

/** 🔴 D-W52-86: the body of a reply — its words alone, as typed (the server cleans and bounds them again). */
export function toDoctorReviewReplyBody(reply: string): { reply: string } {
	return { reply };
}

/**
 * 🔴 D-W52-87: the body of a report — one of the five reasons, and the words only when there are any (the server
 * cleans and bounds them again).
 */
export function toDoctorReviewReportBody(
	reason: DoctorReviewReportReason,
	text: string
): DoctorReviewReportBody {
	const words = text.trim();
	return words ? { reason, text: words } : { reason };
}
