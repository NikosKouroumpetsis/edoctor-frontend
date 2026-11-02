<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import type { QueryReadState } from '$shared/lib/query-state';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { RatingDistribution } from '$shared/ui/molecules/rating-distribution';
	import { Select } from '$shared/ui/molecules/select';
	import { SkeletonLines } from '$shared/ui/molecules/skeleton-lines';
	import {
		DEFAULT_DOCTOR_REVIEW_SORT_ID,
		isDoctorReviewSortId,
		sortDoctorReviewCards,
		type DoctorReviewSortId,
		type DoctorReviewsModalContent
	} from '$modules/doctor/lib/detail';
	import { doctorReviewChipGlyphs } from './icons';
	import ReviewCard from './review-card.svelte';
	import ReviewScoreHeader from './review-score-header.svelte';

	let {
		content,
		readState,
		focusId,
		locale,
		onRetry
	}: {
		/** `null` until the list answers (or for a doctor without reviews). */
		content: DoctorReviewsModalContent | null;
		readState: QueryReadState;
		/** U-35.6 `focus`: the review the reader pressed «Περισσότερα» on — revealed once the list is in. */
		focusId: string | undefined;
		locale: SupportedLocale;
		onRetry: () => void;
	} = $props();

	let sortId = $state<DoctorReviewSortId>(DEFAULT_DOCTOR_REVIEW_SORT_ID);
	let list = $state<HTMLElement | null>(null);
	let served: string | undefined;
	const cards = $derived(content ? sortDoctorReviewCards(content.cards, sortId) : []);

	// The application's `useReviewFocusReveal`: ONE scroll per focus, once its card is in the list.
	$effect(() => {
		const id = focusId;
		const node = list;
		if (!id || !node || served === id || cards.length === 0) return;
		served = id;
		void tick().then(() =>
			node
				.querySelector<HTMLElement>(`[data-review-slot="${CSS.escape(id)}"]`)
				?.scrollIntoView({ block: 'center' })
		);
	});
</script>

<!-- `details/reviews` (the application's `DoctorReviewsModalBody`), Airbnb's window from 950: on the left (sticky) the
     score (U-45.2: «Επιλογή ασθενών» and its explanation only for a doctor the backend marks) and the spread 5…1
     with the aspects; on the right the count, the
     order and every review. A failed read says so with «Δοκιμάστε ξανά» (lesson 7: only the list again). -->
<div
	data-testid="doctor-detail-modal-reviews-body"
	class="flex flex-col gap-6 split:grid split:grid-cols-12 split:items-start split:gap-x-section-lg"
>
	<div class="flex flex-col gap-6 split:sticky split:top-0 split:col-span-5">
		{#if content?.header}
			<ReviewScoreHeader
				scoreLabel={content.header.scoreLabel}
				badgeTitle={content.header.badgeTitle}
				description={content.header.description}
			/>
		{/if}
		{#if content}
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
				testId="doctor-detail-review-ratings"
				testIdPrefix="doctor-detail-review"
			/>
		{/if}
	</div>
	<div class="flex min-w-0 flex-col gap-6 split:col-span-7">
		{#if content}
			<div
				data-testid="doctor-detail-review-sort"
				class="flex flex-row items-center justify-between gap-3"
			>
				<p class="text-title-sm font-semibold text-foreground">{content.countLabel}</p>
				<Select
					variant="pill"
					options={content.sortOptions.map((option) => ({ label: option.label, value: option.id }))}
					value={sortId}
					onChange={(next) => {
						if (isDoctorReviewSortId(next)) sortId = next;
					}}
					placeholder={content.sortLabel}
					aria-label={content.sortLabel}
					data-testid="doctor-detail-review-sort-select"
				/>
			</div>
			<div bind:this={list} data-testid="doctor-detail-modal-reviews" class="flex flex-col gap-4">
				{#each cards as review (review.id)}
					<div
						data-review-slot={review.id}
						data-testid={`doctor-detail-modal-review-slot-${review.id}`}
						data-focused={review.id === focusId || undefined}
						class={cn(
							'scroll-mt-6 rounded-md',
							review.id === focusId && 'ring-2 ring-primary/40 ring-offset-4 ring-offset-background'
						)}
					>
						<ReviewCard {review} layout="list" />
					</div>
				{/each}
			</div>
		{:else if readState === 'waiting'}
			<div data-testid="doctor-detail-modal-loading" class="flex flex-col gap-6" aria-busy="true">
				{#each [0, 1] as group (group)}
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
		{:else if readState === 'failed' || readState === 'unavailable'}
			<InlineNotice
				variant="danger"
				message={m.doctor_reviews_failed({}, { locale })}
				actionLabel={m.doctor_error_retry({}, { locale })}
				onAction={onRetry}
				testId="doctor-detail-modal-reviews-failed"
			/>
		{:else}
			<!-- NIT-3 of r1: the list answered empty (a doctor without reviews) — one line, never an empty window. -->
			<p data-testid="doctor-detail-modal-reviews-empty" class="text-body-md text-muted-foreground">
				{m.doctor_reviews_empty({}, { locale })}
			</p>
		{/if}
	</div>
</div>
