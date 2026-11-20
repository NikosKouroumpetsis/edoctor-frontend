<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import DoctorReviewReply from '$modules/doctor-dashboard/ui/reply';
	import DoctorReviewReport from '$modules/doctor-dashboard/ui/report';
	import DoctorReviews from '$modules/doctor-dashboard/ui/reviews';
	import { useDoctorReviewsScreen } from '../hooks';
	import type { DoctorReviewsScreenProps } from '../types';

	let { data }: DoctorReviewsScreenProps = $props();

	const screen = useDoctorReviewsScreen(() => data);
	const options = $derived({ locale: screen.locale });
	const title = $derived(
		screen.address.view === 'reply'
			? m.doctor_my_reviews_reply({}, options)
			: screen.address.view === 'report'
				? m.doctor_my_review_report_title({}, options)
				: m.doctor_my_reviews_title({}, options)
	);
</script>

<svelte:head>
	<title>{title} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Wave 5.2 · screen 84 «Κριτικές» (step 8, D-W52-91 / 92): the doctor's published reviews inside the doctor's frame
     («Μενού» the current tab), one column in the middle (U-215) — or what a review opened: its reply or its report, each
     a page of its own in the list's place (U-102), alone in the middle from 744 and over the tabs below it. The screen
     composes the slices, one per address (`#key`), each starting its own state as a route of its own would. -->
{#if screen.address.view === 'list'}
	<DoctorReviews
		locale={screen.locale}
		filter={screen.address.filter}
		reviewId={screen.address.reviewId}
		links={screen.links}
	/>
{:else}
	<main data-testid="doctor-review-page" class="w-full">
		{#key `${screen.address.reviewId}/${screen.address.view}`}
			{#if screen.address.view === 'reply'}
				<DoctorReviewReply
					locale={screen.locale}
					ratingId={screen.address.reviewId}
					reviewsHref={screen.reviewsHref}
				/>
			{:else}
				<DoctorReviewReport
					locale={screen.locale}
					ratingId={screen.address.reviewId}
					reviewsHref={screen.reviewsHref}
				/>
			{/if}
		{/key}
	</main>
{/if}
