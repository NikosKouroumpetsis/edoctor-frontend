<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Banner } from '$shared/ui/molecules/banner';
	import { LinkRows } from '$shared/ui/molecules/link-rows';
	import { RichText } from '$shared/ui/molecules/rich-text';
	import { DocumentPage } from '$shared/ui/templates/document-page';
	import { buildLegalDocumentView, buildLegalSeo } from '$modules/legal/lib/document';
	import type { LegalDocumentProps } from '../types';

	let {
		document,
		edition,
		locale,
		homeHref,
		legalHref,
		upcomingHref,
		currentHref,
		otherRows,
		internalHref,
		onAnchor,
		canonicalUrl,
		alternateUrls
	}: LegalDocumentProps = $props();

	const options = $derived({ locale });
	const view = $derived(
		buildLegalDocumentView({ document, edition, locale, upcomingHref, currentHref })
	);
	const seo = $derived(buildLegalSeo({ document, locale, canonicalUrl, alternateUrls }));
	// The text's own language when it is not the page's (the CMS's fallback, U-59.4).
	const textLang = $derived(
		document.language && document.language !== locale ? document.language : undefined
	);
</script>

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
	<meta property="og:type" content="website" />
	<meta property="og:title" content={seo.title} />
	<meta property="og:url" content={seo.canonicalUrl} />
</svelte:head>

<!-- 🔴 U-59.1 (wave 1.5, screen 7, the prototype 07 v2): a legal text of the CMS. From 744 (Π1–Π6) «Αρχική › Νομικά ›
     <τίτλος>», «Νομικά», the CMS's title, «Έκδοση X · Ισχύει από <ημέρα>», the `Banner` info of a new version (U-59.2),
     the language line, «Σε αυτό το κείμενο», the text 600 16/26, «Άλλα νομικά κείμενα», «↑»; no share (U-59.3 Ε3).
     Below 744 the application's text page as it is (U-58.3): «‹» and the title in the bar, the version line (Ε5), the
     notice, the language note, the headings and the text. -->
{#snippet meta()}{view.meta}{/snippet}

{#snippet notices()}
	{#if view.notice}
		{#if view.notice.actionLabel && view.notice.actionHref}
			<Banner
				title={view.notice.text}
				actionLabel={view.notice.actionLabel}
				actionHref={view.notice.actionHref}
				role="note"
				class="px-5"
				data-testid={view.notice.testId}
			/>
		{:else}
			<Banner title={view.notice.text} role="note" class="px-5" data-testid={view.notice.testId} />
		{/if}
	{/if}
{/snippet}

{#snippet cards()}
	<LinkRows title={m.legal_others_title({}, options)} rows={otherRows} testId="legal-others" />
{/snippet}

<DocumentPage
	breadcrumbs={[
		{ label: m.document_home({}, options), href: homeHref },
		{ label: m.legal_eyebrow({}, options), href: legalHref },
		{ label: document.title }
	]}
	breadcrumbsLabel={m.document_breadcrumbs_label({}, options)}
	eyebrow={m.legal_eyebrow({}, options)}
	title={document.title}
	meta={view.meta ? meta : undefined}
	notices={view.notice ? notices : undefined}
	languageNote={view.languageNote ?? undefined}
	toc={view.toc}
	tocTitle={m.document_toc_text({}, options)}
	{cards}
	asideLabel={m.legal_others_title({}, options)}
	backHref={legalHref}
	backLabel={m.document_back({}, options)}
	backToTopLabel={m.document_back_to_top({}, options)}
	{onAnchor}
	phone="app"
	testId="legal-page"
>
	<RichText
		document={document.body}
		variant="legal"
		{internalHref}
		lang={textLang}
		testId="legal-body"
	/>
</DocumentPage>
