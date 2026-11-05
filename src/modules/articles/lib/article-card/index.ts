import { m } from '$paraglide/messages.js';
import { resolveMediaUrl } from '$shared/lib/http';
import { extractPlainText } from '$shared/lib/rich-text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	ArticleAuthorView,
	ArticlePublicView,
	ArticleRichTextDoc,
	HomeArticlesFeed
} from '$modules/articles/api/types';

// Common v2 §B: the ONE plain-text extractor of rich text (both dialects) is the shared one, the application's rules.
export { extractPlainText };

/** One article of the home's last row (U-20): the words and the photo it shows, in the page's language. */
export type HomeArticle = {
	id: string;
	slug: string;
	title: string;
	/** «Δρ. Μαρία Παπαδοπούλου · 5΄ ανάγνωσης», or the part that is known. */
	meta: string;
	imageUrl: string | null;
};

/** The streamed result of the home's articles: never rejects (a failed feed shows no row). */
export type HomeArticlesResult = { status: 'ok'; articles: HomeArticle[] } | { status: 'error' };

// Words read in a minute: the application's measure of a reading time (`articles/lib/article-card`).
const WORDS_PER_MINUTE = 200;

/**
 * 🔴 U-57.5 Ε3 (app = web): the reading time in whole minutes, ROUNDED UP (200 words a minute), at least one; `0` for
 * a body the feed did not send. One document or several (an article's sections), counted as one text.
 */
export function readingMinutes(
	doc: ArticleRichTextDoc | readonly (ArticleRichTextDoc | null | undefined)[] | null | undefined
): number {
	const docs = Array.isArray(doc) ? doc : [doc];
	const words = docs
		.map((entry) => extractPlainText(entry))
		.join(' ')
		.split(/\s+/u)
		.filter(Boolean).length;
	return words > 0 ? Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) : 0;
}

/**
 * 🔴 U-92 (app = web): a list's card has no body: its reading time is the server's `readingMinutes` (`null`, or an
 * answer without it, ⇒ `0`: no time shown), never counted here.
 */
export function cardReadingMinutes(article: { readingMinutes?: number | null }): number {
	const minutes = article.readingMinutes;
	return typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

/** The primary author's name, else the first author with one, else none (the application's rule). */
export function authorName(authors: ArticleAuthorView[] | null | undefined): string | null {
	if (!authors) return null;
	const primary = authors.find((author) => author.isPrimary === true && author.name);
	return primary?.name ?? authors.find((author) => author.name)?.name ?? null;
}

/** The home's article card (U-20): «συγγραφέας · χρόνος ανάγνωσης», the 4:3 photo or none. */
export function buildHomeArticle(article: ArticlePublicView, locale: SupportedLocale): HomeArticle {
	const minutes = cardReadingMinutes(article);
	const meta = [
		authorName(article.authors),
		minutes > 0 ? m.article_reading_time({ minutes }, { locale }) : null
	]
		.filter((part): part is string => Boolean(part))
		.join(' · ');
	const photo = article.image?.mediumSizeUrl?.trim() || article.image?.smSizeUrl?.trim();

	return {
		id: article.id,
		slug: article.slug,
		title: article.title,
		meta,
		imageUrl: photo ? resolveMediaUrl(photo) : null
	};
}

/**
 * 🔴 U-32.1: the home's articles as the row shows them, from the feed's facts (built by the route's load, on the
 * server, as before): each card in the page's language; a failed feed stays the error.
 */
export function buildHomeArticlesResult(
	feed: HomeArticlesFeed,
	locale: SupportedLocale
): HomeArticlesResult {
	if (feed.status === 'error') return feed;
	return {
		status: 'ok',
		articles: feed.articles.map((article) => buildHomeArticle(article, locale))
	};
}

/**
 * 🔴 U-32.9: the home's streamed articles as the row shows them (the route's load, on the server): the feed's promise
 * mapped to its cards, never rejecting — an article the builder cannot write (or a feed that rejected after all) is the
 * failed feed (no row), never an unhandled rejection that takes the server down.
 */
export function buildStreamedHomeArticles(
	feed: Promise<HomeArticlesFeed>,
	locale: SupportedLocale
): Promise<HomeArticlesResult> {
	return feed
		.then((result) => buildHomeArticlesResult(result, locale))
		.catch((): HomeArticlesResult => ({ status: 'error' }));
}
