<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Breadcrumbs } from '$shared/ui/molecules/breadcrumbs';
	import { ExpandableText } from '$shared/ui/molecules/expandable-text';
	import { ProfileSummaryCard } from '$shared/ui/molecules/profile-summary-card';
	import { Timeline } from '$shared/ui/molecules/timeline';
	import { Rail } from '$shared/ui/organisms/rail';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import {
		buildDoctorAboutContent,
		buildDoctorSeo,
		type DoctorDetailReviewCardContent
	} from '$modules/doctor/lib/detail';
	import { doctorAboutRowGlyphs, doctorTimelineGlyphs } from '../components/icons';
	import ReviewCard from '../components/review-card.svelte';
	import SeoHead from '../components/seo-head.svelte';
	import SocialLinks from '../components/social-links.svelte';
	import { useSiteBack } from '$shared/lib/navigation';
	import type { DoctorAboutPageProps } from '../types';

	let {
		load,
		locale,
		canonicalUrl,
		alternateUrls,
		doctorsHref,
		profileHref,
		reviewsHref,
		onOpenReview,
		focusBio,
		articles,
		contact
	}: DoctorAboutPageProps = $props();

	const options = $derived({ locale });
	const content = $derived(
		buildDoctorAboutContent({ doctor: load.profile, locale, now: load.serverNow })
	);
	const seo = $derived.by(() => {
		const profile = buildDoctorSeo({ doctor: load.profile, locale, canonicalUrl, alternateUrls });
		return {
			...profile,
			title: m.doctor_about_seo_title({ title: content.title, name: content.name }, options)
		};
	});
	const stats = $derived(
		content.stats.map((stat) => ({
			...stat,
			kind: stat.id === 'rating' ? ('rating' as const) : ('value' as const),
			...(stat.id === 'reviews' && content.reviews ? { href: '#reviews' } : {})
		}))
	);
	const onBack = useSiteBack();

	// U-73.1 Π2: the title goes up with the text, and the bar of the sheet takes it, small.
	let scroller = $state<HTMLElement | null>(null);
	let heading = $state<HTMLElement | null>(null);
	let titleGone = $state(false);
	$effect(() => {
		const target = heading;
		if (!target || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(
			([entry]) => {
				titleGone = !entry.isIntersecting;
			},
			{ root: scroller }
		);
		observer.observe(target);
		return () => observer.disconnect();
	});

	const ruled =
		'mt-section border-t border-border/60 pt-section tablet:mt-section-lg tablet:pt-section-lg';
</script>

<SeoHead {seo} />

{#snippet reviewCell(review: DoctorDetailReviewCardContent)}
	<ReviewCard
		{review}
		moreLabel={content.reviews?.moreLabel}
		onShowMore={onOpenReview}
		class="tablet:w-article-rail-w-lg"
	/>
{/snippet}

<!-- 🔴 U-73 (screen 16, Airbnb's page of a host): the ONE place for who the doctor is, in the place of the old window
     (`details/description` redirects here). One element, two shapes by CSS (U-81.2, SSR-safe): below 744 the application's
     sheet over the whole screen, 12 under the top, the grey «×», the large title; from 744 a page under the site's bar,
     the breadcrumbs, the card sticky on the left from 950. Every section only with data (U-34.3); every word a doctor or
     a patient wrote is text (U-65.6). «Επικοινωνήστε με τον γιατρό» opens the #18 (U-84.6). -->
<div aria-hidden="true" class="fixed inset-0 z-40 bg-overlay tablet:hidden"></div>
<div
	data-testid="doctor-about-page"
	class="fixed inset-x-0 top-3 bottom-0 z-40 flex animate-sheet-rise flex-col overflow-hidden rounded-t-xl bg-card tablet:static tablet:block tablet:animate-page-settle tablet:overflow-visible tablet:rounded-none"
>
	<div data-slot="doctor-about-bar" class="relative h-control-lg shrink-0 tablet:hidden">
		<p
			aria-hidden="true"
			data-testid="doctor-about-bar-title"
			class={cn(
				'absolute inset-x-control-xl top-2 flex h-control-sm items-center justify-center text-body-lg font-semibold text-foreground transition-opacity duration-label ease-standard',
				titleGone ? 'opacity-100' : 'opacity-0'
			)}
		>
			<span class="truncate">{content.title}</span>
		</p>
		<IconButton
			icon="close"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.doctor_window_close({}, options)}
			href={profileHref}
			onclick={onBack}
			data-testid="doctor-about-close"
			class="absolute top-2 right-4"
		/>
	</div>
	<div
		bind:this={scroller}
		class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-gutter-sm pb-section-lg tablet:overflow-visible tablet:px-profile-gutter laptop:px-profile-gutter-lg"
	>
		<div class="mx-auto w-full max-w-listing">
			<Breadcrumbs
				crumbs={[
					{ label: m.nav_doctors({}, options), href: doctorsHref },
					{ label: content.name, href: profileHref },
					{ label: content.title }
				]}
				label={m.document_breadcrumbs_label({}, options)}
				testId="doctor-about-breadcrumbs"
			/>
			<div class="grid grid-cols-1 tablet:pt-6 split:grid-cols-12">
				<h1
					bind:this={heading}
					class="text-display-sm font-semibold wrap-anywhere text-foreground tablet:text-heading-xl split:col-span-7 split:col-start-6 split:row-start-1"
				>
					{content.title}
				</h1>
				<div
					class="mt-6 split:col-span-4 split:col-start-1 split:row-span-2 split:row-start-1 split:mt-0"
				>
					<div
						class="tablet:max-w-office-aside split:sticky split:top-card-sticky-top split:max-w-none"
					>
						<ProfileSummaryCard
							layout="page"
							name={content.name}
							role={content.role}
							initial={content.initial}
							imageUrl={content.imageUrl}
							badge={content.badgeLabel}
							{stats}
							testIdPrefix="doctor-about"
						/>
					</div>
				</div>
				<div class="min-w-0 split:col-span-7 split:col-start-6 split:row-start-2">
					{#if content.rows.length > 0}
						<div data-testid="doctor-about-rows" class="mt-section flex flex-col gap-4">
							{#each content.rows as row (row.id)}
								<p
									data-testid={`doctor-about-row-${row.id}`}
									class="flex flex-row items-start gap-4 text-body-md wrap-anywhere text-foreground tablet:text-body-lg"
								>
									<Ionicon name={doctorAboutRowGlyphs[row.id]} class="icon-lg shrink-0" />
									<span>{`${row.label} `}<span class="font-semibold">{row.value}</span></span>
								</p>
							{/each}
						</div>
					{/if}
					<SocialLinks links={content.socialLinks} testIdPrefix="doctor-about" class="mt-6" />
					{#if contact}
						<div data-testid="doctor-about-contact" class="mt-6 flex flex-col">
							{@render contact()}
						</div>
					{/if}
					{#if content.description}
						<ExpandableText
							text={content.description}
							moreLabel={content.descriptionMoreLabel}
							lines={6}
							chevron
							textClass="text-body-sm tablet:text-body-lg"
							buttonClass="mt-1"
							buttonTextClass="tablet:text-body-lg"
							testId="doctor-about-description"
							class="mt-section"
						/>
					{/if}
					{#if content.bio}
						<section
							id="bio"
							aria-labelledby="doctor-about-bio-title"
							data-testid="doctor-about-bio"
							data-focused={focusBio || undefined}
							class={cn(ruled, 'scroll-mt-card-sticky-top')}
						>
							<h2 id="doctor-about-bio-title" class="text-heading-sm font-semibold text-foreground">
								{content.bio.title}
							</h2>
							<div class="mt-section flex flex-col gap-reading-gap">
								{#each content.bio.groups as group (group.id)}
									<Timeline
										icon={doctorTimelineGlyphs[group.id]}
										title={group.title}
										items={group.entries.map((entry) => ({
											id: entry.id,
											title: entry.title,
											detail: entry.organization,
											when: entry.whenLabel,
											whenLabel: entry.whenAccessibleLabel
										}))}
										moreLabel={group.moreLabel}
										fewerLabel={group.fewerLabel}
										testId={`doctor-about-bio-${group.id}`}
									/>
								{/each}
							</div>
						</section>
					{/if}
					{#if content.reviews}
						<div
							id="reviews"
							data-testid="doctor-about-reviews"
							class={cn(ruled, 'flex scroll-mt-card-sticky-top flex-col gap-section')}
						>
							<Rail
								variant="separated"
								title={content.reviews.title}
								items={content.reviews.cards}
								renderItem={reviewCell}
								keyExtractor={(review) => review.id}
								scrollLabels={{
									previous: m.rail_previous({}, options),
									next: m.rail_next({}, options)
								}}
								controlsFrom="tablet"
							/>
							<Button
								tone="muted"
								bordered={false}
								label={content.reviews.showAllLabel}
								href={reviewsHref}
								data-testid="doctor-about-reviews-all"
								class="w-full tablet:w-auto tablet:self-start"
							/>
						</div>
					{/if}
					{#if articles}
						<div class={ruled}>{@render articles(content.articlesTitle)}</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
