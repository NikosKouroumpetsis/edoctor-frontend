<script lang="ts">
	import type { HomeArticle } from '$modules/articles/lib/article-card';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { MediaCard } from '$shared/ui/organisms/media-card';

	let { article, href }: { article: HomeArticle; href: string } = $props();
</script>

<!-- U-20: an article of the home — the whole card one link (no «Διαβάστε»), the 4:3 photo, the title on two lines
     at most, then «author · reading time». Without a photo (or when it does not load) the application's muted frame
     with a page glyph, never a doctor's silhouette. -->
<MediaCard
	{href}
	linkLabel={article.title}
	imageUrl={article.imageUrl}
	aspect="4/3"
	imageClass="rounded-lg"
	reveal
	data-testid="home-article-card"
	class="w-full gap-2.5"
>
	{#snippet photoFallback()}
		<Ionicon
			name="document-text-outline"
			data-slot="home-article-card-placeholder"
			class="icon-xl text-muted-foreground"
		/>
	{/snippet}
	<p class="line-clamp-2 text-body-sm font-semibold text-foreground">{article.title}</p>
	{#if article.meta}
		<p class="line-clamp-2 text-label-lg leading-tight font-normal text-muted-foreground">
			{article.meta}
		</p>
	{/if}
</MediaCard>
