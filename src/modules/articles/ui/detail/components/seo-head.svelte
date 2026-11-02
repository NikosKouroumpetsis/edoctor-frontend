<script lang="ts">
	import { jsonLdScript } from '$shared/lib/seo';
	import type { ArticleSeo } from '$modules/articles/lib/article';

	let { seo }: { seo: ArticleSeo } = $props();

	// The JSON-LD as the page's own script, escaped by `jsonLdScript` (common v2 §B): an article's words never close the tag.
	const jsonLd = $derived(jsonLdScript(seo.jsonLd));
</script>

<!-- 🔴 U-57.4 (U-28.4): the article's head in the server's page — «<τίτλος> | eDoctor», the description, the canonical
     address and its languages, Open Graph `article` with the photo and the day, and the JSON-LD `Article`. -->
<svelte:head>
	<title>{seo.title}</title>
	{#if seo.description}
		<meta name="description" content={seo.description} />
		<meta property="og:description" content={seo.description} />
	{/if}
	<link rel="canonical" href={seo.canonicalUrl} />
	{#each seo.alternates as alternate (alternate.hreflang)}
		<link rel="alternate" hreflang={alternate.hreflang} href={alternate.href} />
	{/each}
	<meta property="og:type" content="article" />
	<meta property="og:title" content={seo.title} />
	<meta property="og:url" content={seo.canonicalUrl} />
	{#if seo.imageUrl}
		<meta property="og:image" content={seo.imageUrl} />
	{/if}
	{#if seo.publishedAt}
		<meta property="article:published_time" content={seo.publishedAt} />
	{/if}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLd}
</svelte:head>
