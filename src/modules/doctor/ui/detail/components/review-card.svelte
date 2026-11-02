<script lang="ts">
	import { ReviewCard, type ReviewCardLayout } from '$shared/ui/molecules/review-card';
	import type { DoctorDetailReviewCardContent } from '$modules/doctor/lib/detail';

	let {
		review,
		layout = 'rail',
		moreLabel,
		onShowMore,
		class: className
	}: {
		review: DoctorDetailReviewCardContent;
		layout?: ReviewCardLayout;
		moreLabel?: string;
		onShowMore?: (reviewId: string) => void;
		class?: string;
	} = $props();
</script>

<!-- One review (the application's `DoctorDetailReviewCard`): `rail` the section's — the comment cut at three lines,
     «Περισσότερα» opens the reviews' window on THIS review; `list` the window's — the whole comment, its aspects. -->
<ReviewCard
	authorName={review.authorName}
	authorInitial={review.authorInitial}
	dateLabel={review.publishedLabel}
	rating={review.stars}
	ratingLabel={review.ratingLabel}
	body={review.body}
	aspects={layout === 'list' ? review.aspectsLabel : undefined}
	{layout}
	{moreLabel}
	onMore={() => onShowMore?.(review.id)}
	testId="doctor-detail-review-card"
	testIds={{
		aspects: `doctor-detail-review-card-aspects-${review.id}`,
		body: `doctor-detail-review-card-body-${review.id}`,
		bodyBlock: `doctor-detail-review-card-body-block-${review.id}`,
		cta: `doctor-detail-review-card-cta-${review.id}`,
		ctaSlot: `doctor-detail-review-card-cta-slot-${review.id}`
	}}
	data-review-id={review.id}
	class={className}
/>
