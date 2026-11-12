import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import type { ValidatorFn } from '$shared/lib/form';
import { formatDecimal } from '$shared/lib/format';
import { clampTextLength } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	OwnReviewFacts,
	RatingAspectId,
	RatingFailureFacts,
	RatingInvitationFacts,
	RatingSubmitBlocker,
	RatingSubmitRequest
} from '$modules/appointments/api/rating';
import { RATING_ASPECTS, RATING_COMMENT_MAX_LENGTH } from '$modules/appointments/config';
import { appointmentDateLabel } from '$modules/appointments/lib/when';

/*
 * Screen 54 «Αξιολόγηση επίσκεψης» and screen 51's «Η κριτική σας» in words and rules (record §10.2, U-138, P-W4 §4.5).
 * 🔴 U-138.6: «αξιολόγηση» is the act (the form, its button, its notice), «κριτική» what is published (the card, the
 * preview, the grade). The press of a star is the shared `StarInput`'s (`toggleStar`, review w4-w0 R1 NIT-2): a value
 * here is 0 (none) or 1–10, one point a half star (U-49).
 */

type Message = (inputs: Record<string, never>, options: { locale: SupportedLocale }) => string;

/** The aspects' names as the profile says them (`doctor_review_chip_*`) and the form's line under each (record §10.2). */
const ASPECT_WORDS = {
	'in-depth': { name: m.doctor_review_chip_in_depth, hint: m.ratings_form_hint_in_depth },
	trust: { name: m.doctor_review_chip_trust, hint: m.ratings_form_hint_trust },
	expertise: { name: m.doctor_review_chip_expertise, hint: m.ratings_form_hint_expertise },
	punctuality: { name: m.doctor_review_chip_punctuality, hint: m.ratings_form_hint_punctuality },
	friendliness: {
		name: m.doctor_review_chip_friendliness,
		hint: m.ratings_form_hint_friendliness
	}
} as const satisfies Record<RatingAspectId, { name: Message; hint: Message }>;

/** The five values of the form, by aspect: 0 (none) or 1–10. */
export type RatingValues = Record<RatingAspectId, number>;

/** One row of the form: the aspect's id, its name and its line. */
export type RatingAspectRow = { id: RatingAspectId; name: string; hint: string };

/** The form's five rows, in the server's order. */
export function ratingAspectRows(locale: SupportedLocale): RatingAspectRow[] {
	return RATING_ASPECTS.map(({ id }) => ({
		id,
		name: ASPECT_WORDS[id].name({}, { locale }),
		hint: ASPECT_WORDS[id].hint({}, { locale })
	}));
}

/** The empty form: every aspect without a value. */
export function emptyRatingValues(): RatingValues {
	return Object.fromEntries(RATING_ASPECTS.map(({ id }) => [id, 0])) as RatingValues;
}

/** One value the server takes (U-65.6): a whole number 1…10. */
const isScore = (value: number) => Number.isInteger(value) && value >= 1 && value <= 10;

/** How many aspects still have no value. */
export function missingAspects(values: RatingValues): number {
	return RATING_ASPECTS.filter(({ id }) => !isScore(values[id])).length;
}

// The server's weighted sum, in ITS order of the five (`RATING_WEIGHTS`, `computeOverall`): the same float steps.
const WEIGHT_SUM = RATING_ASPECTS.reduce((sum, aspect) => sum + aspect.weight, 0);

/**
 * 🔴 «Βαθμός κριτικής» by the server's own formula (backend `rating/Policy.ts` `computeOverall`, then the stars of
 * `toRatingStars`): Σ value × weight ÷ Σ weights to two decimals on the 1–10 scale, then on the 0–5 stars to two
 * decimals. `null` while an aspect is missing. Guarded by `tests/architecture/appointment-rules.test.ts`.
 */
export function gradeOf(values: RatingValues): number | null {
	if (missingAspects(values) > 0) return null;
	const weighted = RATING_ASPECTS.reduce(
		(sum, aspect) => sum + values[aspect.id] * aspect.weight,
		0
	);
	const overall = Number((weighted / WEIGHT_SUM).toFixed(2));
	return Math.round((Math.round(overall * 100) * 5) / 10) / 100;
}

/** «4,5» / «5»: a value of the form (0–10) as stars; `''` for none. */
export function halfStarLabel(value: number, locale: SupportedLocale): string {
	if (!isScore(value)) return '';
	return formatDecimal(value / 2, locale, 1, 0);
}

/** «4,7»: a grade or a review's stars with one decimal. */
export function gradeLabel(stars: number, locale: SupportedLocale): string {
	return formatDecimal(stars, locale, 1, 1);
}

/** What a screen reader hears for a value (D-W4-27, P-W4 Σ-11): «4,5 στα 5», «Χωρίς βαθμό» for none. */
export function starValueText(value: number, locale: SupportedLocale): string {
	return isScore(value)
		? m.ratings_form_star_value({ value: halfStarLabel(value, locale) }, { locale })
		: m.ratings_form_not_rated({}, { locale });
}

/**
 * The grade's line (record §10.2): all five missing «Βγαίνει από τις πέντε πτυχές.», some «Λείπει 1 πτυχή.» / «Λείπουν
 * {count} πτυχές.», none «Το «Σε βάθος» και η «Εξειδίκευση» μετρούν περισσότερο.».
 */
export function gradeLine(values: RatingValues, locale: SupportedLocale): string {
	const options = { locale };
	const missing = missingAspects(values);
	if (missing === RATING_ASPECTS.length) return m.ratings_form_grade_from({}, options);
	if (missing === 1) return m.ratings_form_grade_missing_one({}, options);
	if (missing > 1) return m.ratings_form_grade_missing_other({ count: missing }, options);
	return m.ratings_form_grade_weights({}, options);
}

// _source: backend `rating/Policy.ts` `FORBIDDEN_TEXT_PATTERN` — the server refuses the text with either.
const FORBIDDEN_TEXT = /[<>]/u;

/** The review's text as the form reads it: what travels (trimmed, `null` for none) and why it may not. */
export type RatingComment = { text: string | null; problem: 'brackets' | 'too-long' | null };

/**
 * 🔴 U-65.6: the text trimmed, at most 2000, never with `<` or `>` (the server's rules, said first here). Review w4-w3 R1
 * MINOR-3, D-W4-36.8: the 2000 counted in UTF-16 code units, as the server's Joi counts them (an emoji is two).
 */
export function readRatingComment(value: string): RatingComment {
	const text = value.trim() || null;
	if (text && FORBIDDEN_TEXT.test(text)) return { text, problem: 'brackets' };
	if (text && text.length > RATING_COMMENT_MAX_LENGTH) return { text, problem: 'too-long' };
	return { text, problem: null };
}

/** The words as the field keeps them: 2000 in UTF-16 units (D-W4-36.8), never half an emoji — a paste past it is cut. */
export function clampRatingComment(value: string): string {
	return clampTextLength(value, RATING_COMMENT_MAX_LENGTH);
}

/** «0/2000» under the words, in the units the server counts. */
export function ratingCommentCounter(value: string, locale: SupportedLocale): string {
	return m.booking_note_counter(
		{ count: clampRatingComment(value).length, max: RATING_COMMENT_MAX_LENGTH },
		{ locale }
	);
}

/** The words under the field for a text that may not travel (D-W4-13), `null` when it may. */
export function ratingCommentError(comment: RatingComment, locale: SupportedLocale): string | null {
	return comment.problem === 'brackets' ? m.ratings_form_comment_invalid({}, { locale }) : null;
}

/**
 * The submit's body: the five as the server names them, whole 1–10; the text only when there is some. `null` while an
 * aspect is missing or out of range, or the text may not travel — nothing is sent the server would refuse.
 */
export function toRatingSubmitRequest(
	values: RatingValues,
	comment: string
): RatingSubmitRequest | null {
	if (missingAspects(values) > 0) return null;
	const read = readRatingComment(comment);
	if (read.problem) return null;
	const aspect = Object.fromEntries(
		RATING_ASPECTS.map(({ id, field }) => [field, values[id]])
	) as RatingSubmitRequest['aspect'];
	return read.text ? { aspect, comment: read.text } : { aspect };
}

/**
 * The form of screen 54 as the shared `createForm` keeps it (the contract's «Form state», review w4-arch-frontend L-2):
 * the five aspects by their id and the words, each a field of its own.
 */
export type RatingFormValues = RatingValues & { comment: string };

/** The empty form: no aspect given, no words. */
export function emptyRatingForm(): RatingFormValues {
	return { ...emptyRatingValues(), comment: '' };
}

/** The five aspects of the form's values, for the grade and the body. */
export function ratingValuesOf(values: RatingFormValues): RatingValues {
	return Object.fromEntries(RATING_ASPECTS.map(({ id }) => [id, values[id]])) as RatingValues;
}

/**
 * 🔴 U-65.6: the form's rules, the server's said first here — every aspect a whole 1…10 (`required`), the words never
 * with `<` or `>` (`brackets`) nor past 2000 UTF-16 units (`maxLength`, D-W4-36.8). The same reads as the body's
 * (`isScore`, `readRatingComment`): the form and what travels never disagree.
 */
export function ratingFormRules(): Record<keyof RatingFormValues & string, ValidatorFn[]> {
	const aspect: ValidatorFn = (value) =>
		typeof value === 'number' && isScore(value) ? null : { required: true };
	const COMMENT_PROBLEMS = { brackets: 'brackets', 'too-long': 'maxLength' } as const;
	const comment: ValidatorFn = (value) => {
		const problem = readRatingComment(typeof value === 'string' ? value : '').problem;
		return problem ? { [COMMENT_PROBLEMS[problem]]: true } : null;
	};
	return {
		...(Object.fromEntries(RATING_ASPECTS.map(({ id }) => [id, [aspect]])) as Record<
			RatingAspectId,
			ValidatorFn[]
		>),
		comment: [comment]
	};
}

/**
 * The words of a rule that failed: «Το κείμενο δεν μπορεί να περιέχει τα σύμβολα < και >.» (D-W4-13) — the one
 * `ratingCommentError` says. The bound has no words of its own: the field cuts at it before the form sees more
 * (`clampRatingComment`), and its counter already reads «2000/2000».
 */
export function ratingFormMessages(locale: SupportedLocale): {
	comment: Record<string, string>;
} {
	return {
		comment: {
			brackets: m.ratings_form_comment_invalid({}, { locale }),
			maxLength: m.booking_note_counter(
				{ count: RATING_COMMENT_MAX_LENGTH, max: RATING_COMMENT_MAX_LENGTH },
				{ locale }
			)
		}
	};
}

/** The refusals' words (the application's `ratings.submitBlocker.*`), total over the contract's codes. */
const BLOCKER_WORDS = {
	RATING_DOCTOR_LICENSE_INACTIVE: m.ratings_submit_blocker_rating_doctor_license_inactive,
	RATING_INVITATION_EXPIRED: m.ratings_submit_blocker_rating_invitation_expired,
	RATING_INVITATION_NOT_OPEN: m.ratings_submit_blocker_rating_invitation_not_open,
	RATING_PATIENT_IS_THE_DOCTOR: m.ratings_submit_blocker_rating_patient_is_the_doctor
} as const satisfies Record<RatingSubmitBlocker, Message>;

/** Why the form takes no review (U-138.3): the blocker in words. */
export function ratingBlockerMessage(
	blocker: RatingSubmitBlocker,
	locale: SupportedLocale
): string {
	return BLOCKER_WORDS[blocker]({}, { locale });
}

/** What the invitation lets the screen show (P-W4 §4.5, U-138.3, D-W4-23). */
export type RatingInvitationView =
	| { kind: 'form' }
	| { kind: 'reviewed'; appointmentId: string }
	| { kind: 'blocked'; message: string };

/**
 * 🔴 D-W4-23: an invitation already answered (`SUBMITTED` with its review) replaces the address with its appointment,
 * no refusal shown; one that takes no review now says why (its blocker, else «η πρόσκληση έκλεισε»); else the form.
 */
export function readRatingInvitationView(
	invitation: RatingInvitationFacts,
	locale: SupportedLocale
): RatingInvitationView {
	if (invitation.status === 'SUBMITTED' && invitation.ratingId) {
		return { kind: 'reviewed', appointmentId: invitation.appointmentId };
	}
	if (invitation.canSubmit) return { kind: 'form' };
	return {
		kind: 'blocked',
		message: ratingBlockerMessage(invitation.submitBlocker ?? 'RATING_INVITATION_NOT_OPEN', locale)
	};
}

/** What a refused read or submit means for the screen. */
export type RatingOutcome =
	| { kind: 'not-accessible' }
	| { kind: 'session' }
	| { kind: 'blocked'; message: string }
	| { kind: 'failed'; message: string };

/**
 * A refused read or submit in the screen's terms (P-W4 §4.5): another account's invitation ⇒ «Η πρόσκληση δεν είναι
 * διαθέσιμη»; a blocker ⇒ its words (the form locks); a second review ⇒ «already rated»; the session ⇒ the sign-in;
 * too many writes ⇒ «Πολλές προσπάθειες…»; the rest ⇒ «Η αξιολόγηση δεν υποβλήθηκε…», the values kept.
 */
export function readRatingOutcome(
	failure: RatingFailureFacts,
	locale: SupportedLocale
): RatingOutcome {
	const options = { locale };
	switch (failure.kind) {
		case 'not-accessible':
			return { kind: 'not-accessible' };
		case 'session':
			return { kind: 'session' };
		case 'blocked':
			return {
				kind: 'blocked',
				message: ratingBlockerMessage(failure.blocker ?? 'RATING_INVITATION_NOT_OPEN', locale)
			};
		case 'already-rated':
			return {
				kind: 'blocked',
				message: ratingBlockerMessage('RATING_INVITATION_NOT_OPEN', locale)
			};
		case 'rate-limited':
			return { kind: 'failed', message: m.booking_details_errors_rate_limited({}, options) };
		default:
			return { kind: 'failed', message: m.ratings_form_failed({}, options) };
	}
}

/** «Μπορείτε να αξιολογήσετε την επίσκεψη έως 21 Δεκεμβρίου 2026.» (record §10.2); `null` without the instant. */
export function ratingUntilLine(
	expiresAt: string | null | undefined,
	locale: SupportedLocale
): string | null {
	const date = expiresAt ? appointmentDateLabel(expiresAt, locale, PLATFORM_TIME_ZONE) : '';
	return date ? m.ratings_form_then_until({ date }, { locale }) : null;
}

/**
 * The form's four lines (record §10.2, `appt.js:404`): the check before publishing, the name the review will carry
 * (D-W4-26: the server's, only when it sent one), «δεν αλλάζει», and «έως {expiresAt}» (P-B4 §13.3.4: only with the
 * invitation's instant).
 */
export function ratingThenLines({
	authorName,
	expiresAt,
	locale
}: {
	authorName: string | null;
	expiresAt: string | null;
	locale: SupportedLocale;
}): string[] {
	const options = { locale };
	const until = ratingUntilLine(expiresAt, locale);
	return [
		m.ratings_form_then_moderation({}, options),
		...(authorName ? [m.ratings_form_then_name({ name: authorName }, options)] : []),
		m.ratings_form_then_final({}, options),
		...(until ? [until] : [])
	];
}

/**
 * U-138.4 · «Έτσι θα φαίνεται στο προφίλ του γιατρού»: the review as the doctor's profile will show it — its card of the
 * reviews' list (`ReviewCard layout="list"`), built by the screen from the doctor's own builder (D-W4-25: the day as the
 * profile writes a review of today; D-W4-26: the server's name).
 */
export type RatingPreviewCard = {
	authorName: string;
	authorInitial: string;
	dateLabel: string;
	/** The grade on the 0–5 stars (halves drawn, U-49). */
	rating: number;
	ratingLabel: string;
	body: string;
};

/** «Η κριτική σας»: the card's pill, grade, date, words, aspects, its sentence, its links and the doctor's reply. */
export type OwnReviewCard = {
	title: string;
	status: { label: string; tone: 'warning' | 'success' | 'muted' };
	stars: number | null;
	grade: string | null;
	/** What a screen reader hears for the stars («4,9 στα 5»), `''` without them. */
	starsLabel: string;
	date: string;
	comment: string | null;
	aspects: { id: RatingAspectId; name: string; value: string }[];
	/** The state's one sentence; `null` for a published review the server gave no name for (review w4-w6 R1 NIT-4). */
	say: string | null;
	seeOnProfile: string | null;
	policy: string | null;
	reply: { from: string; date: string; body: string } | null;
};

const MODERATION = {
	PENDING: { label: m.ratings_mine_status_pending, tone: 'warning' },
	APPROVED: { label: m.ratings_mine_status_approved, tone: 'success' },
	REJECTED: { label: m.ratings_mine_status_rejected, tone: 'muted' }
} as const satisfies Record<
	OwnReviewFacts['moderation'],
	{ label: Message; tone: OwnReviewCard['status']['tone'] }
>;

/**
 * 🔴 U-138.5 · «Η κριτική σας» on screen 51 (record §10.2): «Σε έλεγχο» warm, «Δημοσιεύτηκε» green, «Δεν δημοσιεύτηκε»
 * neutral; the stars and «4,7»; the day it was written; its words (text, never markup); the five aspects «4,5»; one
 * sentence of its state (D-W4-12: no promise of an email) — the published one names the author as the profile shows it
 * (`authorName`, the doctor module's rule, composed by the screen); «Δείτε τη στο προφίλ του γιατρού» only published,
 * «Πολιτική κριτικών» only refused; the doctor's reply only when the server gives one (approved).
 */
export function buildOwnReviewCard({
	review,
	authorName,
	doctorName,
	locale
}: {
	review: OwnReviewFacts;
	authorName: string;
	doctorName: string | null;
	locale: SupportedLocale;
}): OwnReviewCard {
	const options = { locale };
	const moderation = MODERATION[review.moderation];
	const say = {
		PENDING: m.ratings_mine_say_pending({}, options),
		// The sentence has no full stop of its own: the initial's ends it («… Ελένη Π.», never «Π..»), as the application's.
		APPROVED: authorName.trim()
			? m.ratings_mine_say_approved({ name: authorName.trim() }, options)
			: null,
		REJECTED: m.ratings_mine_say_rejected({}, options)
	}[review.moderation];
	return {
		title: m.ratings_mine_title({}, options),
		status: { label: moderation.label({}, options), tone: moderation.tone },
		stars: review.overallStars,
		grade: review.overallStars === null ? null : gradeLabel(review.overallStars, locale),
		starsLabel:
			review.overallStars === null
				? ''
				: m.ratings_form_star_value({ value: gradeLabel(review.overallStars, locale) }, options),
		date: review.createdAt
			? appointmentDateLabel(review.createdAt, locale, PLATFORM_TIME_ZONE)
			: '',
		comment: review.comment,
		aspects: review.aspects
			? RATING_ASPECTS.flatMap(({ id }) => {
					const stars = review.aspects?.[id];
					return typeof stars === 'number'
						? [
								{
									id,
									name: ASPECT_WORDS[id].name({}, options),
									value: formatDecimal(stars, locale, 1, 0)
								}
							]
						: [];
				})
			: [],
		say,
		seeOnProfile:
			review.moderation === 'APPROVED' ? m.ratings_mine_see_on_profile({}, options) : null,
		policy: review.moderation === 'REJECTED' ? m.doctor_reviews_how_policy({}, options) : null,
		reply: review.reply
			? {
					from: [m.doctor_reviews_reply_from({}, options), doctorName?.trim()]
						.filter(Boolean)
						.join(' '),
					date: review.reply.at
						? appointmentDateLabel(review.reply.at, locale, PLATFORM_TIME_ZONE)
						: '',
					body: review.reply.body
				}
			: null
	};
}
