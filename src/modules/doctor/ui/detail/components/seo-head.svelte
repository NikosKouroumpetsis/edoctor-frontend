<script lang="ts">
	import { serializeJsonLd, type DoctorSeo } from '$modules/doctor/lib/detail';

	let { seo }: { seo: DoctorSeo } = $props();

	// The JSON-LD as the page's own script, its `<` `>` `&` and line separators escaped (`serializeJsonLd`): a doctor's
	// words can never close the tag.
	const jsonLd = $derived(
		`<script type="application/ld+json">${serializeJsonLd(seo.jsonLd)}</` + `script>`
	);
</script>

<!-- 🔴 U-28.4 (the web's own): the profile's head, in the server's page — «Όνομα · Ειδικότητα · Περιοχή | eDoctor»,
     the description from the first paragraph, the canonical address (the windows' addresses point to it) and its
     `hreflang` alternates, Open Graph with the first photo, and the JSON-LD `Physician`. -->
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
	<meta property="og:type" content="profile" />
	<meta property="og:title" content={seo.title} />
	<meta property="og:url" content={seo.canonicalUrl} />
	{#if seo.imageUrl}
		<meta property="og:image" content={seo.imageUrl} />
	{/if}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLd}
</svelte:head>
