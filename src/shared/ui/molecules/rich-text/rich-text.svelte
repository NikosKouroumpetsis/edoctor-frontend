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
		/**
		 * 🔴 D-W52-104 (U-222.4): words a person wrote for the site (an article): every outside link opens in a new tab
		 * with `rel="nofollow ugc noopener noreferrer"`.
		 */
		userContent?: boolean;
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
	import { SvelteSet } from 'svelte/reactivity';
	import { buildRichText } from '$shared/lib/rich-text';
	import { Picture } from '$shared/ui/icons/picture';
	import RichTextVideo from './rich-text-video.svelte';
	import { highlightSearch } from '$shared/lib/text';
	import { cn } from '$shared/lib/utils';

	let {
		document,
		blocks,
		variant = 'document',
		internalHref,
		lang,
		highlight = [],
		userContent = false,
		class: className,
		testId
	}: RichTextProps = $props();

	const shown = $derived(blocks ?? buildRichText(document).blocks);
	const look = $derived(looks[variant]);
	// A picture that does not load leaves its place (never a broken image, never its words in a band).
	const failed = new SvelteSet<string>();
	const hrefOf = (link: RichTextLink) =>
		!link.external && link.href.startsWith('/') && internalHref
			? internalHref(link.href)
			: link.href;
</script>

<!-- 🔴 Common v2 §B (app = web): the allowlist only — paragraphs, headings 2–4 (the ids the page's ToC links to), lists,
     bold, italic and the safe links of `safeRichTextHref` (an external one in a new tab). Never raw HTML: every word is
     a text node. A link is a word of its sentence (WCAG 2.5.8 «inline», `touch-targets.test.ts`). 🔴 D-W52-104: the blocks
     of an article of the closed schema too — underline, strike, highlight, line breaks, a quote, «Σημαντικό», a rule, an
     uploaded image with its caption, a video that loads only when pressed, a table — each its own element, nothing else. -->
{#snippet words(
	text: string
)}{#if highlight.length > 0}{#each highlightSearch(text, highlight) as part, index (index)}{#if part.match}<mark
					class="bg-transparent font-bold text-inherit">{part.text}</mark
				>{:else}{part.text}{/if}{/each}{:else}{text}{/if}{/snippet}

{#snippet decorated(run: RichTextRun)}{#if run.highlight}<mark
			data-slot="rich-text-highlight"
			class="rounded-xs bg-warning/25 px-0.5 text-inherit">{@render lined(run)}</mark
		>{:else}{@render lined(run)}{/if}{/snippet}

{#snippet lined(run: RichTextRun)}{#if run.underline && run.strike}<u
			><s>{@render words(run.text)}</s></u
		>{:else if run.underline}<u>{@render words(run.text)}</u>{:else if run.strike}<s
			>{@render words(run.text)}</s
		>{:else}{@render words(run.text)}{/if}{/snippet}

{#snippet runs(list: RichTextRun[])}{#each list as run, index (index)}{#if run.break}<br
			/>{:else if run.bold && run.italic}<strong class="font-semibold"
				><em>{@render decorated(run)}</em></strong
			>{:else if run.bold}<strong class="font-semibold">{@render decorated(run)}</strong
			>{:else if run.italic}<em>{@render decorated(run)}</em>{:else}{@render decorated(
				run
			)}{/if}{/each}{/snippet}

{#snippet spans(list: RichTextSpan[])}{#each list as span, index (index)}{#if span.link}<a
				href={hrefOf(span.link)}
				target={span.link.external ? '_blank' : undefined}
				rel={span.link.external
					? userContent
						? 'nofollow ugc noopener noreferrer'
						: 'noopener noreferrer'
					: undefined}
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
		{:else if block.kind === 'list'}
			<svelte:element
				this={block.ordered ? 'ol' : 'ul'}
				start={block.start}
				data-slot="rich-text-list"
				class={cn(look.list, block.ordered ? 'list-decimal' : 'list-disc')}
			>
				{#each block.items as item (item.key)}
					<li class={look.item}>{@render blockList(item.blocks, true)}</li>
				{/each}
			</svelte:element>
		{:else if block.kind === 'quote'}
			<blockquote
				data-slot="rich-text-quote"
				class={cn(look.paragraph, 'border-l-2 border-line-2 pl-4 text-muted-foreground italic')}
			>
				{@render blockList(block.blocks, true)}
			</blockquote>
		{:else if block.kind === 'callout'}
			<aside
				data-slot="rich-text-callout"
				class={cn(look.paragraph, 'rounded-md border border-warning/40 bg-warning/10 px-4 py-3')}
			>
				{@render blockList(block.blocks, true)}
			</aside>
		{:else if block.kind === 'rule'}
			<hr data-slot="rich-text-rule" class="my-6 border-border" />
		{:else if block.kind === 'image'}
			<figure data-slot="rich-text-image" class="my-6">
				{#if failed.has(block.url)}
					<!-- `64-switch/sw.css:668` `.w-arpic`: the picture's place, 16:9 on the muted surface with its glyph. -->
					<span
						role="img"
						aria-label={block.alt}
						data-slot="rich-text-image-missing"
						class="flex aspect-video max-h-figure-max w-full items-center justify-center rounded-lg bg-muted text-line-2"
					>
						<Picture />
					</span>
				{:else}
					<img
						src={block.url}
						alt={block.alt}
						width={block.width ?? undefined}
						height={block.height ?? undefined}
						loading="lazy"
						decoding="async"
						onerror={() => failed.add(block.url)}
						class="h-auto w-full rounded-lg bg-muted"
					/>
				{/if}
				{#if block.caption}
					<figcaption class="mt-2 text-label-lg text-muted-foreground">{block.caption}</figcaption>
				{/if}
			</figure>
		{:else if block.kind === 'video'}
			<RichTextVideo name={block.name} embedUrl={block.embedUrl} />
		{:else if block.kind === 'table'}
			<div data-slot="rich-text-table" class={cn(look.paragraph, 'scrollbar-none overflow-x-auto')}>
				<table class="w-full border-collapse text-body-md">
					<tbody>
						{#each block.rows as row (row.key)}
							<tr>
								{#each row.cells as cell (cell.key)}
									{#if cell.header}
										<th
											scope="col"
											class="border border-border bg-muted px-3 py-2 text-left align-top font-semibold"
										>
											{@render blockList(cell.blocks, true)}
										</th>
									{:else}
										<td class="border border-border px-3 py-2 text-left align-top">
											{@render blockList(cell.blocks, true)}
										</td>
									{/if}
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
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
