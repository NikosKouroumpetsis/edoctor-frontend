<script lang="ts">
	import ArticleScreen from '$screens/articles/[slug]';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ArticleScreen {data} />
