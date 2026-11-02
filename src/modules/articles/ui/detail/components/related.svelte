<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import type { ArticleListCard } from '$modules/articles/lib/article-list';
	import ArticleCard from '$modules/articles/ui/article-card';

	let {
		articles,
		locale,
		articleHref
	}: {
		articles: ArticleListCard[];
		locale: SupportedLocale;
		articleHref: (slug: string) => ResolvedPathname;
	} = $props();

	const headingId = $props.id();
</script>

<!-- 🔴 U-57.4 (the prototype 06, Π11): «Περισσότερα άρθρα» — three cards of the list (the same kind first, the newest
     first), a hairline above, 56 + 40; from 744 a grid of three across the page (28 × 12), below 744 a row that drags
     sideways (each card 40 % of the screen, snapping), as the home's. -->
<section
	aria-labelledby={headingId}
	data-testid="article-related"
	class="mt-reading-more border-t border-border/60 pt-reading-gap"
>
	<h2 id={headingId} class="mb-4 text-title-lg text-foreground tablet:text-heading-sm">
		{m.article_more_title({}, { locale })}
	</h2>
	<ul
		class="-mx-gutter-sm scrollbar-none flex snap-x snap-mandatory flex-row gap-rail overflow-x-auto px-gutter-sm tablet:mx-0 tablet:grid tablet:grid-cols-3 tablet:gap-y-results-row-gap tablet:overflow-visible tablet:px-0"
	>
		{#each articles as card (card.id)}
			<li class="flex shrink-0 basis-2/5 snap-start tablet:basis-auto">
				<ArticleCard article={card} href={articleHref(card.slug)} variant="grid" />
			</li>
		{/each}
	</ul>
</section>
