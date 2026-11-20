import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	doctorAppointmentReviewQuery,
	doctorReviewQuery,
	keepDoctorReview,
	readDoctorReviewsFailure,
	writeDoctorReviewReply,
	type DoctorReviewFacts
} from '$modules/doctor-dashboard/api/reviews';
import { DOCTOR_REVIEW_REPLY_MAX_LENGTH } from '$modules/doctor-dashboard/config';
import {
	buildDoctorReviewCard,
	doctorReviewReplyMode,
	doctorReviewReplyText,
	doctorReviewsFailureText
} from '$modules/doctor-dashboard/lib/reviews';
import type { DoctorReviewReplyState } from '../types';

const NO_CONTEXT = { visits: [], openReports: [] };

/**
 * Wave 5.2 · screen 84, the reply to ONE review (U-218.1, U-219.1 Ε2 Α, D-W52-86 / 92).
 * - Its reads: the review as the server keeps it NOW (a reply that changed elsewhere is never written over) and the
 *   review of its appointment (the visit's «Το ραντεβού: …»). What the page writes — a NEW reply after none or after a
 *   rejected one (an empty field), else the CHANGE of the one there (its words in the field) — is settled by the FIRST
 *   answer; a read that comes back later never writes over what is typed.
 * - «Αποστολή» is ONE write (`POST` / `PATCH`); empty ⇒ «Γράψτε την απάντησή σας.» and nothing leaves. Done ⇒ the card
 *   says it at once, «Στάλθηκε. …», the reviews are read again, the page closes.
 * - A refusal says why in the page's words and what was typed STAYS; a reply that changed in the meantime reads the
 *   review again and the page writes what it now is. A `401` ends the session.
 */
export function useDoctorReviewReply(options: {
	locale: () => SupportedLocale;
	ratingId: () => string;
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	// The page is made anew for each address (its host keys it): the review never changes under it.
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
		failed: one.isError,
		error: one.error,
		context: around.data,
		errors: [one.error, around.error]
	});

	// Settled ONCE, by the first answer (and again only after a refusal says the reply changed).
	let mode = $state<'new' | 'change' | null>(null);
	let text = $state('');
	$effect(() => {
		const review = read.review;
		if (!review || mode !== null) return;
		untrack(() => {
			mode = doctorReviewReplyMode(review.replyStatus);
			text = mode === 'change' ? (review.reply ?? '') : '';
		});
	});
	// A write found the review gone: the page has nothing left to offer.
	let closed = $state(false);

	const state = $derived.by((): DoctorReviewReplyState => {
		if (closed) return 'gone';
		if (mode !== null) return 'ready';
		if (read.error instanceof ApiError && [403, 404].includes(read.error.status)) return 'gone';
		return read.failed ? 'failed' : 'loading';
	});
	const card = $derived(
		read.review
			? buildDoctorReviewCard(read.review, read.context ?? NO_CONTEXT, options.locale())
			: null
	);

	let ended: unknown = null;
	$effect(() => {
		const error = read.errors.find((entry) => entry instanceof ApiError && entry.status === 401);
		if (!error || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	// The rule speaks only after the first «Αποστολή»; from then on at every change.
	let checked = $state(false);
	const error = $derived(
		checked && doctorReviewReplyText(text) === null
			? m.doctor_my_review_reply_required({}, messages())
			: null
	);
	let failure = $state<string | null>(null);
	// The write's own gate: the library tells of a write that began only a timer later.
	let writing = $state(false);

	/** The review as the server keeps it now: the page writes what it is (a new reply or a change), keeping what is typed. */
	async function settleAgain() {
		try {
			const fresh = await client.fetchQuery({ ...doctorReviewQuery(ratingId), staleTime: 0 });
			mode = doctorReviewReplyMode(fresh.replyStatus);
		} catch {
			// The page stays as it was; its refusal already said why.
		}
	}

	const write = createMutation<
		DoctorReviewFacts | null,
		unknown,
		{ words: string; as: 'new' | 'change' }
	>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ words, as }) => writeDoctorReviewReply(ratingId, words, as),
		onSettled: () => {
			writing = false;
		},
		onSuccess: (review) => {
			if (review) keepDoctorReview(client, review);
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.reviews() });
			toasts?.show({ message: m.doctor_my_review_reply_sent({}, messages()) });
			options.onDone();
		},
		onError: (refusal: unknown) => {
			const reason = readDoctorReviewsFailure(refusal);
			if (reason === 'session') {
				// 🔴 U-84: the session ended under the page; what was typed stays for the same person.
				session?.expire({});
				return;
			}
			if (reason !== 'rate-limited' && reason !== 'unknown') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.reviews() });
			}
			if (reason === 'gone') closed = true;
			if (reason === 'changed') void settleAgain();
			failure = doctorReviewsFailureText(reason, 'reply', options.locale());
		}
	}));

	return {
		get state() {
			return state;
		},
		/** A new reply, or the change of the one there; `null` until the review is read. */
		get mode() {
			return mode;
		},
		/** The review over the field, as its card writes it (with «Το ραντεβού: …» once its visit is read). */
		get card() {
			return card;
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
		/** What is typed, never past the server's 2000 (a paste past it is cut, U-65.6). */
		type(next: string) {
			text = next.slice(0, DOCTOR_REVIEW_REPLY_MAX_LENGTH);
			failure = null;
		},
		/** One press, one write: only words leave (the server checks them again). */
		submit() {
			if (writing || state !== 'ready' || mode === null) return;
			checked = true;
			const words = doctorReviewReplyText(text);
			if (!words) return;
			writing = true;
			failure = null;
			write.mutate({ words, as: mode });
		},
		retry() {
			void one.refetch();
		}
	};
}

export type DoctorReviewReply = ReturnType<typeof useDoctorReviewReply>;
