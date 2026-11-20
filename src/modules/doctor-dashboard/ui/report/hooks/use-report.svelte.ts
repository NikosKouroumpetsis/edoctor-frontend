import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	DOCTOR_REVIEW_REPORT_REASONS,
	doctorAppointmentReviewQuery,
	doctorReviewQuery,
	keepDoctorReviewReported,
	readDoctorReviewsFailure,
	reportDoctorReview,
	type DoctorReviewReportReason
} from '$modules/doctor-dashboard/api/reviews';
import { DOCTOR_REVIEW_REPORT_TEXT_MAX_LENGTH } from '$modules/doctor-dashboard/config';
import {
	doctorReviewAuthor,
	doctorReviewReportReasons,
	doctorReviewsFailureText
} from '$modules/doctor-dashboard/lib/reviews';
import type { DoctorReviewReportState } from '../types';

/**
 * Wave 5.2 · screen 84, the report of ONE review (U-219.1 Ε3 Α, D-W52-87 / 92).
 * - Its reads: the review (whose patient the question names) and the review of its appointment (whether it is
 *   already reported: then the page says so in the card's own sentence, and nothing more can be sent).
 * - One of the five reasons, one under the other (U-112), and more words up to 1000 (optional). «Αποστολή αναφοράς»
 *   without a reason ⇒ «Διαλέξτε τι συμβαίνει.» and nothing leaves. Done ⇒ the card says «Τη στείλατε για έλεγχο …» at
 *   once, «Η αναφορά στάλθηκε. …», the reviews are read again, the page closes. The review stays published.
 * - A `409` of an open report is the card's sentence; a refusal says why and what was typed STAYS. A `401` ends the
 *   session.
 */
export function useDoctorReviewReport(options: {
	locale: () => SupportedLocale;
	ratingId: () => string;
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const ratingId = untrack(() => options.ratingId());
	const messages = () => ({ locale: options.locale() });

	const one = createQuery(() => ({ ...doctorReviewQuery(ratingId), enabled: browser }));
	const appointmentId = $derived(one.data?.appointmentId ?? null);
	const around = createQuery(() => ({
		...doctorAppointmentReviewQuery(appointmentId ?? ''),
		enabled: browser && appointmentId !== null
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const read = $derived({
		review: one.data,
		failed: one.isError || around.isError,
		error: one.error,
		context: around.data,
		errors: [one.error, around.error]
	});

	let closed = $state<'gone' | 'reported' | null>(null);
	const state = $derived.by((): DoctorReviewReportState => {
		if (closed) return closed;
		if (read.error instanceof ApiError && [403, 404].includes(read.error.status)) return 'gone';
		if (read.review && read.context) {
			return read.context.openReports.some((report) => report.ratingId === ratingId)
				? 'reported'
				: 'ready';
		}
		return read.failed ? 'failed' : 'loading';
	});
	const patient = $derived(
		read.review ? doctorReviewAuthor(read.review, options.locale()).name : ''
	);
	const reasons = $derived(
		doctorReviewReportReasons(DOCTOR_REVIEW_REPORT_REASONS, options.locale())
	);

	let ended: unknown = null;
	$effect(() => {
		const error = read.errors.find((entry) => entry instanceof ApiError && entry.status === 401);
		if (!error || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	// The reason chosen: one of the five words, `null` for none yet (any other word is none).
	let reason = $state<string | null>(null);
	const chosen = $derived(
		DOCTOR_REVIEW_REPORT_REASONS.find((candidate) => candidate === reason) ?? null
	);
	let text = $state('');
	let checked = $state(false);
	const error = $derived(
		checked && chosen === null ? m.doctor_my_review_report_required({}, messages()) : null
	);
	let failure = $state<string | null>(null);
	let writing = $state(false);

	const write = createMutation<
		boolean,
		unknown,
		{ reason: DoctorReviewReportReason; text: string }
	>(() => ({
		networkMode: 'always' as const,
		mutationFn: (draft) => reportDoctorReview(ratingId, draft.reason, draft.text),
		onSettled: () => {
			writing = false;
		},
		onSuccess: () => {
			keepDoctorReviewReported(client, ratingId, readServerNow());
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.reviews() });
			toasts?.show({ message: m.doctor_my_review_report_sent({}, messages()) });
			options.onDone();
		},
		onError: (refusal: unknown) => {
			const why = readDoctorReviewsFailure(refusal);
			if (why === 'session') {
				session?.expire({});
				return;
			}
			if (why !== 'rate-limited' && why !== 'unknown') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.reviews() });
			}
			if (why === 'reported') {
				closed = 'reported';
				return;
			}
			if (why === 'gone') closed = 'gone';
			failure = doctorReviewsFailureText(why, 'report', options.locale());
		}
	}));

	return {
		get state() {
			return state;
		},
		/** The patient as the public page names them, for the question. */
		get patient() {
			return patient;
		},
		get reasons() {
			return reasons;
		},
		get reason() {
			return chosen;
		},
		get text() {
			return text;
		},
		get error() {
			return error;
		},
		get failure() {
			return failure;
		},
		get writing() {
			return writing;
		},
		/** One of the five reasons (any other word is none). */
		choose(next: string) {
			if (writing) return;
			reason = DOCTOR_REVIEW_REPORT_REASONS.some((candidate) => candidate === next) ? next : null;
			failure = null;
		},
		/** The more words, never past the server's 1000 (a paste past it is cut, U-65.6). */
		type(next: string) {
			text = next.slice(0, DOCTOR_REVIEW_REPORT_TEXT_MAX_LENGTH);
			failure = null;
		},
		/** One press, one report: only with a reason (the server checks it again). */
		submit() {
			if (writing || state !== 'ready') return;
			checked = true;
			if (chosen === null) return;
			writing = true;
			failure = null;
			write.mutate({ reason: chosen, text });
		},
		retry() {
			void one.refetch();
			if (around.isError) void around.refetch();
		}
	};
}

export type DoctorReviewReport = ReturnType<typeof useDoctorReviewReport>;
