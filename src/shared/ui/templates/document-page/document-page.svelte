<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/** One step of the breadcrumbs: a link, or the words alone (the page itself: no `href`). */
	export type DocumentPageCrumb = { label: string; href?: string };

	/** One entry of «Σε αυτό το …»: a heading's id in the body and its words. */
	export type DocumentPageTocEntry = { id: string; label: string };

	/**
	 * Below 744: `web` the template itself (the article, the deletion page: «‹» with the title rising into the bar, the
	 * sticky «Σε αυτό το …» row and its sheet); `app` the application's text page (U-58.3, the legal texts: «‹» and the
	 * title in the bar, the blocks 32 apart, no ToC, no cards, no «↑»).
	 */
	export type DocumentPagePhone = 'web' | 'app';

	export type DocumentPageProps = {
		/** From 744 only; a step without `href` is the page itself (muted, `aria-current`). */
		breadcrumbs?: readonly DocumentPageCrumb[];
		/** The breadcrumbs' landmark name (the caller's words). */
		breadcrumbsLabel?: string;
		/** The small muted line over the title (the kind of text: «Νομικά»). */
		eyebrow?: string;
		/** The page's one `h1`. */
		title: string;
		/** The line under the title (an article's excerpt, 20 · 22 from 744). */
		subtitle?: string;
		/** An introduction under the title, in the body's size (the deletion page). */
		lead?: string;
		/** The line under the title (author · date · reading time, version · in force from). */
		meta?: Snippet;
		/** Beside the meta line from 744 («Κοινοποίηση»). */
		metaAction?: Snippet;
		/** Notices over the text (the kit's `Banner` info, U-59.2). */
		notices?: Snippet;
		/** The text's language note («Το κείμενο είναι διαθέσιμο μόνο στα Ελληνικά.», U-59.4). */
		languageNote?: string;
		/** What comes between the head and the text (an article's photo). */
		media?: Snippet;
		/** «Σε αυτό το …»: drawn only with two entries or more (common v2 §A). */
		toc?: readonly DocumentPageTocEntry[];
		/** The ToC's title (the caller's words, required with a `toc`). */
		tocTitle?: string;
		/** The body. */
		children: Snippet;
		/** After the body, in the text column (an article's note). */
		end?: Snippet;
		/** The cards: from 1128 in the sticky aside under the ToC, below 1128 at the end of the text column. */
		cards?: Snippet;
		/** The aside's landmark name. */
		asideLabel?: string;
		/** Under the text and the aside, the page's whole width («Περισσότερα άρθρα»). */
		footer?: Snippet;
		/** Below 744, the bar's «‹»: where it leads and its words. */
		backHref?: string;
		backLabel?: string;
		/** A plain press of «‹» (the caller may go back in the history instead). */
		onBack?: (event: MouseEvent) => void;
		/** Below 744, the bar's trailing buttons (share). */
		barActions?: Snippet;
		/** «↑ Επιστροφή στην κορυφή»: drawn only with its words. */
		backToTopLabel?: string;
		/** After a ToC entry is followed (the caller writes the anchor into the address). */
		onAnchor?: (id: string) => void;
		phone?: DocumentPagePhone;
		class?: string;
		testId?: string;
	};

	/** 🔴 Common v2 §A (app = web): «Σε αυτό το …» only with two headings or more. */
	export const DOCUMENT_PAGE_TOC_MIN = 2;

	/** «↑ Επιστροφή στην κορυφή» shows after this many screens of scrolling (the prototype 07's Π7). */
	export const DOCUMENT_PAGE_TOP_AFTER_SCREENS = 2;

	/**
	 * The heading being read: the last of `tops` (each heading's distance from the top of the window, in order) that has
	 * reached the line where an anchor would stop it (`lines`, its own scroll margin). `null` above the first.
	 */
	export function readingHeading(
		entries: readonly { id: string; top: number; line: number }[]
	): string | null {
		let current: string | null = null;
		for (const entry of entries) if (entry.top <= entry.line + 1) current = entry.id;
		return current;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { BottomSheet, BottomSheetTitle } from '$shared/ui/molecules/bottom-sheet';
	import { Breadcrumbs } from '$shared/ui/molecules/breadcrumbs';
	import { PageBar } from '$shared/ui/organisms/page-bar';

	let {
		breadcrumbs = [],
		breadcrumbsLabel,
		eyebrow,
		title,
		subtitle,
		lead,
		meta,
		metaAction,
		notices,
		languageNote,
		media,
		toc = [],
		tocTitle,
		children,
		end,
		cards,
		asideLabel,
		footer,
		backHref,
		backLabel,
		onBack,
		barActions,
		backToTopLabel,
		onAnchor,
		phone = 'web',
		class: className,
		testId
	}: DocumentPageProps = $props();

	const ids = $props.id();
	const tocId = `${ids}-toc`;
	const asideTocId = `${ids}-aside-toc`;
	const showsToc = $derived(toc.length >= DOCUMENT_PAGE_TOC_MIN);
	const app = $derived(phone === 'app');

	let titleNode = $state<HTMLElement | null>(null);
	let sheetOpen = $state(false);
	let current = $state<string | null>(null);
	let showTop = $state(false);

	const currentLabel = $derived(toc.find((entry) => entry.id === current)?.label ?? '');

	function measure() {
		showTop = window.scrollY > window.innerHeight * DOCUMENT_PAGE_TOP_AFTER_SCREENS;
		if (!showsToc) return;
		const entries = toc.flatMap(({ id }) => {
			const heading = document.getElementById(id);
			if (!heading) return [];
			const line = Number.parseFloat(getComputedStyle(heading).scrollMarginTop) || 0;
			return [{ id, top: heading.getBoundingClientRect().top, line }];
		});
		current = readingHeading(entries);
	}

	onMount(() => {
		let frame = 0;
		const schedule = () => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				measure();
			});
		};
		measure();
		window.addEventListener('scroll', schedule, { passive: true });
		return () => {
			window.removeEventListener('scroll', schedule);
			if (frame) cancelAnimationFrame(frame);
		};
	});

	/** A plain press of a ToC entry glides to its heading (U-12: the motion always shows) and names it in the address. */
	function follow(event: MouseEvent, id: string) {
		sheetOpen = false;
		if (event.defaultPrevented || event.button !== 0) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const heading = document.getElementById(id);
		if (!heading) return;
		event.preventDefault();
		heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
		onAnchor?.(id);
	}

	function toTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	const focusRing = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<!-- 🔴 Common v2 §A (U-57.4, U-59.1, U-62.1; the approved prototypes 06/07/10): ONE text page. From 744 the breadcrumbs
     (12, «›»), the eyebrow, the h1 (40), the meta line, the notices, the text column (600 from 1128 beside the sticky
     aside 320 at 104; 568 = `container-dialog` at 744–1127 with «Σε αυτό το …» as a box over the text); below 744 the
     «‹» bar and, on the web's own pages, the sticky row (52) that opens the sheet. The zones are CSS only (U-03.1). -->
<div
	data-slot="document-page"
	data-phone={phone}
	data-testid={testId}
	class={cn('w-full', className)}
>
	{#if backHref}
		<PageBar
			{backHref}
			backLabel={backLabel ?? ''}
			{onBack}
			{title}
			watch={app ? undefined : titleNode}
			look={app ? 'app' : 'web'}
			actions={barActions}
			testId="document-page-bar"
		/>
	{/if}

	<!-- MINOR-8 of r1: the page's end keeps the lists' room above the footer (`pb-section-lg`), in every use. -->
	<div class="px-gutter-sm pb-section-lg tablet:px-profile-gutter laptop:px-profile-gutter-lg">
		<div class="mx-auto w-full max-w-listing">
			{#if breadcrumbs.length > 0}
				<Breadcrumbs crumbs={breadcrumbs} label={breadcrumbsLabel ?? ''} />
			{/if}

			<div
				class="laptop:grid laptop:grid-cols-[minmax(0,var(--spacing-document-column))_minmax(var(--spacing-section-lg),1fr)_var(--spacing-document-aside)]"
			>
				<article
					data-slot="document-page-main"
					class="min-w-0 tablet:mx-auto tablet:max-w-dialog laptop:col-start-1 laptop:row-start-1 laptop:mx-0 laptop:max-w-none"
				>
					<header
						data-slot="document-page-header"
						class={cn('tablet:pt-reading-gap', app ? 'pt-3' : 'pt-4')}
					>
						{#if eyebrow}
							<p
								data-slot="document-page-eyebrow"
								class={cn(
									'mb-2 text-body-sm font-medium text-muted-foreground',
									app && 'hidden tablet:block'
								)}
							>
								{eyebrow}
							</p>
						{/if}
						<h1
							bind:this={titleNode}
							class={cn(
								'text-heading-xl font-bold text-balance wrap-break-word text-foreground tablet:text-display-md',
								app && 'max-tablet:sr-only'
							)}
						>
							{title}
						</h1>
						{#if subtitle}
							<p
								data-slot="document-page-subtitle"
								class="mt-3 text-title-lg font-normal text-muted-foreground tablet:mt-4 tablet:text-heading-sm tablet:font-normal"
							>
								{subtitle}
							</p>
						{/if}
						{#if lead}
							<p data-slot="document-page-lead" class="mt-5 text-document-body text-foreground">
								{lead}
							</p>
						{/if}
						{#if meta || metaAction}
							<div
								class={cn(
									'flex flex-row items-center justify-between gap-4 tablet:mt-6',
									app ? 'max-tablet:mt-0' : 'mt-5'
								)}
							>
								{#if meta}
									<p data-slot="document-page-meta" class="text-body-sm text-muted-foreground">
										{@render meta()}
									</p>
								{/if}
								{#if metaAction}
									<div class="-mr-2 hidden shrink-0 tablet:flex">{@render metaAction()}</div>
								{/if}
							</div>
						{/if}
					</header>

					{#if notices}
						<div
							data-slot="document-page-notices"
							class={cn('flex flex-col gap-3 tablet:mt-6', app ? 'mt-section' : 'mt-6')}
						>
							{@render notices()}
						</div>
					{/if}

					{#if languageNote}
						<p
							data-slot="document-page-language"
							class={cn(
								'mt-4 flex-row items-center gap-2 text-body-sm text-muted-foreground',
								app ? 'hidden tablet:flex' : 'flex'
							)}
						>
							<Ionicon name="globe-outline" class="icon-sm shrink-0" />
							{languageNote}
						</p>
						{#if app}
							<p
								data-slot="document-page-language-phone"
								class="mt-section rounded-md bg-foreground/6 px-3 py-2.5 text-label-lg text-foreground tablet:hidden"
							>
								{languageNote}
							</p>
						{/if}
					{/if}

					{#if media}
						<div data-slot="document-page-media" class="mt-6 tablet:mt-reading-gap">
							{@render media()}
						</div>
					{/if}

					{#if showsToc}
						{#if !app}
							<div
								data-slot="document-page-toc-row"
								class="sticky top-bar-top z-20 -mx-gutter-sm mt-6 border-y border-border/60 bg-card tablet:hidden"
							>
								<button
									type="button"
									aria-haspopup="dialog"
									onclick={() => (sheetOpen = true)}
									class={cn(
										'flex min-h-reading-row w-full flex-row items-center justify-between gap-3 px-gutter-sm text-left',
										focusRing
									)}
								>
									<span class="flex min-w-0 flex-col">
										<span class="text-body-md font-semibold text-foreground">{tocTitle}</span>
										<span
											class={cn(
												'truncate text-label-md font-normal text-muted-foreground transition-opacity duration-label ease-standard',
												currentLabel ? 'opacity-100' : 'h-0 opacity-0'
											)}>{currentLabel}</span
										>
									</span>
									<Ionicon name="list-outline" class="icon-lg shrink-0 text-foreground" />
								</button>
							</div>
						{/if}

						<nav
							aria-labelledby={tocId}
							data-slot="document-page-toc-box"
							class="mt-section hidden rounded-lg border border-border px-6 pt-4 pb-3 tablet:block laptop:hidden"
						>
							<p id={tocId} class="text-body-sm font-semibold text-muted-foreground">{tocTitle}</p>
							<ul class="flex flex-col">
								{#each toc as entry (entry.id)}
									<li>
										<a
											href={`#${entry.id}`}
											onclick={(event) => follow(event, entry.id)}
											class={cn(
												'flex min-h-touch min-w-touch flex-row items-center gap-2.5 text-body-lg font-medium text-foreground underline can-hover:hover:decoration-2',
												focusRing
											)}
										>
											<Ionicon name="bookmark" class="icon-sm shrink-0 text-foreground" />
											<span>{entry.label}</span>
										</a>
									</li>
								{/each}
							</ul>
						</nav>
					{/if}

					<div
						data-slot="document-page-body"
						class={cn('tablet:mt-reading-gap', app ? 'mt-section' : 'mt-section')}
					>
						{@render children()}
					</div>

					{@render end?.()}

					{#if cards}
						<div
							data-slot="document-page-cards"
							class={cn(
								'mt-reading-gap flex flex-col gap-section laptop:hidden',
								app && 'max-tablet:hidden'
							)}
						>
							{@render cards()}
						</div>
					{/if}
				</article>

				{#if showsToc || cards}
					<aside
						aria-label={asideLabel}
						data-slot="document-page-aside"
						class="hidden pt-reading-gap laptop:col-start-3 laptop:row-start-1 laptop:block"
					>
						<div class="sticky top-card-sticky-top flex flex-col gap-section">
							{#if showsToc}
								<nav aria-labelledby={asideTocId} data-slot="document-page-toc">
									<p id={asideTocId} class="mb-2 text-body-sm font-semibold text-muted-foreground">
										{tocTitle}
									</p>
									<ul class="flex flex-col">
										{#each toc as entry (entry.id)}
											<li>
												<a
													href={`#${entry.id}`}
													aria-current={current === entry.id ? 'location' : undefined}
													onclick={(event) => follow(event, entry.id)}
													class={cn(
														'flex min-h-touch w-full flex-row items-center border-b border-border/60 px-3.5 py-2.5 text-body-md text-foreground transition-colors duration-label ease-standard can-hover:hover:bg-background',
														current === entry.id &&
															'bg-muted-foreground/8 font-semibold can-hover:hover:bg-muted-foreground/8',
														focusRing
													)}>{entry.label}</a
												>
											</li>
										{/each}
									</ul>
								</nav>
							{/if}
							{#if cards}
								{@render cards()}
							{/if}
						</div>
					</aside>
				{/if}
			</div>

			{#if footer}
				<div data-slot="document-page-footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>

	{#if backToTopLabel}
		<button
			type="button"
			data-slot="document-page-to-top"
			data-shown={showTop ? 'true' : undefined}
			aria-hidden={showTop ? undefined : 'true'}
			tabindex={showTop ? 0 : -1}
			onclick={toTop}
			class={cn(
				'pointer-events-none fixed bottom-above-tab-bar left-1/2 z-40 inline-flex min-h-touch min-w-touch -translate-x-1/2 translate-y-3 flex-row items-center gap-2 rounded-full bg-secondary pr-4.5 pl-3.5 text-body-sm font-semibold whitespace-nowrap text-secondary-foreground opacity-0 shadow-floating transition-[opacity,translate] duration-standard ease-standard tablet:right-6 tablet:bottom-6 tablet:left-auto tablet:translate-x-0',
				app && 'max-tablet:hidden',
				showTop && 'pointer-events-auto translate-y-0 opacity-100',
				focusRing
			)}
		>
			<Ionicon name="arrow-up" class="icon-sm" />
			{backToTopLabel}
		</button>
	{/if}

	{#if showsToc && !app}
		<BottomSheet bind:open={sheetOpen} aria-labelledby={`${ids}-sheet`} class="tablet:hidden">
			<div class="flex flex-col px-gutter-sm pb-section">
				<BottomSheetTitle id={`${ids}-sheet`} class="py-3 text-title-sm text-foreground">
					{tocTitle}
				</BottomSheetTitle>
				<ul class="flex flex-col">
					{#each toc as entry (entry.id)}
						<li>
							<a
								href={`#${entry.id}`}
								aria-current={current === entry.id ? 'location' : undefined}
								onclick={(event) => follow(event, entry.id)}
								class={cn(
									'flex min-h-touch w-full flex-row items-center gap-3 border-l-2 py-2.5 pl-3 text-body-lg text-foreground',
									current === entry.id ? 'border-primary font-semibold' : 'border-transparent',
									focusRing
								)}>{entry.label}</a
							>
						</li>
					{/each}
				</ul>
			</div>
		</BottomSheet>
	{/if}
</div>
