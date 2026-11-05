<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { m } from '$paraglide/messages.js';
	import { resolveMediaUrl } from '$shared/lib/http';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import {
		SearchPill,
		type SearchPillGroup,
		type SearchPillOption
	} from '$shared/ui/molecules/search-pill';
	import { StatePanel } from '$shared/ui/molecules/state-panel';
	import { ListHeader } from '$shared/ui/organisms/list-header';
	import { PageBar } from '$shared/ui/organisms/page-bar';
	import { Avatar, AvatarFallback, AvatarImage } from '$shared/ui/primitives/avatar';
	import { Button } from '$shared/ui/primitives/button';
	import { Chip } from '$shared/ui/primitives/chip';
	import { Spinner } from '$shared/ui/primitives/spinner';
	import { articleTypeLabel, articleTypeParam } from '$modules/articles/lib/article-list';
	import ArticleCard, { ArticleCardSkeleton } from '$modules/articles/ui/article-card';
	import { Breadcrumbs } from '$shared/ui/molecules/breadcrumbs';
	import Featured from '../components/featured.svelte';
	import { ArticlesListState } from '../hooks/use-list.svelte';
	import type { ArticlesListProps } from '../types';

	let {
		firstPage,
		scope,
		locale,
		listHref,
		articleHref,
		backHref,
		canonicalUrl,
		alternateUrls,
		author
	}: ArticlesListProps = $props();

	/** The skeleton's cards (the prototype's 8). */
	const PLACEHOLDERS = [0, 1, 2, 3, 4, 5, 6, 7];
	/** The suggestions shown: three services, five articles (U-57.3, the prototype's Π13). */
	const SERVICES_SHOWN = 3;
	const ARTICLES_SHOWN = 5;

	const options = $derived({ locale });
	const list = new ArticlesListState({
		locale: () => locale,
		scope: () => scope,
		firstPage: () => firstPage
	});
	list.typed = untrack(() => scope.q ?? '');

	const searching = $derived(Boolean(scope.q || scope.serviceId));
	const typeParam = $derived(articleTypeParam(scope.type));
	const title = $derived(author?.title ?? m.nav_articles({}, options));
	const metaTitle = $derived(
		author
			? m.articles_doctor_meta_title({ title: author.title, name: author.name }, options)
			: m.articles_meta_title({}, options)
	);
	const metaDescription = $derived(
		author
			? m.articles_doctor_meta_description({ name: author.sentenceName }, options)
			: m.articles_meta_description({}, options)
	);
	let grid = $state<HTMLElement | null>(null);

	const typeChips = $derived(
		([null, 'ARTICLE', 'HEALTH_ADVICE'] as const).map((type) => ({
			key: type ?? 'all',
			label:
				type === null
					? m.articles_filter_all({}, options)
					: type === 'ARTICLE'
						? m.articles_filter_article({}, options)
						: m.articles_filter_health_advice({}, options),
			href: listHref({ type: articleTypeParam(type), q: scope.q, service: scope.serviceId }),
			selected: scope.type === type
		}))
	);

	const groups = $derived.by<SearchPillGroup[]>(() => {
		const answer = list.suggestions;
		if (!answer) return [];
		return [
			{
				id: 'services',
				label: m.articles_suggest_services({}, options),
				options: answer.services.slice(0, SERVICES_SHOWN).map((service) => ({
					id: service.id,
					title: service.name,
					subtitle:
						service.count === 1
							? m.articles_suggest_service_one({ count: '1' }, options)
							: m.articles_suggest_service_other({ count: String(service.count) }, options),
					icon: 'medkit-outline' as const
				}))
			},
			{
				id: 'articles',
				label: m.articles_suggest_articles({}, options),
				options: answer.articles.slice(0, ARTICLES_SHOWN).map((article) => ({
					id: article.slug,
					title: article.title,
					subtitle: [articleTypeLabel(article.type, locale), article.serviceNames[0]]
						.filter(Boolean)
						.join(' · '),
					image: article.imageUrl ? resolveMediaUrl(article.imageUrl) : undefined,
					icon: 'document-text-outline' as const
				}))
			}
		];
	});

	const navigate = (href: ResolvedPathname) => goto(href, { keepFocus: true, noScroll: true });

	/** Enter or the magnifier (U-57.5 Ε5): the results of the words, the kind and the service kept. */
	function submit(words: string) {
		void navigate(listHref({ type: typeParam, q: words || null, service: scope.serviceId }));
	}

	/** A suggested service becomes the list's filter (its chip under the kinds); an article opens. */
	function pick(option: SearchPillOption, group: SearchPillGroup) {
		if (group.id === 'services') {
			list.typed = '';
			void navigate(listHref({ type: typeParam, service: option.id }));
		} else {
			void goto(articleHref(option.id));
		}
	}

	function clearWords() {
		if (scope.q) void navigate(listHref({ type: typeParam, service: scope.serviceId }));
	}

	/** «Εμφάνιση περισσότερων»: the next page at the press; the keyboard's focus then goes to the first new card. */
	async function showMore() {
		const before = grid?.querySelectorAll('[data-testid="article-card"]').length ?? 0;
		await list.loadMore();
		await tick();
		const links = grid?.querySelectorAll<HTMLAnchorElement>('[data-testid="article-card"] a');
		links?.[before]?.focus();
	}
</script>

<svelte:head>
	<title>{metaTitle}</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="el" href={alternateUrls.el} />
	<link rel="alternate" hreflang="en" href={alternateUrls.en} />
	<link rel="alternate" hreflang="x-default" href={alternateUrls.el} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content={canonicalUrl} />
</svelte:head>

<!-- U-77: a doctor with one kind has nothing to choose: no chips. -->
{#snippet chipRow()}
	{#each typeChips as chip (chip.key)}
		<Chip
			label={chip.label}
			href={chip.href}
			selected={chip.selected}
			variant="tinted"
			phoneVariant="outline"
			textClass={chip.selected ? 'text-body-sm font-semibold' : 'text-body-sm font-normal'}
			data-testid="articles-type-chip"
			data-sveltekit-noscroll
			data-sveltekit-keepfocus
		/>
	{/each}
{/snippet}

<!-- 🔴 U-57.2 / U-57.3 (wave 1.5, screen 6, the prototype 06 v3): from 744 the list — its head IN THE CENTRE (H1
     «Άρθρα υγείας» ⇒ the search pill with its suggestions ⇒ «Όλα · Άρθρα · Συμβουλές υγείας» ⇒ on its own line
     «Υπηρεσία: … ×»); the newest featured (never while searching); the grid 2/3/4 of the prototype's card; 12, then
     «Εμφάνιση περισσότερων»; while searching «N αποτελέσματα για «…»», nothing found ⇒ «Καθαρισμός αναζήτησης». Below
     744 the application's head (U-58.1: the name in the bar, its inset pill with the suggestions, the outline chips)
     and, on white, the prototype's list (🔴 U-63.2: the featured full width with its dark pill, the cards without
     frame, shadow or «Διαβάστε»). The kind, the words and the service are in the address. -->
<div data-testid="articles-list" class="pb-section-lg">
	<PageBar
		{backHref}
		backLabel={m.document_back({}, options)}
		{title}
		look="app"
		testId="articles-bar"
	/>
	<div class={cn('container-page', !author && 'tablet:pt-reading-gap')}>
		{#if author}
			<!-- U-77 (Π2): the page of ONE doctor: «Γιατροί › Dr. … › Άρθρα», 28 under the bar, from 744. -->
			<Breadcrumbs
				crumbs={[
					{ label: m.nav_doctors({}, options), href: author.doctorsHref },
					{ label: author.name, href: author.profileHref },
					{ label: author.title }
				]}
				label={m.document_breadcrumbs_label({}, options)}
				testId="articles-breadcrumbs"
				class="mb-section"
			/>
		{/if}
		<div>
			<ListHeader
				{title}
				titleClass="max-tablet:sr-only"
				chipsLabel={m.articles_filter_label({}, options)}
				chosen={scope.type ?? 'all'}
				testId="articles-header"
				chips={!author || author.bothKinds ? chipRow : undefined}
			>
				{#snippet search()}
					{#if author}
						<a
							href={author.aboutHref}
							data-testid="articles-author"
							class="group flex min-h-control-xl w-full flex-row items-center gap-3 rounded-full text-left transition-colors duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:w-fit tablet:max-w-full tablet:px-2 tablet:can-hover:hover:bg-muted"
						>
							<Avatar size="lg" class="shrink-0">
								{#if author.photoUrl}
									<AvatarImage src={author.photoUrl} alt="" />
								{/if}
								<AvatarFallback>
									<Ionicon name="person-outline" class="icon-md" />
								</AvatarFallback>
							</Avatar>
							<span class="flex min-w-0 flex-1 flex-col text-left">
								<span class="truncate text-body-lg font-semibold text-foreground"
									>{author.name}</span
								>
								{#if author.specialty}
									<span class="truncate text-body-sm text-muted-foreground">{author.specialty}</span
									>
								{/if}
							</span>
							<Ionicon
								name="chevron-forward"
								class="icon-sm shrink-0 text-foreground transition-transform duration-standard ease-standard tablet:mr-2 can-hover:group-hover:translate-x-0.5"
							/>
						</a>
					{:else}
						<SearchPill
							bind:value={list.typed}
							placeholder={m.articles_search_placeholder({}, options)}
							clearLabel={m.common_clear_search({}, options)}
							submitLabel={m.articles_search_submit({}, options)}
							listLabel={m.articles_suggest_label({}, options)}
							{groups}
							ready={list.suggestionsReady}
							suggests={!list.suggestionsFailed}
							emptyLabel={m.articles_suggest_none({}, options)}
							onSubmit={submit}
							onPick={pick}
							onClear={clearWords}
							keep={{ type: typeParam, service: scope.serviceId }}
							testId="articles-search"
						/>
					{/if}
				{/snippet}
				{#snippet below()}
					{#if list.view?.appliedService}
						<div class="mt-1 flex w-full justify-start tablet:justify-center">
							<a
								href={listHref({ type: typeParam, q: scope.q })}
								data-testid="articles-service-chip"
								data-sveltekit-noscroll
								data-sveltekit-keepfocus
								aria-label={m.articles_service_remove(
									{ name: list.view.appliedService.name },
									options
								)}
								class="group inline-flex min-h-touch max-w-full min-w-touch items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							>
								<span
									class="inline-flex min-h-control-sm max-w-full flex-row items-center gap-1.5 rounded-full border border-foreground bg-background px-4 ring-1 ring-foreground ring-inset"
								>
									<span class="truncate text-body-sm font-semibold text-foreground"
										>{m.articles_service_chip(
											{ name: list.view.appliedService.name },
											options
										)}</span
									>
									<Ionicon name="close" class="icon-sm shrink-0 text-foreground" />
								</span>
							</a>
						</div>
					{/if}
				{/snippet}
			</ListHeader>
		</div>

		{#key `${scope.type ?? ''}|${scope.q ?? ''}|${scope.serviceId ?? ''}`}
			<div
				data-testid="articles-body"
				class="mt-section transition-opacity duration-standard ease-standard starting:opacity-0"
			>
				{#if list.shown === 'loading'}
					<div
						aria-busy="true"
						class="grid grid-cols-1 gap-x-rail gap-y-results-row-gap tablet:grid-cols-2 laptop:grid-cols-3 desktop:grid-cols-4"
					>
						{#each PLACEHOLDERS as index (index)}
							<ArticleCardSkeleton />
						{/each}
					</div>
				{:else if list.shown === 'error'}
					<StatePanel
						glyph="cloud-offline-outline"
						title={m.articles_error_title({}, options)}
						description={m.articles_error_body({}, options)}
						actionLabel={m.articles_retry({}, options)}
						onAction={list.retry}
						testId="articles-error"
						actionTestId="articles-retry"
					/>
				{:else if list.shown === 'empty'}
					{#if searching}
						<StatePanel
							glyph="search"
							title={m.articles_not_found_title(
								{ query: scope.q ?? list.view?.appliedService?.name ?? '' },
								options
							)}
							actionLabel={m.common_clear_search({}, options)}
							actionHref={listHref({ type: typeParam })}
							testId="articles-not-found"
						/>
					{:else}
						<StatePanel
							glyph="document-text-outline"
							title={m.articles_empty_title({}, options)}
							actionLabel={author ? m.articles_back_to_profile({}, options) : undefined}
							actionHref={author?.profileHref}
							testId="articles-empty"
						/>
					{/if}
				{:else if list.view}
					{#if list.view.countLabel}
						<p
							role="status"
							data-testid="articles-count"
							class="mb-5 text-left text-body-lg text-foreground tablet:mb-section tablet:text-center"
						>
							{list.view.countLabel}
						</p>
					{/if}
					{#if list.view.featured}
						<!-- U-63.2: the newest featured at every width (below 744 full width, its dark pill too), never while searching. -->
						<div class="mb-reading-gap tablet:mb-section-lg">
							<Featured
								article={list.view.featured}
								href={articleHref(list.view.featured.slug)}
								readLabel={m.articles_read({}, options)}
							/>
						</div>
					{/if}
					<ul
						bind:this={grid}
						class="grid grid-cols-1 gap-x-rail gap-y-results-row-gap tablet:grid-cols-2 laptop:grid-cols-3 desktop:grid-cols-4"
					>
						{#each list.view.cards as card (card.id)}
							<li
								class="flex min-w-0 transition-opacity duration-standard ease-standard starting:opacity-0"
							>
								<ArticleCard article={card} href={articleHref(card.slug)} variant="list" />
							</li>
						{/each}
					</ul>
					{#if list.hasMore || list.moreFailed}
						<div class="mt-section-lg flex justify-center">
							{#if list.moreFailed}
								<Button
									tone="outline"
									radius="full"
									label={m.articles_retry({}, options)}
									onclick={() => void showMore()}
									textClass="text-body-md"
									data-testid="articles-more-retry"
								/>
							{:else}
								<Button
									tone="outline"
									radius="full"
									label={list.loadingMore
										? m.articles_loading_more({}, options)
										: m.articles_load_more({}, options)}
									disabled={list.loadingMore}
									onclick={() => void showMore()}
									textClass="text-body-md"
									class="px-section"
									data-testid="articles-more"
								>
									{#snippet leading()}
										{#if list.loadingMore}
											<Spinner size="sm" tone="foreground" />
										{/if}
									{/snippet}
								</Button>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{/key}
	</div>
</div>
