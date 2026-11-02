<script lang="ts">
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import type { Pathname, ResolvedPathname } from '$app/types';
	import { goto, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { breakpoints } from '$shared/design/tokens';
	import { jsonLdScript } from '$shared/lib/seo';
	import { searchWords } from '$shared/lib/text';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { RichText } from '$shared/ui/molecules/rich-text';
	import { SearchPill, type SearchPillGroup } from '$shared/ui/molecules/search-pill';
	import { StatePanel } from '$shared/ui/molecules/state-panel';
	import { ListHeader } from '$shared/ui/organisms/list-header';
	import { PageBar } from '$shared/ui/organisms/page-bar';
	import { Button } from '$shared/ui/primitives/button';
	import { Chip } from '$shared/ui/primitives/chip';
	import { FAQ_FILTER_DEBOUNCE_MS, FAQ_SUGGESTION_LIMIT } from '$modules/help/config/faq';
	import {
		buildFaq,
		buildFaqJsonLd,
		faqAnchorOf,
		faqMatchExcerpt,
		faqTargetOf,
		faqTopicOf,
		searchFaq
	} from '$modules/help/lib/faq';
	import Question from '../components/question.svelte';
	import type { HelpCenterProps } from '../types';

	let {
		faq: source,
		locale,
		helpHref,
		backHref,
		internalHref,
		supportEmail,
		onRetry,
		canonicalUrl,
		alternateUrls
	}: HelpCenterProps = $props();

	const options = $derived({ locale });
	const ready = $derived(source.state === 'ready');
	const faq = $derived(buildFaq(source.state === 'ready' ? source.body : null));
	// 🔴 MAJOR-1 of r1: the search, the topics and the popular ones only with the CMS's H2/H3 structure.
	const structured = $derived(ready && faq.shape === 'topics');
	// U-60.1 Π7: the questions came in Greek on a page in another language (the CMS's fallback).
	const contentLang = $derived(
		source.state === 'ready' && source.language && source.language !== locale
			? source.language
			: undefined
	);
	const query = $derived((page.url.searchParams.get('q') ?? '').trim());
	const topic = $derived(faqTopicOf(faq, page.url.searchParams.get('topic')));
	const hits = $derived(searchFaq(faq, query, topic));
	const words = $derived(searchWords(query));
	const searching = $derived(query.length > 0);

	let typed = $state(untrack(() => (page.url.searchParams.get('q') ?? '').trim()));
	const suggestions = $derived(searchFaq(faq, typed, topic));
	const groups = $derived<SearchPillGroup[]>([
		{
			id: 'questions',
			label: m.help_suggestions_label({}, options),
			options: suggestions.slice(0, FAQ_SUGGESTION_LIMIT).map((hit) => {
				const excerpt = faqMatchExcerpt(hit, typed);
				return {
					id: hit.question.id,
					title: hit.question.question,
					subtitle: excerpt ? `${hit.topic.label} · ${excerpt}` : hit.topic.label,
					icon: 'help-circle-outline' as const
				};
			})
		}
	]);

	const jsonLd = $derived.by(() => {
		const document = structured ? buildFaqJsonLd(faq) : null;
		return document ? jsonLdScript(document) : '';
	});
	const title = $derived(m.help_meta_title({}, options));
	const description = $derived(m.help_meta_description({}, options));

	const navigate = (href: ResolvedPathname) =>
		goto(href, { keepFocus: true, noScroll: true, replaceState: false });

	/** The search runs (Enter, the magnifier, «Όλα τα αποτελέσματα»): `?q=` in the address, the topic kept. */
	function submit(words: string) {
		void navigate(helpHref({ q: words || null, topic: topic?.id ?? null }));
	}

	function clearSearch() {
		typed = '';
		if (searching) void navigate(helpHref({ topic: topic?.id ?? null }));
	}

	/** This page's address with another anchor (or none): the search and the topic kept. */
	const here = (hash: string) =>
		resolve(`${page.url.pathname}${page.url.search}${hash}` as Pathname);

	let written: string | null = null;

	/** Π5: the address names the question last opened (to share it); closing it takes the anchor away. */
	function onToggle(id: string, open: boolean) {
		if (open) {
			written = id;
			replaceState(here(`#${id}`), page.state);
		} else if (page.url.hash === `#${id}`) {
			written = null;
			replaceState(here(''), page.state);
		}
	}

	/**
	 * 🔴 U-60.1 (Π5): an anchor of the FAQ — a topic scrolls to its H2, a question opens where it is and scrolls to it.
	 * A search or another topic that hides it gives way to «Όλα» first.
	 */
	async function reveal(id: string, smooth: boolean) {
		const target = faqTargetOf(faq, id);
		if (!target) return;
		if (searching || (topic && topic.id !== target.topic.id)) {
			typed = '';
			await goto(helpHref({ hash: id }), { keepFocus: true, noScroll: true, replaceState: true });
			await tick();
		}
		const node = document.getElementById(id);
		if (!node) return;
		if (target.kind === 'question' && node instanceof HTMLDetailsElement) node.open = true;
		node.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
		written = id;
	}

	function jump(event: MouseEvent, id: string) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
			return;
		event.preventDefault();
		void reveal(id, true).then(() => replaceState(here(`#${id}`), page.state));
	}

	/**
	 * 🔴 U-58.1 / U-60.1 Π4 (app = web): below 744 the field filters as it is typed, as the application's — the words
	 * go into the address after 250 ms of quiet (one field, one address, the server's page); from 744 its suggestions.
	 */
	let phone = $state(false);
	let filterTimer: ReturnType<typeof setTimeout> | undefined;

	function filterAsTyped(value: string) {
		clearTimeout(filterTimer);
		if (!phone) return;
		filterTimer = setTimeout(() => {
			const next = value.trim();
			if (next === query) return;
			void goto(helpHref({ q: next || null, topic: topic?.id ?? null }), {
				keepFocus: true,
				noScroll: true,
				replaceState: true
			});
		}, FAQ_FILTER_DEBOUNCE_MS);
	}

	let mounted = false;
	onMount(() => {
		mounted = true;
		const zone = window.matchMedia?.(`(min-width: ${breakpoints.tablet}px)`);
		const follow = () => (phone = zone ? !zone.matches : false);
		follow();
		zone?.addEventListener?.('change', follow);
		const id = faqAnchorOf(page.url.hash);
		if (id) void reveal(id, false);
		return () => zone?.removeEventListener?.('change', follow);
	});
	onDestroy(() => clearTimeout(filterTimer));
	// A link to an anchor of this page while on it (the footer's «Πώς κλείνω ραντεβού», «Ακύρωση ραντεβού»).
	$effect(() => {
		const id = faqAnchorOf(page.url.hash);
		untrack(() => {
			if (!mounted || !id || id === written) return;
			void reveal(id, true);
		});
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="el" href={alternateUrls.el} />
	<link rel="alternate" hreflang="en" href={alternateUrls.en} />
	<link rel="alternate" hreflang="x-default" href={alternateUrls.el} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl} />
	{#if jsonLd}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html jsonLd}
	{/if}
</svelte:head>

{#snippet searchField()}
	<SearchPill
		bind:value={typed}
		placeholder={m.help_search_placeholder({}, options)}
		clearLabel={m.common_clear_search({}, options)}
		submitLabel={m.help_search_submit({}, options)}
		listLabel={m.help_suggestions_label({}, options)}
		{groups}
		allLabel={suggestions.length > FAQ_SUGGESTION_LIMIT
			? m.help_suggestions_all({ count: String(suggestions.length) }, options)
			: undefined}
		emptyLabel={m.help_suggestions_none({}, options)}
		suggests={!phone}
		onInput={filterAsTyped}
		onSubmit={submit}
		onPick={(option) => {
			typed = '';
			void reveal(option.id, true).then(() => replaceState(here(`#${option.id}`), page.state));
		}}
		onClear={clearSearch}
		keep={{ topic: topic?.id }}
		testId="help-search"
	/>
{/snippet}
{#snippet topicChips()}
	<Chip
		label={m.help_topic_all({}, options)}
		href={helpHref({ q: query || null })}
		selected={!topic}
		variant="tinted"
		phoneVariant="outline"
		textClass={!topic ? 'text-body-sm font-semibold' : 'text-body-sm font-normal'}
		data-sveltekit-noscroll
		data-sveltekit-keepfocus
	/>
	{#each faq.topics as entry (entry.id)}
		<Chip
			label={entry.label}
			href={helpHref({ q: query || null, topic: entry.id })}
			selected={topic?.id === entry.id}
			variant="tinted"
			phoneVariant="outline"
			textClass={topic?.id === entry.id ? 'text-body-sm font-semibold' : 'text-body-sm font-normal'}
			lang={contentLang}
			data-sveltekit-noscroll
			data-sveltekit-keepfocus
		/>
	{/each}
{/snippet}

<!-- 🔴 U-60.1 (wave 1.5, screen 8, the prototype 08 Π1–Π8): ONE page. From 744 the list's head in the centre — «Πώς
     μπορούμε να βοηθήσουμε;», the search pill with its suggestions, the topics' chips (links, `?topic=`); then in a
     column of 720 «Δημοφιλείς ερωτήσεις» (the CMS's marks), a topic per H2 with its questions as accordions, and «Δεν
     βρήκατε απάντηση;». Below 744 the application's bar names the page (U-60.3 Ε2). The text is the server's. -->
<div data-testid="help-center" class="pb-section-lg">
	<PageBar
		{backHref}
		backLabel={m.document_back({}, options)}
		title={m.nav_help({}, options)}
		look="app"
		testId="help-bar"
	/>

	<div
		class="px-gutter-sm tablet:px-profile-gutter tablet:pt-reading-gap laptop:px-profile-gutter-lg"
	>
		<ListHeader
			title={m.help_title({}, options)}
			titleClass="max-tablet:sr-only"
			chipsLabel={m.help_topics_label({}, options)}
			search={structured ? searchField : undefined}
			chips={structured ? topicChips : undefined}
			chosen={topic?.id ?? null}
			testId="help-header"
		>
			{#snippet below()}
				{#if contentLang}
					<p
						data-slot="help-language"
						class="mt-4 flex flex-row items-center justify-center gap-2 text-body-sm text-muted-foreground"
					>
						<Ionicon name="globe-outline" class="icon-sm shrink-0" />
						{m.help_language_note({}, options)}
					</p>
				{/if}
			{/snippet}
		</ListHeader>

		<div class="mx-auto mt-reading-gap w-full max-w-document-wide">
			{#if !ready}
				<StatePanel
					glyph="cloud-offline-outline"
					title={m.help_error_title({}, options)}
					description={m.help_error_body({}, options)}
					actionLabel={m.help_retry({}, options)}
					onAction={onRetry}
					testId="help-error"
					actionTestId="help-retry"
				/>
			{:else if faq.shape === 'empty'}
				<StatePanel
					glyph="help-circle-outline"
					title={m.help_none_title({}, options)}
					testId="help-none"
				/>
			{:else if faq.shape === 'text'}
				<!-- 🔴 MAJOR-1 of r1 (app = web): the CMS page without its H2/H3 structure is its text, as a legal one. -->
				<RichText
					blocks={faq.body}
					variant="legal"
					{internalHref}
					lang={contentLang}
					testId="help-text"
				/>
			{:else if searching}
				{#key `${query}|${topic?.id ?? ''}`}
					<div class="transition-opacity duration-standard ease-standard starting:opacity-0">
						{#if hits.length === 0}
							<StatePanel
								glyph="search"
								title={m.help_empty_title({ query }, options)}
								description={m.help_empty_body({}, options)}
								actionLabel={m.common_clear_search({}, options)}
								actionHref={helpHref({ topic: topic?.id ?? null })}
								testId="help-empty"
							/>
						{:else}
							<p role="status" class="mb-2 text-center text-body-lg text-foreground">
								{hits.length === 1
									? m.help_results_one({ count: '1', query }, options)
									: m.help_results_other({ count: String(hits.length), query }, options)}
							</p>
							<div lang={contentLang} data-testid="help-results">
								{#each hits as hit, index (hit.question.id)}
									<Question
										question={hit.question}
										eyebrow={hit.topic.title}
										highlight={words}
										open={index === 0}
										{internalHref}
										{onToggle}
									/>
								{/each}
							</div>
						{/if}
					</div>
				{/key}
			{:else}
				{#key topic?.id ?? ''}
					<div class="transition-opacity duration-standard ease-standard starting:opacity-0">
						{#if !topic && faq.popular.length > 0}
							<section aria-labelledby="help-popular" data-testid="help-popular" lang={contentLang}>
								<h2
									id="help-popular"
									class="text-heading-md text-foreground tablet:text-heading-sm"
									lang={contentLang ? locale : undefined}
								>
									{m.help_popular_title({}, options)}
								</h2>
								<ul class="mt-2 grid grid-cols-1 gap-x-section tablet:grid-cols-2">
									{#each faq.popular as item (item.id)}
										<li>
											<a
												href={`#${item.id}`}
												onclick={(event) => jump(event, item.id)}
												class="flex min-h-touch w-full flex-col border-b border-border/60 pt-5 pb-6 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:[&>span:first-child]:decoration-2"
											>
												<span
													class="text-title-xs font-normal text-foreground tablet:text-body-lg tablet:font-semibold tablet:underline"
													>{item.question}</span
												>
												<span class="mt-1.5 line-clamp-2 text-body-sm text-muted-foreground"
													>{item.answerText}</span
												>
											</a>
										</li>
									{/each}
								</ul>
							</section>
						{/if}
						{#each topic ? [topic] : faq.topics as entry (entry.id)}
							<section
								id={entry.id}
								aria-labelledby={`${entry.id}-title`}
								lang={contentLang}
								data-testid="help-topic"
								class="mt-reading-more scroll-mt-card-sticky-top first:mt-0"
							>
								<h2
									id={`${entry.id}-title`}
									class="text-heading-md text-foreground tablet:text-heading-sm"
								>
									{entry.title}
								</h2>
								<div class="mt-2">
									{#each entry.questions as item (item.id)}
										<Question question={item} {internalHref} {onToggle} />
									{/each}
								</div>
							</section>
						{/each}
					</div>
				{/key}
			{/if}

			<section
				aria-labelledby="help-contact"
				data-testid="help-contact"
				class="mt-reading-more border-t border-border/60 pt-reading-gap"
			>
				<h2 id="help-contact" class="text-heading-md text-foreground tablet:text-heading-sm">
					{m.help_contact_title({}, options)}
				</h2>
				<p class="mt-2 text-body-lg text-muted-foreground">{m.help_contact_body({}, options)}</p>
				<!-- U-58.1 (Π6): below 744 the application's `ProfileMenuRow` (the envelope 24, the words 17, the chevron 20,
				     48 and more); from 744 the outline pill. -->
				<a
					href={`mailto:${supportEmail}`}
					data-testid="help-contact-row"
					class="mt-3 flex min-h-touch w-full flex-row items-center gap-3 py-3 text-title-xs font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:hidden"
				>
					<Ionicon name="mail-outline" class="icon-lg shrink-0 text-foreground" />
					<span class="min-w-0 flex-1">{m.help_contact_action({}, options)}</span>
					<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
				</a>
				<Button
					tone="outline"
					radius="full"
					href={`mailto:${supportEmail}`}
					label={m.help_contact_action({}, options)}
					textClass="text-body-md"
					class="mt-5 max-tablet:hidden"
					data-testid="help-contact-email"
				>
					{#snippet leading()}
						<Ionicon name="mail-outline" class="icon-md text-foreground" />
					{/snippet}
				</Button>
			</section>
		</div>
	</div>
</div>
