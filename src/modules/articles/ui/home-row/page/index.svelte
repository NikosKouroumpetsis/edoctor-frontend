<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { RAIL_CARDS_PER_VIEW, Rail } from '$shared/ui/organisms/rail';
	import type { HomeArticlesResult } from '$modules/articles/lib/article-card';
	import ArticleCard from '$modules/articles/ui/article-card';

	let { articles }: { articles: Promise<HomeArticlesResult> } = $props();

	const locale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale });
	const listPath = $derived(resolve(localizeHref('/articles', { locale }) as Pathname));
	const articleHref = (slug: string) => `${listPath}/${encodeURIComponent(slug)}`;
</script>

<!-- U-20: «Άρθρα & συμβουλές υγείας», the home's last row, in the doctors' row (title + «→» to every article, ‹ ›
     from 744, the cards by the zone). Nothing while the feed answers or when it fails: skeletons belong to the
     doctors' rows alone. -->
{#await articles then result}
	{#if result.status === 'ok' && result.articles.length > 0}
		<Rail
			title={m.articles_section_title({}, messageOptions)}
			trailing={{
				icon: 'arrow-forward',
				label: m.articles_view_all({}, messageOptions),
				href: listPath
			}}
			controlsFrom="tablet"
			perView={RAIL_CARDS_PER_VIEW}
			scrollLabels={{
				previous: m.rail_previous({}, messageOptions),
				next: m.rail_next({}, messageOptions)
			}}
			data-testid="home-articles"
		>
			{#each result.articles as article (article.id)}
				<div><ArticleCard {article} href={articleHref(article.slug)} /></div>
			{/each}
		</Rail>
	{/if}
{/await}
