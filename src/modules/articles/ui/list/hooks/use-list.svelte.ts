import { createInfiniteQuery, createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { useDebouncedValue } from '$shared/lib/debounce';
import { foldSearchText } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	articleSuggestionsQuery,
	articlesListInfiniteQuery,
	normalizeArticleSearch,
	type ArticlesFirstPageLoad,
	type ArticlesListScope
} from '$modules/articles/api';
import { buildArticlesListView } from '$modules/articles/lib/article-list';
import type { ArticlesListState as ArticlesListShown } from '../types';

/** Suggestions open from this many characters (U-57.5 Ε5: as the doctors' search). */
const SUGGEST_FROM = 2;
/** The suggestions are asked after this much quiet in the field (the application's 250 ms, MAJOR-3 of r1). */
export const SUGGEST_DEBOUNCE_MS = 250;

/**
 * The list's reads (wave 1.5, screen 6, U-57.2/U-57.3): ONE TanStack infinite query of 12 a page per kind, words and
 * service, seeded with the server's first page (so the page is whole without JavaScript and asks nothing at
 * hydration); «Εμφάνιση περισσότερων» asks the next page at the press (D-103). The query holds the FACTS; the view is
 * written in its `select` (U-32.1). A first page the server could not read stays the error with «Δοκιμάστε ξανά» until
 * the reader asks again. The suggestions are their own query per words typed (two characters or more).
 */
export class ArticlesListState {
	#query;
	#suggestions;
	#settled: { readonly current: string };
	#firstPage: () => ArticlesFirstPageLoad;
	/** The reader asked again after the server's failed first page: the browser reads it itself. */
	#asked = $state(false);
	/** The words in the field (not yet searched). */
	typed = $state('');

	constructor(options: {
		locale: () => SupportedLocale;
		scope: () => ArticlesListScope;
		firstPage: () => ArticlesFirstPageLoad;
	}) {
		this.#firstPage = options.firstPage;
		this.#query = createInfiniteQuery(() => {
			const locale = options.locale();
			const scope = options.scope();
			const first = options.firstPage();
			const searching = Boolean(scope.q || scope.serviceId);
			return {
				...articlesListInfiniteQuery(scope),
				initialData:
					first.state === 'ready' ? { pages: [first.page], pageParams: [undefined] } : undefined,
				enabled: browser && (first.state === 'ready' || this.#asked),
				select: (data) =>
					buildArticlesListView({
						pages: data.pages,
						locale,
						query: scope.q,
						searching,
						hasMore: data.pages.at(-1)?.nextCursor != null
					})
			};
		});
		this.#settled = useDebouncedValue(() => this.typed, SUGGEST_DEBOUNCE_MS);
		this.#suggestions = createQuery(() => {
			const scope = options.scope();
			const words = normalizeArticleSearch(this.#settled.current) ?? '';
			const long = foldSearchText(words).replace(/\s/gu, '').length >= SUGGEST_FROM;
			// 🔴 MINOR-r2-1 (D-103, the application's `query.trim() !== searched`): never for the words already searched —
			// a page with `?q=` and an Enter ask nothing.
			const searched = words === (scope.q ?? '');
			return {
				...articleSuggestionsQuery(options.locale(), scope.type, words),
				enabled: browser && long && !searched
			};
		});
	}

	get view() {
		return this.#query.data ?? null;
	}

	get shown(): ArticlesListShown {
		const data = this.#query.data;
		if (data) return data.featured || data.cards.length > 0 ? 'ready' : 'empty';
		if (this.#query.isError) return 'error';
		if (this.#firstPage().state === 'failed' && !this.#asked) return 'error';
		return 'loading';
	}

	/** Another page waits (the last one came full). */
	get hasMore() {
		return this.#query.hasNextPage === true;
	}

	get loadingMore() {
		return this.#query.isFetchingNextPage;
	}

	/** The next page failed: the cards stay, «Δοκιμάστε ξανά» asks that page again. */
	get moreFailed() {
		return this.#query.isFetchNextPageError;
	}

	/**
	 * The suggestions of the words now in the field, `null` otherwise (NIT-r2-1, the application's `isVisible`): while
	 * the field is typed in or the answer is on its way the former words' suggestions are gone, never shown stale.
	 */
	get suggestions() {
		return this.suggestionsReady ? (this.#suggestions.data ?? null) : null;
	}

	/**
	 * Whether the suggestions answer the words now in the field (the application's `typed === query.trim()`): while
	 * the field is still being typed in, or the read is on its way, the panel waits — it never says «none».
	 */
	get suggestionsReady() {
		const settled = this.#settled.current.trim() === this.typed.trim();
		return settled && this.#suggestions.isSuccess;
	}

	/** The backend has no suggestions (an older one): the field only searches. */
	get suggestionsFailed() {
		return this.#suggestions.isError;
	}

	/** «Εμφάνιση περισσότερων»: the next page, at the press. */
	loadMore = async () => {
		await this.#query.fetchNextPage();
	};

	/** «Δοκιμάστε ξανά» of the whole list: the first read (again). */
	retry = () => {
		if (!this.#asked && this.#firstPage().state === 'failed') this.#asked = true;
		else void this.#query.refetch();
	};
}
