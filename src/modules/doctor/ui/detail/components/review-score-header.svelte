<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ReviewSummary } from '$shared/ui/molecules/review-summary';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		badgeTitle,
		countLabel,
		description,
		scoreLabel,
		windowed = false,
		linkLabel,
		onLink
	}: {
		/** «Επιλογή ασθενών»: only for a doctor the backend marks (`isPatientsChoice`). */
		badgeTitle?: string;
		countLabel?: string;
		description?: string;
		scoreLabel: string;
		/** U-66.1 Π3: the reviews' window: the larger score, its plain form 48 on its own line. */
		windowed?: boolean;
		/** «Πώς λειτουργούν οι κριτικές» (the window's). */
		linkLabel?: string;
		onLink?: () => void;
	} = $props();
</script>

<!-- 🔴 U-45.2 (app = web, the application's `DoctorDetailReviewScoreHeader`): the score block of the reviews section
     (with its count) and of the reviews window (with the badge's explanation) — the laurels and «Επιλογή ασθενών» (the
     shared `ReviewSummary`) only with a `badgeTitle`, else the plain «★ 4,90 · 184 κριτικές» line. -->
{#if badgeTitle && linkLabel && onLink}
	<ReviewSummary
		score={scoreLabel}
		title={badgeTitle}
		count={countLabel}
		{description}
		scoreSize={windowed ? 'score-window' : 'score'}
		{linkLabel}
		{onLink}
		linkTextClass="text-body-sm font-medium tablet:text-label-md tablet:font-normal"
		testId="doctor-detail-review-score-header"
		testIdPrefix="doctor-detail-review"
	/>
{:else if badgeTitle}
	<ReviewSummary
		score={scoreLabel}
		title={badgeTitle}
		count={countLabel}
		{description}
		scoreSize={windowed ? 'score-window' : 'score'}
		testId="doctor-detail-review-score-header"
		testIdPrefix="doctor-detail-review"
	/>
{:else if windowed}
	<!-- U-66.1 Π3: without the badge: «★ 4,60», 48 on the left, and the link under it. -->
	<div data-testid="doctor-detail-review-score-header" class="flex flex-col items-start gap-2">
		<div class="flex flex-row items-center gap-2 text-display-xl font-semibold text-foreground">
			<Ionicon
				name="star"
				aria-hidden="true"
				data-testid="doctor-detail-review-score-star"
				class="icon-xl text-rating"
			/>
			<span>{scoreLabel}</span>
		</div>
		{#if linkLabel && onLink}
			<TextButton
				label={linkLabel}
				underline
				onclick={onLink}
				textClass="text-body-sm font-medium tablet:text-label-md tablet:font-normal"
			/>
		{/if}
	</div>
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
