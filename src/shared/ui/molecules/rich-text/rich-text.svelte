<script lang="ts" module>
	import type {
		RichTextBlock,
		RichTextHeadingLevel,
		RichTextInput,
		RichTextLink,
		RichTextRun,
		RichTextSpan
	} from '$shared/lib/rich-text';

	/**
	 * The reading sizes of the approved prototypes: `article` 18/28 (06), `document` 16/26 (07 from 744, 10 at every
	 * width), `legal` the same from 744 and the application's text page below it (U-58.3: 16/28 muted, H2 24, 32
	 * apart), `answer` an FAQ answer (08: 16/26 muted, 12 between paragraphs).
	 */
	export type RichTextVariant = 'article' | 'document' | 'legal' | 'answer';

	export type RichTextProps = {
		/** A document the backend sends (or several, read as one: an article's sections). */
		document?: RichTextInput;
		/** Blocks already built by `buildRichText` (an FAQ's answer); they win over `document`. */
		blocks?: readonly RichTextBlock[];
		variant?: RichTextVariant;
		/** A path of this site (`/…`) as the page links it (its language); left as it is by default. */
		internalHref?: (path: string) => string;
		/** The language of the words when it is not the page's (the CMS's fallback, U-59.4). */
		lang?: string;
		/** The folded words of a search (`searchWords`): their places in the text bold (an FAQ result, U-60.1 Π4). */
		highlight?: readonly string[];
		class?: string;
		testId?: string;
	};

	type Look = {
		box: string;
		paragraph: string;
		list: string;
		item: string;
		headings: Record<RichTextHeadingLevel, string>;
	};

	// Where an anchor stops: under the phone's bar and the sticky ToC row, and from 744 under the top bar (104).
	const anchorStop = 'scroll-mt-document tablet:scroll-mt-card-sticky-top';

	const looks: Record<RichTextVariant, Look> = {
		article: {
			box: 'text-article-body text-foreground',
			paragraph: 'mb-5 last:mb-0',
			list: 'mb-5 pl-6 last:mb-0',
			item: 'mb-3 pl-1 last:mb-0',
			headings: {
				2: 'mt-reading-gap mb-4 text-heading-md font-bold first:mt-0 tablet:mt-section-lg tablet:text-heading-lg tablet:font-bold',
				3: 'mt-section mb-3 text-title-lg first:mt-0',
				4: 'mt-6 mb-2 text-title-sm first:mt-0'
			}
		},
		document: {
			box: 'text-document-body text-foreground',
			paragraph: 'mb-4 last:mb-0',
			list: 'mb-4 pl-6 last:mb-0',
			item: 'mb-2.5 pl-1 last:mb-0',
			headings: {
				2: 'mt-reading-gap-sm mb-3 text-heading-sm first:mt-0',
				3: 'mt-6 mb-2 text-title-sm first:mt-0',
				4: 'mt-5 mb-2 text-title-xs first:mt-0'
			}
		},
		legal: {
			box: 'text-body-lg leading-relaxed text-muted-foreground tablet:text-document-body tablet:text-foreground',
			paragraph: 'mb-section last:mb-0 tablet:mb-4',
			list: 'mb-section pl-6 last:mb-0 tablet:mb-4',
			item: 'mb-2.5 pl-1 last:mb-0',
			headings: {
				2: 'mb-section text-heading-md text-foreground tablet:mt-reading-gap-sm tablet:mb-3 tablet:text-heading-sm tablet:first:mt-0',
				3: 'mb-4 text-title-sm text-foreground tablet:mt-6 tablet:mb-2 tablet:first:mt-0',
				4: 'mb-3 text-title-xs text-foreground tablet:mt-5 tablet:mb-2 tablet:first:mt-0'
			}
		},
		answer: {
			box: 'flex flex-col gap-3 text-document-body text-muted-foreground',
			paragraph: '',
			list: 'pl-6',
			item: 'mb-2 pl-1 last:mb-0',
			headings: {
				2: 'text-title-sm text-foreground',
				3: 'text-title-xs text-foreground',
				4: 'text-title-xs text-foreground'
			}
		}
	};
</script>

<script lang="ts">
	import { buildRichText } from '$shared/lib/rich-text';
	import { highlightSearch } from '$shared/lib/text';
	import { cn } from '$shared/lib/utils';

	let {
		document,
		blocks,
		variant = 'document',
		internalHref,
		lang,
		highlight = [],
		class: className,
		testId
	}: RichTextProps = $props();

	const shown = $derived(blocks ?? buildRichText(document).blocks);
	const look = $derived(looks[variant]);
	const hrefOf = (link: RichTextLink) =>
		!link.external && link.href.startsWith('/') && internalHref
			? internalHref(link.href)
			: link.href;
</script>

<!-- 🔴 Common v2 §B (app = web): the allowlist only — paragraphs, headings 2–4 (the ids the page's ToC links to), lists,
     bold, italic and the safe links of `safeRichTextHref` (an external one in a new tab). Never raw HTML: every word is
     a text node. A link is a word of its sentence (WCAG 2.5.8 «inline», `touch-targets.test.ts`). -->
{#snippet words(
	text: string
)}{#if highlight.length > 0}{#each highlightSearch(text, highlight) as part, index (index)}{#if part.match}<mark
					class="bg-transparent font-bold text-inherit">{part.text}</mark
				>{:else}{part.text}{/if}{/each}{:else}{text}{/if}{/snippet}

{#snippet runs(
	list: RichTextRun[]
)}{#each list as run, index (index)}{#if run.bold && run.italic}<strong class="font-semibold"
				><em>{@render words(run.text)}</em></strong
			>{:else if run.bold}<strong class="font-semibold">{@render words(run.text)}</strong
			>{:else if run.italic}<em>{@render words(run.text)}</em>{:else}{@render words(
				run.text
			)}{/if}{/each}{/snippet}

{#snippet spans(list: RichTextSpan[])}{#each list as span, index (index)}{#if span.link}<a
				href={hrefOf(span.link)}
				target={span.link.external ? '_blank' : undefined}
				rel={span.link.external ? 'noopener noreferrer' : undefined}
				data-slot="rich-text-link"
				class="font-medium text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:decoration-2"
				>{@render runs(span.runs)}</a
			>{:else}{@render runs(span.runs)}{/if}{/each}{/snippet}

{#snippet blockList(list: readonly RichTextBlock[], nested: boolean)}
	{#each list as block (block.key)}
		{#if block.kind === 'heading'}
			<svelte:element
				this={`h${block.level}`}
				id={block.id}
				data-slot="rich-text-heading"
				class={cn(look.headings[block.level], anchorStop)}
			>
				{block.text}
			</svelte:element>
		{:else if block.kind === 'paragraph'}
			<p data-slot="rich-text-paragraph" class={nested ? undefined : look.paragraph}>
				{@render spans(block.spans)}
			</p>
		{:else}
			<svelte:element
				this={block.ordered ? 'ol' : 'ul'}
				data-slot="rich-text-list"
				class={cn(look.list, block.ordered ? 'list-decimal' : 'list-disc')}
			>
				{#each block.items as item (item.key)}
					<li class={look.item}>{@render blockList(item.blocks, true)}</li>
				{/each}
			</svelte:element>
		{/if}
	{/each}
{/snippet}

<div
	data-slot="rich-text"
	data-variant={variant}
	data-testid={testId}
	{lang}
	class={cn('min-w-0 wrap-break-word', look.box, className)}
>
	{@render blockList(shown, false)}
</div>
