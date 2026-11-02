<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Button } from '$shared/ui/primitives/button';
	import { ScoreChip } from '$shared/ui/primitives/score-chip';
	import type { DoctorDetailReviews } from '$modules/doctor/lib/detail';
	import { doctorReviewChipGlyphs } from './icons';
	import ProfileSection from './profile-section.svelte';
	import ReviewCard from './review-card.svelte';
	import ReviewScoreHeader from './review-score-header.svelte';

	let {
		content,
		showAllHref,
		onOpen
	}: {
		content: DoctorDetailReviews;
		/** `details/reviews`: every review. */
		showAllHref: ResolvedPathname;
		/** Opens the reviews' window, on a review when `focusId` is given (its «Περισσότερα»). */
		onOpen: (focusId: string | undefined, event?: MouseEvent) => void;
	} = $props();
</script>

<!-- 🔴 U-35.7 / U-45.2 (app = web, the application's `ReviewsSection`): the score and the count — the laurels with
     «Επιλογή ασθενών» only for a doctor the backend marks («Πώς λειτουργούν οι κριτικές» stays hidden) — the category
     chips, the cards (a row that swipes on the phone, 2 columns from 744, Airbnb) and «Εμφάνιση όλων των κριτικών».
     A cut comment opens the SAME window on it. -->
<ProfileSection id="reviews" title={content.title}>
	<div class="flex flex-col gap-6">
		<ReviewScoreHeader
			scoreLabel={content.scoreLabel}
			badgeTitle={content.badgeTitle}
			countLabel={content.countLabel}
		/>
		{#if content.chips.length > 0}
			<div
				data-testid="doctor-detail-review-chips"
				class="-mx-gutter-sm scrollbar-none flex flex-row gap-3 overflow-x-auto px-gutter-sm tablet:mx-0 tablet:flex-wrap tablet:overflow-visible tablet:px-0"
			>
				{#each content.chips as chip (chip.id)}
					<ScoreChip
						icon={doctorReviewChipGlyphs[chip.id]}
						label={chip.title}
						value={chip.score}
						class="shrink-0"
					/>
				{/each}
			</div>
		{/if}
		<ul
			data-testid="doctor-detail-review-rail"
			class="-mx-gutter-sm scrollbar-none flex snap-x snap-mandatory scroll-px-gutter-sm flex-row divide-x divide-border/60 overflow-x-auto px-gutter-sm tablet:mx-0 tablet:grid tablet:grid-cols-2 tablet:gap-x-profile-columns tablet:gap-y-review-rows tablet:divide-x-0 tablet:overflow-visible tablet:px-0"
		>
			{#each content.cards as review (review.id)}
				<li class="shrink-0 snap-start px-6 first:pl-0 last:pr-0 tablet:p-0">
					<ReviewCard
						{review}
						moreLabel={content.moreLabel}
						onShowMore={(reviewId) => onOpen(reviewId)}
						class="tablet:min-h-0 tablet:w-full"
					/>
				</li>
			{/each}
		</ul>
		<Button
			tone="muted"
			bordered={false}
			label={content.showAllLabel}
			href={showAllHref}
			onclick={(event: MouseEvent) => onOpen(undefined, event)}
			data-testid="doctor-detail-reviews-show-all"
			class="w-full tablet:w-auto tablet:self-start"
		/>
	</div>
</ProfileSection>
