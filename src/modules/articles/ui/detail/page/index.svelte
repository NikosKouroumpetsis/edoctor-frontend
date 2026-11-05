<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { RichText } from '$shared/ui/molecules/rich-text';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { DocumentPage } from '$shared/ui/templates/document-page';
	import { buildArticlePage, buildArticleSeo } from '$modules/articles/lib/article';
	import AuthorAside from '../components/author-aside.svelte';
	import Cover from '../components/cover.svelte';
	import Related from '../components/related.svelte';
	import SeoHead from '../components/seo-head.svelte';
	import ShareWindow from '../components/share-window.svelte';
	import type { ArticleDetailProps } from '../types';

	let {
		article,
		related,
		locale,
		listHref,
		kindHref,
		articleHref,
		doctorHref,
		internalHref,
		onAnchor,
		canonicalUrl,
		alternateUrls,
		helpful
	}: ArticleDetailProps = $props();

	const options = $derived({ locale });
	const view = $derived(buildArticlePage({ article, related, locale, doctorHref }));
	const seo = $derived(buildArticleSeo({ article, locale, canonicalUrl, alternateUrls }));
	let shareOpen = $state(false);
	// «ημέρα · N΄ ανάγνωσης» after «Από <γιατρός>» — the « · » written as words, never cut at a block's edge (MINOR-1).
	const metaTail = $derived([view.date, view.reading].filter(Boolean).join(' · '));

	// U-34.2 (app = web): a phone with touch shares through the system; elsewhere the web's window.
	function share() {
		const coarse = window.matchMedia?.('(pointer: coarse)').matches;
		if (coarse && typeof navigator.share === 'function') {
			navigator.share({ title: view.title, url: canonicalUrl }).catch(() => undefined);
			return;
		}
		shareOpen = true;
	}
</script>

<SeoHead {seo} />

<!-- 🔴 U-57.4 (wave 1.5, screen 6, the prototype 06 Π5–Π12): one article on the text page's template — from 744
     «Άρθρα υγείας › Άρθρα» (or «› Συμβουλές υγείας»), the h1, the short description, «Από <γιατρός> · ημέρα · N΄
     ανάγνωσης» (the name links the profile only with its slug; a hidden doctor has none, Ε4) and «Κοινοποίηση»; the
     photo 16:9 in the column; «Σε αυτό το άρθρο»; the text 18/28; the note; the author's card «Κλείστε ραντεβού»;
     «Περισσότερα άρθρα» (3). Below 744 «‹» and share in the bar, the title rising into it. Whole on the server. -->
{#snippet meta()}{#if view.author}{`${m.article_by_prefix({}, options)} `}{#if view.author.href}<a
				href={view.author.href}
				data-slot="article-meta-author"
				data-testid="article-meta-author"
				class="font-medium text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:decoration-2"
				>{view.author.name}</a
			>{:else}<span class="font-medium text-foreground">{view.author.name}</span
			>{/if}{#if metaTail}{` · ${metaTail}`}{/if}{:else}{metaTail}{/if}{/snippet}

{#snippet shareButton()}
	<button
		type="button"
		data-testid="article-share"
		onclick={share}
		class="inline-flex min-h-touch min-w-touch flex-row items-center gap-2 rounded-sm px-2 text-body-sm font-semibold text-foreground transition-colors duration-label ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:bg-background"
	>
		<Ionicon name="share-outline" class="icon-sm" />
		<span class="underline">{m.article_share({}, options)}</span>
	</button>
{/snippet}

{#snippet barShare()}
	<IconButton
		icon="share-outline"
		size="sm"
		appearance="tint"
		surface="subtle"
		iconSize="md"
		aria-label={m.article_share({}, options)}
		data-testid="article-share-phone"
		onclick={share}
	/>
{/snippet}

{#snippet media()}
	<Cover url={view.image?.url ?? ''} alt={view.image?.alt ?? ''} />
{/snippet}

{#snippet end()}
	<p
		data-testid="article-note"
		class="mt-section border-t border-border/60 pt-4 text-label-lg font-normal text-muted-foreground"
	>
		{m.article_note({}, options)}
	</p>
{/snippet}

{#snippet cards()}
	{#if view.author}
		<AuthorAside author={view.author} {locale} />
	{/if}
{/snippet}

{#snippet footer()}
	{#if helpful}
		<!-- U-78 (`23-helpful` Π1): in the text's column, 40 under what comes before it; «Περισσότερα άρθρα» stays as it is. -->
		<div
			data-testid="article-helpful"
			class="mt-reading-gap tablet:mx-auto tablet:max-w-dialog laptop:mx-0 laptop:max-w-document-column"
		>
			{@render helpful()}
		</div>
	{/if}
	{#if view.related.length > 0}
		<Related articles={view.related} {locale} {articleHref} />
	{/if}
{/snippet}

<DocumentPage
	breadcrumbs={[
		{ label: m.nav_articles({}, options), href: listHref },
		{ label: view.typePluralLabel, href: kindHref }
	]}
	breadcrumbsLabel={m.document_breadcrumbs_label({}, options)}
	title={view.title}
	subtitle={view.subtitle || undefined}
	meta={view.author || view.date || view.reading ? meta : undefined}
	metaAction={shareButton}
	media={view.image ? media : undefined}
	toc={view.toc}
	tocTitle={m.document_toc_article({}, options)}
	{end}
	cards={view.author ? cards : undefined}
	asideLabel={m.article_written_by({}, options)}
	footer={helpful || view.related.length > 0 ? footer : undefined}
	backHref={listHref}
	backLabel={m.document_back({}, options)}
	barActions={barShare}
	{onAnchor}
	testId="article-page"
>
	<RichText document={view.body} variant="article" {internalHref} testId="article-body" />
</DocumentPage>

<ShareWindow
	bind:open={shareOpen}
	title={view.title}
	subtitle={[view.typeLabel, view.author?.name].filter(Boolean).join(' · ')}
	photoUrl={view.image?.url ?? null}
	url={canonicalUrl}
	{locale}
/>
