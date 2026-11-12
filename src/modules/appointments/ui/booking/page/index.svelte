<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { FirstVisit, NoteField, RoundLink } from '$modules/appointments/ui/change-screen';
	import SummaryCard from '../components/summary-card.svelte';
	import { useBookingReview } from '../hooks/use-review.svelte';
	import type { BookingReviewProps } from '../types';

	let props: BookingReviewProps = $props();

	const review = useBookingReview(() => props);
	const options = $derived({ locale: props.locale });
	const ctaLabel = $derived(
		review.signedIn ? m.booking_submit_label({}, options) : m.booking_guest_cta({}, options)
	);
	const ctaLocked = $derived(review.decision.kind === 'locked');
	// The application's order (review w3-w2 R1 MINOR-3): the refusal with its way out, then the blockers' words.
	const blockerNotices = $derived(
		review.decision.kind === 'locked'
			? review.decision.messages.filter((message) => message !== review.failure?.message)
			: []
	);
</script>

<svelte:head>
	<title>{m.booking_meta_title({ title: m.booking_summary_title({}, options) }, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet cta(placement: 'bar' | 'panel')}
	<!-- 🔴 U-104.2: the main button is fully round; U-100 / D-W3-27: no colour under the pointer. -->
	<Button
		label={ctaLabel}
		tone="accent"
		radius="full"
		hover={false}
		textClass="text-body-lg"
		disabled={ctaLocked}
		loading={review.submitting}
		onclick={review.press}
		data-testid={`booking-submit-${placement}`}
		class={placement === 'bar' ? 'w-full' : undefined}
	/>
{/snippet}

<!-- Screen 30 · «Επιβεβαίωση ραντεβού» (record §3.2–§3.4, U-102, U-104). Below 744 the application's (U-81.2): «×» at the
     top right, the title 28/600, a refusal and the blockers' words, the card, then the question, the note and the bar
     pinned to the bottom — no progress (U-104.1). 744–949 one column of 440 under the site's mark; from 950 Airbnb's two
     columns: the panel (the question, the note, the button on its right) beside the card, which stays in view. Every
     «Αλλαγή» is a new screen (U-102). A read of the person that failed is said with «Δοκιμάστε ξανά» (the application's
     `ErrorState`, MAJOR-2 of R1), and nothing can be pressed in its place. White to the bottom however short (W8-Δ1). -->
<main
	data-slot="booking-review"
	class="min-h-dvh bg-card px-gutter-sm pt-3 pb-page-bar tablet:min-h-page tablet:px-gutter-lg tablet:pt-section tablet:pb-section-lg"
>
	<div class="relative mx-auto w-full tablet:max-w-checkout-main-lg split:w-fit split:max-w-none">
		<div
			class="flex flex-row justify-end tablet:mb-4 tablet:justify-start split:absolute split:top-0 split:right-full split:mr-5 split:mb-0"
		>
			<RoundLink
				href={props.profileHref}
				label={m.booking_close({}, options)}
				wideLabel={m.booking_back({}, options)}
				icon="close"
				wideIcon="arrow-back"
				onclick={review.close}
				testId="booking-close"
			/>
		</div>
		<h1
			class="mt-3 mb-6 text-heading-lg font-semibold text-foreground tablet:mt-0 tablet:text-heading-xl split:mt-1"
		>
			{m.booking_summary_title({}, options)}
		</h1>

		{#if review.readFailed}
			<ErrorState
				title={m.booking_error_title({}, options)}
				description={m.booking_error_body({}, options)}
				actionLabel={m.booking_error_retry({}, options)}
				onActionPress={review.retryReads}
				variant="framed"
				testId="booking-error"
			/>
		{:else}
			{#if review.failure?.message || blockerNotices.length > 0 || review.slotsFailed}
				<div data-slot="booking-notices" class="mb-6 flex flex-col gap-3">
					{#if review.failure?.message}
						{#if review.failureActionLabel}
							<InlineNotice
								variant="danger"
								message={review.failure.message}
								actionLabel={review.failureActionLabel}
								onAction={review.followFailure}
								testId="booking-notice"
							/>
						{:else}
							<InlineNotice
								variant="danger"
								message={review.failure.message}
								testId="booking-notice"
							/>
						{/if}
					{/if}
					{#each blockerNotices as notice (notice)}
						<InlineNotice variant="danger" message={notice} testId="booking-notice" />
					{/each}
					{#if review.slotsFailed}
						<InlineNotice
							variant="danger"
							message={m.doctor_availability_failed({}, options)}
							actionLabel={m.doctor_availability_retry({}, options)}
							onAction={props.onRetrySlots}
							testId="booking-slots-failed"
						/>
					{/if}
				</div>
			{/if}

			<div class="flex flex-col gap-6 split:grid split:grid-checkout split:items-start">
				<div
					data-slot="booking-review-card"
					class="split:sticky split:top-card-sticky-top split:col-start-2 split:row-start-1"
				>
					<SummaryCard
						card={review.card}
						stepHref={review.stepHref}
						onOpenStep={review.openStep}
						onFeeSignIn={props.onFeeSignIn}
					/>
				</div>

				<div
					data-slot="booking-review-panel"
					class="flex flex-col gap-6 tablet:rounded-xl tablet:border tablet:border-border tablet:p-6 tablet:shadow-overlay split:col-start-1 split:row-start-1"
				>
					{#if !review.signedIn}
						<div data-testid="booking-guest" class="rounded-md bg-background px-4 py-3.5">
							<p class="text-body-sm font-semibold text-foreground">
								{m.booking_guest_title({}, options)}
							</p>
							<p class="mt-0.5 text-label-lg font-normal text-muted-foreground">
								{m.booking_guest_body({}, options)}
							</p>
						</div>
					{/if}
					{#if review.asksFirstVisit}
						<FirstVisit
							title={review.firstVisitTitle}
							value={review.firstVisit}
							options={[
								{ value: 'yes', label: m.common_yes({}, options) },
								{ value: 'no', label: m.common_no({}, options) }
							]}
							onChange={(value) => review.setFirstVisit(value)}
						/>
					{/if}
					<NoteField
						label={m.booking_note_label({}, options)}
						placeholder={m.booking_note_placeholder({}, options)}
						value={review.note}
						counter={review.noteCounter}
						error={review.failure?.noteError ?? null}
						onInput={(value) => review.setNote(value)}
					/>
					<div class="hidden flex-row justify-end border-t border-border pt-4 tablet:flex">
						{@render cta('panel')}
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#if !review.readFailed}
		<div
			data-slot="booking-bar"
			class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-gutter-sm pt-3 pb-safe-area-3 tablet:hidden"
		>
			{@render cta('bar')}
		</div>
	{/if}
</main>
