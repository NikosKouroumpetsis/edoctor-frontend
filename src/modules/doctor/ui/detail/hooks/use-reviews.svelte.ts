import { createInfiniteQuery, createQuery, keepPreviousData } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { useDebouncedValue } from '$shared/lib/debounce';
import { readQueryState } from '$shared/lib/query-state';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import {
	doctorReviewsInfiniteQuery,
	doctorReviewsSummaryQuery,
	normalizeDoctorReviewSearch
} from '$modules/doctor/api/reviews';
import type { DoctorReviewTopic } from '$modules/doctor/config/review-topics';
import {
	buildDoctorReviewListCard,
	buildDoctorReviewsModalContent,
	DEFAULT_DOCTOR_REVIEW_SORT_ID,
	doctorSentenceName,
	doctorReviewsOrderOf,
	reviewCountLabel,
	type DoctorReviewSortId
} from '$modules/doctor/lib/detail';

/** The words are asked after this much quiet in the field (the articles' search). */
export const REVIEWS_SEARCH_DEBOUNCE_MS = 250;

/** What the list shows (U-66.1 Π10). */
export type DoctorReviewsShown = 'loading' | 'error' | 'empty' | 'not-found' | 'ready';

export type DoctorReviewsStateOptions = {
	doctor: () => DoctorProfile;
	locale: () => SupportedLocale;
	now: () => number;
	open: () => boolean;
	/** U-66.2: the topic a link names, already checked against the list (U-65.6). */
	linkedMention: () => DoctorReviewTopic | undefined;
};

/**
 * 🔴 U-66.3: the window's reads, asked only while it is open (D-103: at the press, its motion beside them): ONE infinite
 * query of ten a page per order, words and topic, sorted, searched and filtered on the server, and the totals once. The
 * queries hold the FACTS; the cards are written in the `select` (U-32.1).
 */
export class DoctorReviewsState {
	sortId = $state<DoctorReviewSortId>(DEFAULT_DOCTOR_REVIEW_SORT_ID);
	/** The words in the field (never kept anywhere else, U-65.6). */
	typed = $state('');
	/** The field is open. */
	searching = $state(false);
	/** U-66.2: the reader's press on a topic; `undefined` before any, when a link's topic stands. */
	#pressedMention = $state<DoctorReviewTopic | null | undefined>(undefined);

	#options: DoctorReviewsStateOptions;
	#settled: { readonly current: string };
	#summary;
	#list;

	constructor(options: DoctorReviewsStateOptions) {
		this.#options = options;
		this.#settled = useDebouncedValue(() => this.typed, REVIEWS_SEARCH_DEBOUNCE_MS);
		this.#summary = createQuery(() => ({
			...doctorReviewsSummaryQuery(options.doctor().doctorSlug, options.locale()),
			enabled: browser && options.open()
		}));
		this.#list = createInfiniteQuery(() => {
			const doctor = options.doctor();
			const locale = options.locale();
			const now = options.now();
			return {
				...doctorReviewsInfiniteQuery(doctor.doctorSlug, locale, {
					sort: doctorReviewsOrderOf(this.sortId),
					q: this.query,
					mention: this.mention
				}),
				enabled: browser && options.open(),
				placeholderData: keepPreviousData,
				select: (data) => ({
					total: data.pages[0]?.total ?? null,
					cards: data.pages.flatMap((page) =>
						page.reviews.map((review) =>
							buildDoctorReviewListCard(review, {
								doctorName: doctorSentenceName(doctor.name, locale),
								locale,
								now
							})
						)
					)
				})
			};
		});
	}

	/** The words the list reads: settled and as the server takes them (U-65.6). */
	get query(): string | null {
		return normalizeDoctorReviewSearch(this.#settled.current);
	}

	/**
	 * U-66.2: the ONE topic the list reads. Its chip is the only way to press it off, so a topic with no chip (a link's on
	 * a doctor without it) is ignored once the totals are in, as a topic off the list.
	 */
	get mention(): DoctorReviewTopic | null {
		const chosen =
			this.#pressedMention === undefined
				? (this.#options.linkedMention() ?? null)
				: this.#pressedMention;
		if (!chosen || this.summaryWaiting) return chosen;
		return this.#summary.data?.topics.some(({ topic }) => topic === chosen) ? chosen : null;
	}

	/** A chip's press: a topic, or `null` for a second press and «Καθαρισμός». */
	chooseMention = (topic: DoctorReviewTopic | null) => {
		this.#pressedMention = topic;
	};

	readonly content = $derived.by(() =>
		buildDoctorReviewsModalContent({
			doctor: this.#options.doctor(),
			summary: this.#summary.data,
			locale: this.#options.locale()
		})
	);

	get cards() {
		return this.#list.data?.cards ?? [];
	}

	/** «184 κριτικές»: the matches of the list, else the server's whole count, else the profile's. */
	get countLabel(): string {
		const doctor = this.#options.doctor();
		const count =
			this.#list.data?.total ??
			this.#summary.data?.count ??
			doctor.reviewSummary?.count ??
			doctor.reviewCount;
		return reviewCountLabel(count, this.#options.locale());
	}

	/** The totals are on their way: the band's skeleton (never a band of zeros). */
	get summaryWaiting(): boolean {
		return readQueryState(this.#summary) === 'waiting';
	}

	get shown(): DoctorReviewsShown {
		const state = readQueryState(this.#list);
		const data = this.#list.data;
		if (data && data.cards.length > 0) return 'ready';
		if (data) return this.query || this.mention ? 'not-found' : 'empty';
		return state === 'failed' || state === 'unavailable' ? 'error' : 'loading';
	}

	/** The next page waits. */
	get hasMore(): boolean {
		return this.#list.hasNextPage === true;
	}

	get loadingMore(): boolean {
		return this.#list.isFetchingNextPage;
	}

	/** The next page failed: the cards stay, «Δοκιμάστε ξανά» asks that page again. */
	get moreFailed(): boolean {
		return this.#list.isFetchNextPageError;
	}

	loadMore = () => {
		if (!this.#list.hasNextPage || this.#list.isFetchingNextPage) return;
		void this.#list.fetchNextPage();
	};

	/** A closed window starts anew: the order, the words and the topic are kept nowhere (U-65.6). */
	reset = () => {
		this.sortId = DEFAULT_DOCTOR_REVIEW_SORT_ID;
		this.typed = '';
		this.searching = false;
		this.#pressedMention = undefined;
	};

	/** «Δοκιμάστε ξανά» of the window: only what failed (lesson 7). */
	retry = () => {
		if (this.#list.isError) void this.#list.refetch();
		if (this.#summary.isError) void this.#summary.refetch();
	};
}
