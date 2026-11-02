<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ReviewSummary } from '$shared/ui/molecules/review-summary';

	let {
		badgeTitle,
		countLabel,
		description,
		scoreLabel
	}: {
		/** «Επιλογή ασθενών»: only for a doctor the backend marks (`isPatientsChoice`). */
		badgeTitle?: string;
		countLabel?: string;
		description?: string;
		scoreLabel: string;
	} = $props();
</script>

<!-- 🔴 U-45.2 (app = web, the application's `DoctorDetailReviewScoreHeader`): the score block of the reviews section
     (with its count) and of the reviews window (with the badge's explanation) — the laurels and «Επιλογή ασθενών» (the
     shared `ReviewSummary`) only with a `badgeTitle`, else the plain «★ 4,90 · 184 κριτικές» line. -->
{#if badgeTitle}
	<ReviewSummary
		score={scoreLabel}
		title={badgeTitle}
		count={countLabel}
		{description}
		testId="doctor-detail-review-score-header"
		testIdPrefix="doctor-detail-review"
	/>
{:else}
	<div
		data-testid="doctor-detail-review-score-header"
		class="flex flex-row flex-wrap items-center gap-2 text-heading-sm font-semibold text-foreground"
	>
		<Ionicon
			name="star"
			aria-hidden="true"
			data-testid="doctor-detail-review-score-star"
			class="icon-md text-rating"
		/>
		<span>{scoreLabel}</span>
		{#if countLabel}
			<span aria-hidden="true">·</span>
			<span data-testid="doctor-detail-review-count">{countLabel}</span>
		{/if}
	</div>
{/if}
