import type { RichTextDoc, RichTextNode } from '$shared/lib/rich-text';

/**
 * Wire types of the public articles (`GET /api/v1/article/public/articles`, `…/articles/:slug`), hand-written against
 * the backend as the application's (`application/src/modules/articles/api/feed/dto`): the endpoints are not in the
 * committed OpenAPI document yet. Tolerant by design: every optional field may be absent or `null`.
 */
export type ArticleRichTextNode = RichTextNode;

export type ArticleRichTextDoc = RichTextDoc;

/** The backend's kinds of article (`type`, the list's `?type=`). */
export type ArticleTypeDto = 'ARTICLE' | 'HEALTH_ADVICE';

/**
 * An author of a published article. `name` is the doctor's public name, `slug` its public profile's (the backend's s610b: only for a
 * doctor the marketplace shows; `null` otherwise, and absent from an older backend).
 */
export type ArticleAuthorView = {
	id?: string;
	doctorId?: string | null;
	isPrimary?: boolean;
	name?: string | null;
	slug?: string | null;
};

/** One section of an article's body: `text` holds rich text; the other kinds have no renderer yet. */
export type ArticleSectionView = {
	id?: string;
	type?: string | null;
	order?: number | null;
	content?: ArticleRichTextDoc | null;
};

export type ArticlePublicView = {
	id: string;
	slug: string;
	type?: ArticleTypeDto | null;
	/** The language the text came in (the backend falls back to Greek). */
	language?: string | null;
	availableLanguages?: string[] | null;
	title: string;
	shortDescription?: ArticleRichTextDoc | null;
	content?: ArticleRichTextDoc | null;
	sections?: ArticleSectionView[] | null;
	authors?: ArticleAuthorView[] | null;
	metaTitle?: string | null;
	metaDescription?: string | null;
	canonicalUrl?: string | null;
	/** When the backoffice published it (`authorizedAt`), ISO; `null` when unknown. */
	publishedAt?: string | null;
	/**
	 * 🔴 U-92: the server's reading time, in whole minutes: the lists' cards carry no body (`null` ⇒ no time shown). An
	 * article opened by its slug still counts its own text.
	 */
	readingMinutes?: number | null;
	image?: {
		smSizeUrl?: string | null;
		mediumSizeUrl?: string | null;
		lgSizeUrl?: string | null;
		alt?: string | null;
	} | null;
};

export type ArticlesFeedData = ArticlePublicView[];

/**
 * The home's articles as the feed sends them (U-32.1: facts; the row's words are `lib/article-card`'s, built by the
 * route's load): never rejects (a failed feed is `error`).
 */
export type HomeArticlesFeed =
	| { status: 'ok'; articles: ArticlePublicView[] }
	| { status: 'error' };

/** The service a list is filtered by, as the backend names it (`meta.appliedService`, U-57.3). */
export type ArticleAppliedService = { id: string; name: string };

/**
 * What one read of the list asks (wave 1.5, screen 6, U-57.2/U-57.3): the page's language, the kind (`null` = «Όλα»),
 * the search words (`q`) and the service (`serviceId`), each `null` when unused.
 */
export type ArticlesListScope = {
	lang: string;
	type: ArticleTypeDto | null;
	q: string | null;
	serviceId: string | null;
	/** U-77.1: one doctor's articles (the backend's uuid, from the profile); absent or `null` on the site's list. */
	doctorId?: string | null;
};

/**
 * One page of the list: its articles, the cursor of the next (`null` at the end), and the backend's `meta` — the
 * matches' total and the applied service (`null` from a backend without them).
 */
export type ArticlesPage = {
	articles: ArticlePublicView[];
	nextCursor: string | null;
	total: number | null;
	appliedService: ArticleAppliedService | null;
};

/** A service the suggestions name, with how many published articles concern it. */
export type ArticleSuggestedService = { id: string; name: string; count: number };

/** An article the suggestions name: enough for its row (the photo, the kind, where the words matched). */
export type ArticleSuggestedArticle = {
	slug: string;
	title: string;
	type: ArticleTypeDto | null;
	imageUrl: string | null;
	excerpt: string | null;
	serviceNames: string[];
};

/** The suggestions for the words typed (`GET …/articles/suggestions`, U-57.3): services and articles, 5 + 5 at most. */
export type ArticleSuggestions = {
	services: ArticleSuggestedService[];
	articles: ArticleSuggestedArticle[];
};

/** The list's first page on the server: never throws (a failed read is `failed`, the page offers a retry). */
export type ArticlesFirstPageLoad = { state: 'ready'; page: ArticlesPage } | { state: 'failed' };

/**
 * One article on the server (wave 1.5, screen 6): its facts and «Περισσότερα άρθρα» (`null` when that read failed: no
 * row), a slug nobody published (`not-found`, the route's 404) or a failed read (`failed`, the route's error page).
 */
export type ArticleLoad =
	| { state: 'ready'; article: ArticlePublicView; related: ArticlePublicView[] | null }
	| { state: 'not-found' }
	| { state: 'failed' };
