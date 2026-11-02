<script lang="ts">
	import ArticleDetail from '$modules/articles/ui/detail';
	import { useArticleScreen } from '../hooks';
	import type { ArticleScreenProps } from '../types';

	let { data }: ArticleScreenProps = $props();

	const screen = useArticleScreen(
		() => data.article.slug,
		() => data.article.type,
		() => data.article.canonicalUrl
	);
</script>

<!-- One article (wave 1.5, screen 6, U-57.4): the articles module's page, drawn whole by the server. -->
<main class="bg-card">
	<ArticleDetail
		article={data.article}
		related={data.related}
		locale={screen.locale}
		listHref={screen.listHref}
		kindHref={screen.kindHref}
		articleHref={screen.articleHref}
		doctorHref={screen.doctorHref}
		internalHref={screen.internalHref}
		onAnchor={screen.onAnchor}
		canonicalUrl={screen.canonicalUrl}
		alternateUrls={screen.alternateUrls}
	/>
</main>
