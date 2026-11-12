<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { RatingDistribution } from '$shared/ui/molecules/rating-distribution';
	import { ReviewCard } from '$shared/ui/molecules/review-card';
	import { ReviewToolbar } from '$shared/ui/molecules/review-toolbar';
	import { SkeletonLines } from '$shared/ui/molecules/skeleton-lines';
	import { StatePanel } from '$shared/ui/molecules/state-panel';
	import { InfoDialog } from '$shared/ui/templates/info-dialog';
	import { MentionChips } from '$shared/ui/molecules/mention-chips';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';
	import type { DoctorProfile } from '$modules/doctor/api/profile';
	import {
		DOCTOR_REVIEWS_SEARCH_MAX_LENGTH,
		isDoctorReviewTopic
	} from '$modules/doctor/api/reviews';
	import type { DoctorReviewTopic } from '$modules/doctor/config/review-topics';
	import {
		buildDoctorReviewHowBlocks,
		buildDoctorReviewHowLinks,
		isDoctorReviewSortId
	} from '$modules/doctor/lib/detail';
	import { DoctorReviewsState } from '../hooks/use-reviews.svelte';
	import type { DoctorReviewLinks } from '../types';
	import { Separator } from '$shared/ui/primitives/separator';
	import { doctorReviewChipGlyphs, doctorReviewTopicGlyphs } from './icons';
	import ReviewScoreHeader from './review-score-header.svelte';

	/** U-66.1 Π9: the next page is asked this far before the end of the list. */
	const NEXT_PAGE_MARGIN = '0px 0px 320px 0px';
	/** U-66.1 Π11: at most this many pages are read to reach a review a link names. */
	const FOCUS_PAGES_LIMIT = 10;
	const SKELETON_CARDS = [0, 1, 2];
	const MORE_SKELETON_CARDS = [0, 1];

	let {
		open,
		doctor,
		locale,
		now,
		focusId,
		linkedMention,
		links,
		onClose
	}: {
		open: boolean;
		doctor: DoctorProfile;
		locale: SupportedLocale;
		now: number;
		/** U-35.6 `focus`: the review the reader pressed «Περισσότερα» on. */
		focusId: string | undefined;
		/** U-66.2: the topic a link names, already checked against the list (U-65.6). */
		linkedMention: DoctorReviewTopic | undefined;
		links: DoctorReviewLinks;
		onClose: () => void;
	} = $props();

	const options = $derived({ locale });
	const reviews = new DoctorReviewsState({
		doctor: () => doctor,
		locale: () => locale,
		now: () => now,
		open: () => open,
		linkedMention: () => linkedMention
	});
	const content = $derived(reviews.content);
	const titleId = useId(undefined, 'doctor-reviews-title');

	let howOpen = $state(false);
	let scroller = $state<HTMLElement | null>(null);
	let sentinel = $state<HTMLElement | null>(null);
	let stuck = $state(false);

	// D-W4-24: the words of «Πώς λειτουργούν οι κριτικές» are the doctor lib's, read here and by screen 54's form.
	const howBlocks = $derived(buildDoctorReviewHowBlocks(locale));
	const howLinks = $derived(
		buildDoctorReviewHowLinks(locale, links).map((link) => ({
			label: link.label,
			href: link.href,
			testId: `doctor-reviews-how-${link.id}`
		}))
	);

	// U-66.1 Π9: the next page as the reader nears the end, 2 breathing cards in its place. A page that leaves the end
	// still in reach asks the next: the observer starts again with every new card.
	$effect(() => {
		const root = scroller;
		const target = sentinel;
		void reviews.cards.length;
		if (!root || !target || !reviews.hasMore || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) reviews.loadMore();
			},
			{ root, rootMargin: NEXT_PAGE_MARGIN }
		);
		observer.observe(target);
		return () => observer.disconnect();
	});

	// The application's `useReviewFocusReveal`: ONE scroll per focus, once its card is in the list; a card further on
	// (U-66.1 Π11) reads the pages up to it, a limited number of them.
	let served: string | undefined;
	let focusPages = 0;
	const focused = $derived(focusId ? reviews.cards.some((card) => card.id === focusId) : false);
	$effect(() => {
		const id = focusId;
		const root = scroller;
		if (!open || !id || !root || served === id) return;
		if (focused) {
			served = id;
			void tick().then(() =>
				root
					.querySelector<HTMLElement>(`[data-review-slot="${CSS.escape(id)}"]`)
					?.scrollIntoView({ block: 'center' })
			);
		} else if (
			// With a topic on, the review may never come: nothing is read to look for it (the application's).
			!reviews.mention &&
			reviews.hasMore &&
			!reviews.loadingMore &&
			reviews.cards.length > 0 &&
			focusPages < FOCUS_PAGES_LIMIT
		) {
			focusPages += 1;
			reviews.loadMore();
		}
	});

	// The component stays through a close (its leave motion): the next opening starts from the top, as a new window.
	$effect(() => {
		if (open) return;
		untrack(() => {
			reviews.reset();
			howOpen = false;
			stuck = false;
			served = undefined;
			focusPages = 0;
		});
	});

	const onSort = (next: string) => {
		if (isDoctorReviewSortId(next)) reviews.sortId = next;
	};
	const onMention = (next: string | null) =>
		reviews.chooseMention(isDoctorReviewTopic(next) ? next : null);
	const mentionChips = $derived(
		(content.mentions?.chips ?? []).map((chip) => ({
			...chip,
			icon: doctorReviewTopicGlyphs[chip.id]
		}))
	);
</script>

{#snippet bandSkeleton()}
	<Skeleton class="h-avatar-2xl w-full rounded-md" />
{/snippet}

<!-- 🔴 U-66 (screen 11, one column from 744, Ε1): below 744 the application's sheet with its large title (Ε3) and the
     grey «×»; from 744 the window of 720 / 664, 800 high at most, the «×» alone over the light top zone (the bar whitens
     as the list scrolls). The score, the bars and the aspects are the server's totals; the list is its pages, sorted
     and searched on the server. Every review and reply is drawn as text (U-65.6). -->
<ModalScreenSurface
	{open}
	shape="sheet"
	tone="card"
	onDismiss={onClose}
	aria-labelledby={titleId}
	data-testid="doctor-detail-modal"
	data-section="reviews"
	class="tablet:h-window-h tablet:max-w-window-reviews-sm laptop:max-w-document-wide"
>
	<div
		data-slot="doctor-reviews-bar"
		class={cn(
			'relative z-10 h-control-lg shrink-0 transition-colors duration-label ease-standard tablet:absolute tablet:inset-x-0 tablet:top-0 tablet:h-bar-top',
			stuck && 'tablet:border-b tablet:border-border/60 tablet:bg-card'
		)}
	>
		<IconButton
			icon="close"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.doctor_window_close({}, options)}
			data-testid="doctor-detail-modal-close"
			onclick={onClose}
			class="absolute top-2 right-4 tablet:top-3"
		/>
	</div>
	<div
		bind:this={scroller}
		onscroll={(event) => (stuck = event.currentTarget.scrollTop > 0)}
		data-testid="doctor-detail-modal-reviews-body"
		aria-busy={reviews.shown === 'loading' || undefined}
		class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-gutter-sm pb-section-lg tablet:px-0 tablet:pb-0"
	>
		<h2
			id={titleId}
			class="pb-section text-display-sm font-semibold text-foreground tablet:sr-only"
		>
			{content.title}
		</h2>
		{#if reviews.shown === 'loading'}
			<span class="sr-only" role="status">{m.doctor_reviews_loading({}, options)}</span>
		{/if}

		{#if reviews.shown === 'empty'}
			<StatePanel
				glyph="chatbubble-ellipses-outline"
				titleAs="h3"
				title={m.doctor_reviews_empty_title({}, options)}
				description={m.doctor_reviews_empty_body({}, options)}
				testId="doctor-detail-modal-reviews-empty"
				class="border-0 tablet:mt-bar-top"
			/>
		{:else if reviews.shown === 'error'}
			<StatePanel
				glyph="alert-circle"
				titleAs="h3"
				title={m.doctor_reviews_failed_title({}, options)}
				description={m.doctor_reviews_failed_body({}, options)}
				actionLabel={m.doctor_error_retry({}, options)}
				onAction={reviews.retry}
				role="alert"
				testId="doctor-detail-modal-reviews-failed"
				actionTestId="doctor-detail-modal-reviews-retry"
				class="border-0 tablet:mt-bar-top"
			/>
		{:else}
			<div
				class="flex flex-col gap-section tablet:gap-section tablet:bg-muted/40 tablet:px-gutter-sm tablet:pt-bar-top tablet:pb-6"
			>
				{#if content.header}
					<ReviewScoreHeader
						scoreLabel={content.header.scoreLabel}
						badgeTitle={content.header.badgeTitle}
						description={content.header.description}
						windowed
						linkLabel={content.howLabel}
						onLink={() => (howOpen = true)}
					/>
				{/if}
				{#if content.ratings}
					<RatingDistribution
						title={content.ratings.title}
						buckets={content.ratings.buckets}
						categories={content.ratings.chips.map((chip) => ({
							id: chip.id,
							title: chip.title,
							score: chip.score,
							icon: doctorReviewChipGlyphs[chip.id]
						}))}
						categoriesLabel={content.ratings.categoriesLabel}
						scrollLabels={{
							previous: m.rail_previous({}, options),
							next: m.rail_next({}, options)
						}}
						bleed="gutter-sm"
						testId="doctor-detail-review-ratings"
						testIdPrefix="doctor-detail-review"
						class="tablet:mx-0 tablet:bg-transparent tablet:px-0 tablet:py-0"
					/>
				{:else if reviews.summaryWaiting}
					{@render bandSkeleton()}
				{/if}
			</div>

			<div class="mt-section tablet:mt-0 tablet:px-gutter-sm tablet:pt-6 tablet:pb-reading-gap">
				{#if content.mentions}
					<MentionChips
						title={content.mentions.title}
						chips={mentionChips}
						value={reviews.mention}
						onChange={onMention}
						clearLabel={content.mentions.clearLabel}
						scrollLabels={{
							previous: m.rail_previous({}, options),
							next: m.rail_next({}, options)
						}}
						bleed="gutter-sm"
						testId="doctor-detail-review-mentions"
					/>
					<Separator spacing="none" class="my-6" />
				{/if}
				<ReviewToolbar
					count={reviews.countLabel}
					sortOptions={content.sortOptions.map((option) => ({
						value: option.id,
						label: option.label
					}))}
					sortValue={reviews.sortId}
					onSortChange={onSort}
					sortLabel={content.sortLabel}
					bind:query={reviews.typed}
					bind:searching={reviews.searching}
					searchLabel={m.doctor_reviews_search({}, options)}
					searchCloseLabel={m.doctor_reviews_search_close({}, options)}
					maxLength={DOCTOR_REVIEWS_SEARCH_MAX_LENGTH}
					testId="doctor-detail-review-sort"
				/>
				{#if reviews.query && reviews.shown === 'ready'}
					<p role="status" class="mt-3 text-body-sm text-muted-foreground">{reviews.countLabel}</p>
				{/if}

				{#if reviews.shown === 'not-found'}
					<p
						role="status"
						data-testid="doctor-detail-modal-reviews-not-found"
						class="pt-reading-gap pb-2 text-center text-body-md wrap-anywhere text-muted-foreground"
					>
						{reviews.query
							? m.doctor_reviews_not_found({ query: reviews.query }, options)
							: m.doctor_reviews_mentions_empty({}, options)}
					</p>
				{:else if reviews.shown === 'loading'}
					<div class="mt-6 flex flex-col gap-section" aria-hidden="true">
						{#each SKELETON_CARDS as card (card)}
							<SkeletonLines
								lines={[
									{ width: 'w-1/3' },
									{ width: 'w-full' },
									{ width: 'w-11/12' },
									{ width: 'w-3/5' }
								]}
							/>
						{/each}
					</div>
				{:else}
					<div
						data-testid="doctor-detail-modal-reviews"
						class="mt-6 flex flex-col gap-section tablet:gap-review-rows"
					>
						{#each reviews.cards as review (review.id)}
							<div
								data-review-slot={review.id}
								data-testid={`doctor-detail-modal-review-slot-${review.id}`}
								data-focused={review.id === focusId || undefined}
								class="scroll-mt-6 rounded-md transition-opacity duration-sheet ease-standard starting:opacity-0"
							>
								<ReviewCard
									authorName={review.authorName}
									authorInitial={review.authorInitial}
									dateLabel={review.relativeLabel}
									rating={review.rating}
									ratingLabel={review.ratingLabel}
									body={review.body}
									reply={review.reply}
									expandLabel={m.doctor_expand({}, options)}
									query={reviews.query ?? ''}
									layout="list"
									testId="doctor-detail-review-card"
									testIds={{ body: `doctor-detail-review-card-body-${review.id}` }}
									data-review-id={review.id}
								/>
							</div>
						{/each}
					</div>
					<div bind:this={sentinel} aria-hidden="true" class="h-px"></div>
					{#if reviews.loadingMore}
						<div
							data-testid="doctor-detail-modal-reviews-more"
							class="mt-section flex flex-col gap-section"
							aria-hidden="true"
						>
							{#each MORE_SKELETON_CARDS as card (card)}
								<SkeletonLines
									lines={[{ width: 'w-1/3' }, { width: 'w-full' }, { width: 'w-3/5' }]}
								/>
							{/each}
						</div>
					{:else if reviews.moreFailed}
						<div class="mt-section flex justify-center">
							<Button
								tone="outline"
								radius="full"
								label={m.doctor_error_retry({}, options)}
								onclick={reviews.loadMore}
								data-testid="doctor-detail-modal-reviews-more-retry"
							/>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</ModalScreenSurface>

<InfoDialog
	bind:open={howOpen}
	title={m.doctor_reviews_how({}, options)}
	blocks={howBlocks}
	links={howLinks}
	closeLabel={m.doctor_window_close({}, options)}
	testId="doctor-reviews-how"
/>
