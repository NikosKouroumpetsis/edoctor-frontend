<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { m } from '$paraglide/messages.js';
	import { readQueryState } from '$shared/lib/query-state';
	import { Rail } from '$shared/ui/organisms/rail';
	import { Section } from '$shared/ui/molecules/section';
	import { StatePanel } from '$shared/ui/molecules/state-panel';
	import { Button } from '$shared/ui/primitives/button';
	import { ARTICLES_DOCTOR_ROW_LIMIT, doctorArticlesRowQuery } from '$modules/articles/api';
	import { buildArticleListCard, doctorArticlesTitle } from '$modules/articles/lib/article-list';
	import ArticleCard, { ArticleCardSkeleton } from '$modules/articles/ui/article-card';
	import type { DoctorArticlesRowProps } from '../types';

	/** U-92.3: the cards are asked this far before the row reaches the screen, so they are there when it does. */
	const NEARS_SCREEN = '600px 0px';
	const PLACEHOLDERS = Array.from({ length: ARTICLES_DOCTOR_ROW_LIMIT }, (_, index) => index);

	let {
		doctorId,
		counts,
		locale,
		articleHref,
		allHref,
		title: ownTitle
	}: DoctorArticlesRowProps = $props();

	const options = $derived({ locale });
	const total = $derived(counts.articlesCount + counts.healthAdviceCount);
	const title = $derived(ownTitle ?? doctorArticlesTitle(counts, locale));

	let node = $state<HTMLElement | null>(null);
	let near = $state(false);
	$effect(() => {
		const target = node;
		if (!target) return;
		if (typeof IntersectionObserver === 'undefined') {
			near = true;
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				near = true;
				observer.disconnect();
			},
			{ rootMargin: NEARS_SCREEN }
		);
		observer.observe(target);
		return () => observer.disconnect();
	});

	// 🔴 U-92.2 / U-92.3: never for a doctor without articles; for the others only once the row nears the screen.
	const query = createQuery(() => ({
		...doctorArticlesRowQuery(doctorId, locale),
		enabled: browser && total > 0 && near
	}));
	const readState = $derived(readQueryState(query));
	const cards = $derived(
		(query.data?.articles ?? []).map((article) =>
			buildArticleListCard(article, locale, { withoutAuthor: true })
		)
	);
	// A read not asked yet is no failure: only one that was asked (or could not be, offline).
	const failed = $derived(near && (readState === 'failed' || readState === 'unavailable'));
</script>

<!-- 🔴 U-77 / U-92 (the prototype 17 Π1, Π5): the profile's section after the biography. Its name and its button come
     with the profile's counts; a doctor without articles has no section and asks nothing. The three cards of the list
     (U-63), without the author's name, are asked when the section nears the screen, a breathing skeleton in their
     place: a row that drags on the phone (268, 12 apart, edge to edge), three columns from 744. -->
{#snippet showAll()}
	{#if total > ARTICLES_DOCTOR_ROW_LIMIT}
		<Button
			tone="muted"
			bordered={false}
			label={m.articles_show_all_count({ count: String(total) }, options)}
			href={allHref}
			data-testid="doctor-articles-show-all"
			class="w-full tablet:w-auto tablet:self-start"
		/>
	{/if}
{/snippet}

{#if total > 0 && ownTitle !== undefined}
	<!-- U-73 Π8: the doctor's page keeps its cards in a row (300, 268 on the phone), with arrows from 744. -->
	<div
		bind:this={node}
		data-slot="doctor-articles"
		data-testid="doctor-detail-articles"
		class="flex flex-col gap-section"
	>
		{#if failed}
			<StatePanel
				glyph="cloud-offline-outline"
				titleAs="h3"
				title={m.articles_error_title({}, options)}
				description={m.articles_error_body({}, options)}
				actionLabel={m.articles_retry({}, options)}
				onAction={() => void query.refetch()}
				role="alert"
				testId="doctor-articles-error"
				actionTestId="doctor-articles-retry"
			/>
		{:else}
			<Rail
				{title}
				scrollLabels={{ previous: m.rail_previous({}, options), next: m.rail_next({}, options) }}
				controlsFrom="tablet"
				data-testid="doctor-articles-row"
			>
				{#if cards.length > 0}
					{#each cards as card (card.id)}
						<div
							class="flex w-article-rail-w shrink-0 snap-start transition-opacity duration-standard ease-standard tablet:w-article-rail-w-lg starting:opacity-0"
						>
							<ArticleCard article={card} href={articleHref(card.slug)} variant="list" />
						</div>
					{/each}
				{:else}
					{#each PLACEHOLDERS as index (index)}
						<div class="flex w-article-rail-w shrink-0 snap-start tablet:w-article-rail-w-lg">
							<ArticleCardSkeleton />
						</div>
					{/each}
				{/if}
			</Rail>
		{/if}
		{@render showAll()}
	</div>
{:else if total > 0}
	<div bind:this={node} data-slot="doctor-articles">
		<Section
			variant="ruled"
			{title}
			titleId="doctor-articles-title"
			id="doctor-articles"
			aria-labelledby="doctor-articles-title"
			data-section="articles"
			data-testid="doctor-detail-articles"
			class="scroll-mt-bar-top tablet:scroll-mt-section-bar"
		>
			<div class="flex flex-col gap-results-row-gap tablet:gap-reading-gap">
				{#if failed}
					<StatePanel
						glyph="cloud-offline-outline"
						titleAs="h3"
						title={m.articles_error_title({}, options)}
						description={m.articles_error_body({}, options)}
						actionLabel={m.articles_retry({}, options)}
						onAction={() => void query.refetch()}
						role="alert"
						testId="doctor-articles-error"
						actionTestId="doctor-articles-retry"
					/>
				{:else}
					<ul
						data-testid="doctor-articles-row"
						aria-busy={cards.length === 0 || undefined}
						class="-mx-gutter-sm scrollbar-none flex snap-x snap-mandatory scroll-px-gutter-sm flex-row gap-rail overflow-x-auto px-gutter-sm tablet:mx-0 tablet:grid tablet:grid-cols-3 tablet:overflow-visible tablet:px-0"
					>
						{#if cards.length > 0}
							{#each cards as card (card.id)}
								<li
									class="flex w-article-rail-w shrink-0 snap-start transition-opacity duration-standard ease-standard tablet:w-auto tablet:min-w-0 starting:opacity-0"
								>
									<ArticleCard article={card} href={articleHref(card.slug)} variant="list" />
								</li>
							{/each}
						{:else}
							{#each PLACEHOLDERS as index (index)}
								<li class="flex w-article-rail-w shrink-0 snap-start tablet:w-auto tablet:min-w-0">
									<ArticleCardSkeleton />
								</li>
							{/each}
						{/if}
					</ul>
				{/if}
				{@render showAll()}
			</div>
		</Section>
	</div>
{/if}
