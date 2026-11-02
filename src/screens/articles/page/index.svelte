<script lang="ts">
	import { articleTypeParam } from '$modules/articles/lib/article-list';
	import ArticlesList from '$modules/articles/ui/list';
	import { useArticlesScreen } from '../hooks';
	import type { ArticlesScreenProps } from '../types';

	let { data }: ArticlesScreenProps = $props();

	const screen = useArticlesScreen(() => articleTypeParam(data.scope.type));
</script>

<!-- Health articles (wave 1.5, screen 6, U-57.2): the articles module's list, drawn whole by the server, on white at
     every width as the prototype 06 v3 (U-63, the cards without a frame need no grey ground). -->
<main class="bg-card">
	<ArticlesList
		firstPage={data.list}
		scope={data.scope}
		locale={screen.locale}
		listHref={screen.listHref}
		articleHref={screen.articleHref}
		backHref={screen.backHref}
		canonicalUrl={screen.canonicalUrl}
		alternateUrls={screen.alternateUrls}
	/>
</main>
