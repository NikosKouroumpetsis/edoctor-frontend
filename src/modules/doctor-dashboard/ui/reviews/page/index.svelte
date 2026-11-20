<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Button } from '$shared/ui/primitives/button';
	import { Chip } from '$shared/ui/primitives/chip';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import Card from '../components/card.svelte';
	import DeleteDialog from '../components/delete-dialog.svelte';
	import Summary from '../components/summary.svelte';
	import { useDoctorReviews } from '../hooks';
	import type { DoctorReviewsProps } from '../types';

	let { locale, filter, reviewId, links }: DoctorReviewsProps = $props();

	const options = $derived({ locale });
	const reviews = useDoctorReviews({
		locale: () => locale,
		filter: () => filter,
		reviewId: () => reviewId
	});

	// 🔴 D-W52-92 · U-219.2: a reply, a report and the appointment open one step on in the history
	// (`page.state.doctorReview.depth` 1), so their «‹» and their done action come back to this same review.
	const steps = useHistorySteps('doctorReview');
	function open(event: MouseEvent) {
		const href = (event.currentTarget as HTMLElement | null)?.closest('a')?.getAttribute('href');
		if (!href || !isPlainClick(event)) return;
		event.preventDefault();
		steps.open(href, 1);
	}

	// 🔴 D-W52-91: the review the address names (a notification, the row of 68) — once it is on the page, the page goes to
	// it and its card takes the focus; once per address.
	let went: string | null = null;
	$effect(() => {
		const id = reviewId;
		if (id === null || !reviews.found || went === id) return;
		went = id;
		untrack(() => {
			void tick().then(() => {
				const card = document.getElementById(`doctor-review-${id}`);
				card?.scrollIntoView?.({ block: 'center' });
				card?.focus({ preventScroll: true });
			});
		});
	});
</script>

{#snippet starGlyph()}
	<StateGlyph name="star-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
{#snippet heldLine(words: string)}
	<p
		data-testid="doctor-reviews-held"
		class="mt-6 flex flex-row items-start gap-2.5 rounded-md bg-foreground/5 px-3.5 py-3 text-body-sm text-foreground"
	>
		<Ionicon name="time-outline" class="icon-md shrink-0" />
		<span>{words}</span>
	</p>
{/snippet}

<!-- 🔴 Wave 5.2 · screen 84 «Κριτικές» (U-218, U-219, U-220, D-W52-91; `64-switch/sw.js` `revPage`, `sw.css:549-604`):
     ONE column of 720 in the middle of the screen (U-215), «‹» to «Μενού» only below 950 (U-217) — the title and its
     line, the summary for the doctor alone, «N νέες κριτικές ελέγχονται …», «Όλες · Χωρίς απάντηση (N)», the published
     reviews newest first with «Εμφάνιση παλαιότερων». Every word a text node (U-65.6); no colour under the pointer
     (U-100). -->
<main
	data-testid="doctor-reviews"
	data-view={reviews.view}
	class="mx-auto flex w-full max-w-document-wide flex-col px-gutter-sm pt-3 pb-section tablet:pt-section"
>
	<IconButton
		icon="chevron-back"
		appearance="tint"
		surface="soft"
		size="sm"
		iconSize="md"
		aria-label={m.doctor_my_profile_back({}, options)}
		href={links.menu}
		data-testid="doctor-reviews-back"
		class="mb-3 flex split:hidden"
	/>
	<h1 class="text-heading-lg font-semibold text-foreground tablet:text-heading-xl">
		{m.doctor_my_reviews_title({}, options)}
	</h1>
	<p class="mt-1 text-body-md text-muted-foreground">
		{m.doctor_my_reviews_lead({}, options)}
	</p>

	{#if reviews.view === 'loading'}
		<div
			data-testid="doctor-reviews-loading"
			aria-busy="true"
			aria-label={m.doctor_my_reviews_title({}, options)}
			class="mt-4 grid gap-3"
		>
			<Skeleton class="h-placeholder-lg w-full rounded-lg" />
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	{:else if reviews.view === 'failed'}
		<EmptyState
			titleAs="h2"
			title={m.doctor_dashboard_load_error({}, options)}
			actionLabel={m.doctor_dashboard_retry({}, options)}
			onActionPress={() => reviews.retry()}
			actionTone="contrast"
			icon={errorGlyph}
			class="pt-section-lg"
			testId="doctor-reviews-failed"
			actionTestId="doctor-reviews-retry"
		/>
	{:else if reviews.view === 'none'}
		{#if reviews.held}
			{@render heldLine(reviews.held)}
		{/if}
		<EmptyState
			titleAs="h2"
			title={m.doctor_my_reviews_empty_title({}, options)}
			description={m.doctor_my_reviews_empty_body({}, options)}
			icon={starGlyph}
			class="pt-section-lg"
			testId="doctor-reviews-empty"
		/>
	{:else}
		{#if reviews.summary}
			<Summary summary={reviews.summary} {locale} />
		{/if}
		{#if reviews.held}
			{@render heldLine(reviews.held)}
		{/if}
		<nav
			aria-label={m.doctor_my_reviews_title({}, options)}
			data-testid="doctor-reviews-filters"
			class="mt-5 mb-1 flex flex-row flex-wrap gap-2"
		>
			<Chip
				label={m.doctor_my_reviews_filter_all({}, options)}
				href={links.filter('all')}
				selected={filter === 'all'}
				variant="contrast"
				size="tab"
				hover={false}
				data-sveltekit-noscroll
				data-testid="doctor-reviews-filter-all"
			/>
			<Chip
				label={reviews.unansweredLabel}
				href={links.filter('unanswered')}
				selected={filter === 'unanswered'}
				variant="contrast"
				size="tab"
				hover={false}
				data-sveltekit-noscroll
				data-testid="doctor-reviews-filter-unanswered"
			/>
		</nav>
		{#if reviews.cards.length === 0}
			<p data-testid="doctor-reviews-all-answered" class="mt-4 text-body-md text-muted-foreground">
				{m.doctor_my_reviews_all_answered({}, options)}
			</p>
		{:else}
			<ul data-testid="doctor-reviews-list" aria-label={m.doctor_my_reviews_title({}, options)}>
				{#each reviews.cards as card (card.id)}
					<Card
						{card}
						{locale}
						replyHref={links.reply(card.id)}
						reportHref={links.report(card.id)}
						appointmentHref={links.appointment(card.appointmentId)}
						onOpen={open}
						onDelete={() => reviews.ask(card.id)}
					/>
				{/each}
			</ul>
			{#if reviews.hasMore}
				<div class="mt-6 flex flex-row justify-center">
					<Button
						label={m.doctor_my_reviews_more({}, options)}
						tone="outline"
						radius="md"
						hover={false}
						textClass="text-body-md"
						loading={reviews.loadingMore}
						onclick={() => reviews.loadMore()}
						data-testid="doctor-reviews-more"
					/>
				</div>
			{/if}
		{/if}
	{/if}
</main>

<DeleteDialog
	open={reviews.asking !== null}
	{locale}
	deleting={reviews.deleting}
	failure={reviews.deleteFailure}
	onConfirm={() => reviews.remove()}
	onCancel={() => reviews.dismiss()}
/>
