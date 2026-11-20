import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { appointmentDateLabel, appointmentDeadlineLabel } from '$shared/lib/appointment-when';
import { formatDecimal } from '$shared/lib/format';
import type {
	DoctorReviewFacts,
	DoctorReviewReplyStatus,
	DoctorReviewReportReason,
	DoctorReviewsFailure,
	DoctorReviewsPageFacts,
	DoctorReviewsSummaryFacts,
	DoctorReviewTopic,
	DoctorReviewVisitFacts
} from '$modules/doctor-dashboard/api/reviews';
import { DOCTOR_REVIEW_REPLY_MAX_LENGTH } from '$modules/doctor-dashboard/config';

type Locale = 'el' | 'en';

const SEPARATOR = ' · ';

/** The patient as the public page names them (U-219.1): «Κατερίνα Λ.» and the letters «ΚΛ»; «Ασθενής» without a name. */
export type DoctorReviewAuthor = { name: string; initials: string };

/**
 * 🔴 D-W52-84 (`mappers.ts:137-164` of the server, the public page's `reviewAuthorName`): the given name and the initial
 * of the surname with its full stop, each degrading alone; the letters of the circle are the two initials (`sw.js`
 * `rvHead`: «ΚΛ»). Nothing of the patient beyond what the public page shows.
 */
export function doctorReviewAuthor(
	review: Pick<DoctorReviewFacts, 'patientName' | 'patientInitial'>,
	locale: Locale
): DoctorReviewAuthor {
	const given = review.patientName?.trim() ?? '';
	const initial = review.patientInitial?.trim().charAt(0).toLocaleUpperCase(locale) ?? '';
	const name = [given, initial ? `${initial}.` : ''].filter(Boolean).join(' ');
	const letters = `${given.charAt(0).toLocaleUpperCase(locale)}${initial}`;
	return {
		name: name || m.doctor_my_reviews_patient({}, { locale }),
		initials: letters || m.doctor_my_reviews_patient({}, { locale }).charAt(0)
	};
}

/**
 * 🔴 U-219.2 · D-W52-84: the visit a review names — «Τετάρτη 11 Νοεμβρίου, 10:00 · Ηλεκτροκαρδιογράφημα»: the day and
 * the hour on the OFFICE's clock (its IANA zone), then its services; `null` without a visit the server named.
 */
export function doctorReviewVisitLine(
	visit: DoctorReviewVisitFacts | undefined,
	locale: Locale
): string | null {
	if (!visit) return null;
	const when = appointmentDeadlineLabel(visit.startTime, locale, visit.timeZone);
	if (!when) return null;
	return [when, visit.serviceTitles.join(', ')].filter(Boolean).join(SEPARATOR);
}

/** «13 Νοεμβρίου 2026»: a day of the review or of its reply, on the Greek calendar (D-118); '' for none. */
export function doctorReviewDay(instant: string | null, locale: Locale): string {
	return instant ? appointmentDateLabel(instant, locale, PLATFORM_TIME_ZONE) : '';
}

/**
 * The four states of the doctor's reply (U-218.1, `sw.js` `rvCard`): none (a button «Απάντηση»), being checked or
 * published (its words, «Αλλαγή · Διαγραφή»), not published (its words muted, «Νέα απάντηση»).
 */
export type DoctorReviewReplyView =
	| { state: 'none' }
	| { state: 'pending'; text: string }
	| { state: 'published'; text: string; day: string }
	| { state: 'rejected'; text: string; reason: string | null; note: string };

/** One card of the list (D-W52-91): every word already written, in the page's language. */
export type DoctorReviewCard = {
	id: string;
	appointmentId: string;
	author: DoctorReviewAuthor;
	day: string;
	stars: number;
	/** The stars as a number of the page's language («5», «4,5»). */
	rating: string;
	/** The stars' name aloud («5 από 5 αστέρια»). */
	starsLabel: string;
	/** The patient's words, `null` for a rating alone («Μόνο βαθμός, χωρίς σχόλιο.»). */
	comment: string | null;
	/** «Το ραντεβού · …», `null` when the server named no visit. */
	visit: string | null;
	/** Reported to the team and still examined (D-W52-87). */
	reported: boolean;
	reply: DoctorReviewReplyView;
};

/** 🔴 U-219.1 Ε2 Α: the reply's state as the card draws it, its words and day only as the server wrote them. */
export function doctorReviewReplyView(
	review: Pick<DoctorReviewFacts, 'reply' | 'replyAt' | 'replyStatus' | 'replyRejectionReason'>,
	locale: Locale
): DoctorReviewReplyView {
	if (!review.reply || review.replyStatus === 'NONE') return { state: 'none' };
	if (review.replyStatus === 'PENDING') return { state: 'pending', text: review.reply };
	if (review.replyStatus === 'REJECTED') {
		const reason = review.replyRejectionReason;
		return {
			state: 'rejected',
			text: review.reply,
			reason,
			note: doctorReviewRejectedNote(reason, locale)
		};
	}
	return { state: 'published', text: review.reply, day: doctorReviewDay(review.replyAt, locale) };
}

// A sentence that already ends: its own stop, a question («;», «?»), an exclamation, an ellipsis, a closing quote.
const ENDED = /[.!?;;…»"')]$/u;

/**
 * 🔴 D-W52-86α (`84-reviews.html`, «Η ομάδα του eDoctor δεν την ενέκρινε: … Μπορείτε να γράψετε νέα.»): the line under
 * a rejected reply — with the team's reason as the server wrote it (text, a full stop added only when it has none), or,
 * for old data without one, the sentence alone.
 */
export function doctorReviewRejectedNote(reason: string | null, locale: Locale): string {
	const words = reason?.trim();
	if (!words) return m.doctor_my_reviews_reply_rejected_note({}, { locale });
	return m.doctor_my_reviews_reply_rejected_reason(
		{ reason: ENDED.test(words) ? words : `${words}.` },
		{ locale }
	);
}

/** One review as its card, with the visit and the reports of the pages it came in. */
export function buildDoctorReviewCard(
	review: DoctorReviewFacts,
	context: Pick<DoctorReviewsPageFacts, 'visits' | 'openReports'>,
	locale: Locale
): DoctorReviewCard {
	const rating = formatDecimal(review.stars, locale, 1, 0);
	return {
		id: review.id,
		appointmentId: review.appointmentId,
		author: doctorReviewAuthor(review, locale),
		day: doctorReviewDay(review.createdAt, locale),
		stars: review.stars,
		rating,
		starsLabel: m.doctor_review_rating({ rating }, { locale }),
		comment: review.comment,
		visit: doctorReviewVisitLine(
			context.visits.find((visit) => visit.appointmentId === review.appointmentId),
			locale
		),
		reported: context.openReports.some((report) => report.ratingId === review.id),
		reply: doctorReviewReplyView(review, locale)
	};
}

/**
 * 🔴 D-W52-84 · D-W52-91: the cards of the pages read, in the server's order — ONLY what it gave: a review a later page
 * repeats keeps its first place; each with the visits and the reports of every page read.
 */
export function buildDoctorReviewCards(
	pages: readonly DoctorReviewsPageFacts[] | undefined,
	locale: Locale
): DoctorReviewCard[] {
	const all = pages ?? [];
	const context = {
		visits: all.flatMap((page) => page.visits),
		openReports: all.flatMap((page) => page.openReports)
	};
	const seen = new Set<string>();
	return all.flatMap((page) =>
		page.items.flatMap((review) => {
			if (seen.has(review.id)) return [];
			seen.add(review.id);
			return [buildDoctorReviewCard(review, context, locale)];
		})
	);
}

/** The five averages in the prototype's order (`sw.js` `RV_ASP`), with the public page's labels (`doctor_review_chip_*`). */
const ASPECTS = [
	['trust', m.doctor_review_chip_trust],
	['expertise', m.doctor_review_chip_expertise],
	['punctuality', m.doctor_review_chip_punctuality],
	['friendliness', m.doctor_review_chip_friendliness],
	['inDepth', m.doctor_review_chip_in_depth]
] as const;

// 🔴 U-91.2: the six topics with the public page's labels (`doctor_reviews_mentions_topic_*`).
const TOPIC_LABELS = {
	COURTESY: m.doctor_reviews_mentions_topic_courtesy,
	EXPLANATION: m.doctor_reviews_mentions_topic_explanation,
	ORGANIZATION: m.doctor_reviews_mentions_topic_organization,
	CLEANLINESS: m.doctor_reviews_mentions_topic_cleanliness,
	PATIENCE: m.doctor_reviews_mentions_topic_patience,
	ACCESS: m.doctor_reviews_mentions_topic_access
} as const satisfies Record<DoctorReviewTopic, unknown>;

/** The summary as the page draws it (U-218.1): every number already written in the page's language. */
export type DoctorReviewsSummaryView = {
	average: string;
	averageStars: number;
	averageLabel: string;
	countLabel: string;
	bars: { star: number; count: number; share: number }[];
	aspects: { id: string; label: string; value: string }[];
	topics: { id: DoctorReviewTopic; label: string; count: number }[];
};

/**
 * 🔴 D-W52-85 (U-218.1): the summary for the doctor alone — the average («4,8») over its stars, «24 κριτικές», how many of
 * each star 5 → 1 with its share of the whole, the five averages with the public page's labels, and the topics in the
 * server's order. `null` without a published review (the page then says it has none).
 */
export function buildDoctorReviewsSummary(
	summary: DoctorReviewsSummaryFacts | undefined,
	locale: Locale
): DoctorReviewsSummaryView | null {
	if (!summary || summary.count === 0 || summary.average === null) return null;
	const options = { locale };
	const total = summary.distribution.reduce((sum, bucket) => sum + bucket.count, 0);
	const average = formatDecimal(summary.average, locale, 1, 1);
	const aspects = summary.aspects;
	return {
		average,
		averageStars: Math.round(summary.average * 2) / 2,
		averageLabel: m.doctor_review_rating({ rating: average }, options),
		countLabel:
			summary.count === 1
				? m.doctor_reviews_count_one({}, options)
				: m.doctor_reviews_count_other({ count: formatDecimal(summary.count, locale, 0) }, options),
		bars: summary.distribution.map((bucket) => ({
			star: bucket.star,
			count: bucket.count,
			share: total > 0 ? bucket.count / total : 0
		})),
		aspects: aspects
			? ASPECTS.map(([id, label]) => ({
					id,
					label: label({}, options),
					value: formatDecimal(aspects[id], locale, 1, 1)
				}))
			: [],
		topics: summary.topics.map(({ topic, count }) => ({
			id: topic,
			label: TOPIC_LABELS[topic]({}, options),
			count
		}))
	};
}

/**
 * 🔴 U-219.1 Ε1 Α (`pendingCount`): «1 νέα κριτική ελέγχεται …» / «N νέες κριτικές ελέγχονται …»; `null` while the team
 * checks none.
 */
export function doctorReviewsHeldLabel(pendingCount: number, locale: Locale): string | null {
	if (!Number.isInteger(pendingCount) || pendingCount <= 0) return null;
	return pendingCount === 1
		? m.doctor_my_reviews_held_one({}, { locale })
		: m.doctor_my_reviews_held_other({ count: pendingCount }, { locale });
}

/** «Χωρίς απάντηση (N)»: the count of the server (`total` of `NONE`), never one of the page. */
export function doctorReviewsUnansweredLabel(total: number | null, locale: Locale): string {
	return m.doctor_my_reviews_filter_unanswered(
		{ count: total === null ? '…' : formatDecimal(total, locale, 0) },
		{ locale }
	);
}

/**
 * 🔴 D-W52-86 (U-219.1 Ε2 Α): what the page of a reply writes — a NEW one after none or after one the team did not
 * publish (`POST`, an empty field), else the CHANGE of the one there (`PATCH`, its words in the field).
 */
export function doctorReviewReplyMode(status: DoctorReviewReplyStatus): 'new' | 'change' {
	return status === 'PENDING' || status === 'APPROVED' ? 'change' : 'new';
}

/**
 * 🔴 D-W52-86 · U-65.6: the words a reply sends — trimmed; `null` for none (only spaces) or past the server's 2000
 * (never cut: what the doctor typed is never changed behind them).
 */
export function doctorReviewReplyText(typed: string): string | null {
	const text = typed.trim();
	if (!text || text.length > DOCTOR_REVIEW_REPLY_MAX_LENGTH) return null;
	return text;
}

/** The five reasons of a report (D-W52-87, `sw.js` `RV_WHY`), one under the other (U-112). */
const REASON_LABELS = {
	NOT_MY_PATIENT: m.doctor_my_review_report_reason_not_my_patient,
	OFFENSIVE: m.doctor_my_review_report_reason_offensive,
	PERSONAL_DATA: m.doctor_my_review_report_reason_personal_data,
	NOT_ABOUT_VISIT: m.doctor_my_review_report_reason_not_about_visit,
	OTHER: m.doctor_my_review_report_reason_other
} as const satisfies Record<DoctorReviewReportReason, unknown>;

/** 🔴 D-W52-87 · U-112: the five reasons as rows, in the page's order. */
export function doctorReviewReportReasons(
	reasons: readonly DoctorReviewReportReason[],
	locale: Locale
): { value: DoctorReviewReportReason; label: string }[] {
	return reasons.map((reason) => ({ value: reason, label: REASON_LABELS[reason]({}, { locale }) }));
}

/**
 * 🔴 D-W52-86 / 87: a refusal in the page's words — the rate, a review no longer on the doctor's page, a reply that
 * changed in the meantime, words the server would not take (a reply's or a report's), anything else the connection.
 * A report already open is said by the card's own sentence (`doctor_my_reviews_reported`).
 */
export function doctorReviewsFailureText(
	failure: Exclude<DoctorReviewsFailure, 'session'>,
	act: 'reply' | 'report' | 'delete',
	locale: Locale
): string {
	const options = { locale };
	switch (failure) {
		case 'rate-limited':
			return m.doctor_reason_rate_limited({}, options);
		case 'gone':
			return m.doctor_my_review_gone({}, options);
		case 'changed':
			return m.doctor_my_review_changed({}, options);
		case 'reported':
			return m.doctor_my_reviews_reported({}, options);
		case 'invalid':
			return act === 'report'
				? m.doctor_my_review_report_invalid({}, options)
				: m.doctor_my_review_reply_invalid({}, options);
		case 'unknown':
			return act === 'delete'
				? m.doctor_photos_delete_failed({}, options)
				: m.doctor_my_review_failed({}, options);
	}
}
