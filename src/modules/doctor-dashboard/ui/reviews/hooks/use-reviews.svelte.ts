import { untrack } from 'svelte';
import {
	createInfiniteQuery,
	createMutation,
	createQuery,
	useQueryClient
} from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	deleteDoctorReviewReply,
	doctorReviewsListQuery,
	doctorReviewsSummaryQuery,
	keepDoctorReview,
	readDoctorReviewsFailure,
	type DoctorReviewFacts
} from '$modules/doctor-dashboard/api/reviews';
import { DOCTOR_REVIEWS_FIND_PAGES_MAX } from '$modules/doctor-dashboard/config';
import type { DoctorReviewsChoice } from '$modules/doctor-dashboard/lib/paths';
import {
	buildDoctorReviewCards,
	buildDoctorReviewsSummary,
	doctorReviewsFailureText,
	doctorReviewsHeldLabel,
	doctorReviewsUnansweredLabel
} from '$modules/doctor-dashboard/lib/reviews';
import type { DoctorReviewsView } from '../types';

/**
 * Wave 5.2 · screen 84 «Κριτικές» (U-218, U-219, D-W52-91).
 * - Its reads: the published reviews of the choice page after page, the first page of «Χωρίς απάντηση» (its `total` is
 *   the N of the choice), and the summary for the doctor alone (with how many the team still checks). Only what the
 *   server gave is drawn; a summary that could not be read leaves the list standing.
 * - 🔴 D-W52-91: the review an address names (a notification, the row of 68) is looked for page after page, at most
 *   `DOCTOR_REVIEWS_FIND_PAGES_MAX`, and the page goes to it.
 * - 🔴 D-W52-86: «Διαγραφή» of a reply is asked first; done ⇒ the card says it at once, «Η απάντηση διαγράφηκε.», and
 *   the reviews are read again. A refusal says why in the window; a `401` ends the session.
 */
export function useDoctorReviews(options: {
	locale: () => SupportedLocale;
	filter: () => DoctorReviewsChoice;
	reviewId: () => string | null;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const messages = () => ({ locale: options.locale() });

	const list = createInfiniteQuery(() => ({
		...doctorReviewsListQuery(options.filter()),
		enabled: browser
	}));
	const unanswered = createInfiniteQuery(() => ({
		...doctorReviewsListQuery('unanswered'),
		enabled: browser
	}));
	const summary = createQuery(() => ({
		...doctorReviewsSummaryQuery(options.locale()),
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const read = $derived({
		pages: list.data?.pages,
		isError: list.isError,
		hasMore: list.hasNextPage,
		fetchingMore: list.isFetchingNextPage,
		unansweredTotal: unanswered.data?.pages[0]?.total ?? null,
		summary: summary.data,
		summaryKnown: summary.isSuccess || summary.isError,
		errors: [list.error, unanswered.error, summary.error]
	});

	const cards = $derived(buildDoctorReviewCards(read.pages, options.locale()));
	const summaryView = $derived(buildDoctorReviewsSummary(read.summary, options.locale()));
	const held = $derived(doctorReviewsHeldLabel(read.summary?.pendingCount ?? 0, options.locale()));
	const view = $derived.by((): DoctorReviewsView => {
		if (read.pages === undefined) return read.isError ? 'failed' : 'loading';
		// No published review at all: the summary says so, else «Όλες» with nothing in it.
		if (read.summary?.count === 0) return 'none';
		if (options.filter() === 'all' && (read.pages[0]?.total ?? 0) === 0 && cards.length === 0)
			return 'none';
		return 'ready';
	});

	let ended: unknown = null;
	$effect(() => {
		const error = read.errors.find((entry) => entry instanceof ApiError && entry.status === 401);
		if (!error || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	// 🔴 D-W52-91: the review the address names, looked for page after page until it is there or the list ends.
	const sought = $derived(options.reviewId());
	const found = $derived(sought !== null && cards.some((card) => card.id === sought));
	$effect(() => {
		if (sought === null || found || !read.hasMore || read.fetchingMore) return;
		if ((read.pages?.length ?? 0) >= DOCTOR_REVIEWS_FIND_PAGES_MAX) return;
		untrack(() => void list.fetchNextPage());
	});

	// «Διαγραφή» of a reply: the review the window asks about, the deletion's own gate and its refusal.
	let asking = $state<string | null>(null);
	let deleting = $state(false);
	let deleteFailure = $state<string | null>(null);

	const removal = createMutation<DoctorReviewFacts | null, unknown, string>(() => ({
		networkMode: 'always' as const,
		mutationFn: (ratingId) => deleteDoctorReviewReply(ratingId),
		onSettled: () => {
			deleting = false;
		},
		onSuccess: (answer) => {
			if (answer) keepDoctorReview(client, answer);
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.reviews() });
			asking = null;
			toasts?.show({ message: m.doctor_my_review_reply_deleted({}, messages()) });
		},
		onError: (error: unknown) => {
			const reason = readDoctorReviewsFailure(error);
			if (reason === 'session') {
				session?.expire({});
				return;
			}
			if (reason !== 'rate-limited' && reason !== 'unknown') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.reviews() });
			}
			deleteFailure = doctorReviewsFailureText(reason, 'delete', options.locale());
		}
	}));

	return {
		get view() {
			return view;
		},
		get cards() {
			return cards;
		},
		/** The summary as drawn, `null` without one (none published, or its read failed). */
		get summary() {
			return summaryView;
		},
		/** «N νέες κριτικές ελέγχονται …», `null` while the team checks none. */
		get held() {
			return held;
		},
		/** «Χωρίς απάντηση (N)», the server's N. */
		get unansweredLabel() {
			return doctorReviewsUnansweredLabel(read.unansweredTotal, options.locale());
		},
		get hasMore() {
			return read.hasMore;
		},
		get loadingMore() {
			return read.fetchingMore;
		},
		/** The review the address names is on the page (the page goes to it). */
		get found() {
			return found;
		},
		/** The review whose reply the window asks to delete, `null` with none open. */
		get asking() {
			return asking;
		},
		get deleting() {
			return deleting;
		},
		get deleteFailure() {
			return deleteFailure;
		},
		loadMore() {
			if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
		},
		retry() {
			if (list.data && list.hasNextPage) void list.fetchNextPage();
			else void list.refetch();
			if (summary.isError) void summary.refetch();
		},
		/** «Διαγραφή» pressed on a card: the window asks first. */
		ask(ratingId: string) {
			if (deleting) return;
			deleteFailure = null;
			asking = ratingId;
		},
		/** The window closed without a deletion. */
		dismiss() {
			if (deleting) return;
			asking = null;
			deleteFailure = null;
		},
		/** «Διαγραφή», confirmed: ONE request. */
		remove() {
			if (deleting || asking === null) return;
			deleting = true;
			deleteFailure = null;
			removal.mutate(asking);
		}
	};
}

export type DoctorReviewsRead = ReturnType<typeof useDoctorReviews>;
