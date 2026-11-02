import type { ResolvedPathname } from '$app/types';
import { m } from '$paraglide/messages.js';
import { resolveMediaUrl } from '$shared/lib/http';
import {
	buildRichText,
	extractPlainText,
	richTextToc,
	type RichTextDoc
} from '$shared/lib/rich-text';
import { clipText } from '$shared/lib/seo';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	ArticleAuthorView,
	ArticlePublicView,
	ArticleTypeDto
} from '$modules/articles/api/types';
import { readingMinutes } from '$modules/articles/lib/article-card';
import {
	articleTypeLabel,
	articleTypePluralLabel,
	buildArticleListCard,
	byNewest,
	formatArticleDate,
	readingLabel,
	type ArticleListCard
} from '$modules/articles/lib/article-list';

/** «Περισσότερα άρθρα»: three cards (U-57.4), the article itself left out. */
export const RELATED_ARTICLES_SHOWN = 3;

/** A meta description's room: search engines show about 160 characters. */
const DESCRIPTION_LIMIT = 160;

/** The one section kind with a renderer: rich text. Any other (`image`, `video`, `other`) is left out. */
const TEXT_SECTION = 'text';

/** The author the page names: the words, the profile only for a doctor the marketplace shows (`slug`). */
export type ArticleAuthor = { name: string; href: ResolvedPathname | null; initial: string };

/** What the article's page draws (U-57.4), every word in the page's language. */
export type ArticlePageView = {
	title: string;
	/** The short description, the subtitle (empty without one). */
	subtitle: string;
	type: ArticleTypeDto | null;
	/** «Άρθρο» / «Συμβουλή υγείας» (the share window's line). */
	typeLabel: string;
	/** «Άρθρα» / «Συμβουλές υγείας»: the breadcrumbs' second step. */
	typePluralLabel: string;
	/** «Από <γιατρός>» only with a name (Ε4: a doctor the marketplace hides has none). */
	author: ArticleAuthor | null;
	/** The day and the reading time, the parts that are known. */
	date: string;
	reading: string;
	/** The photo (16:9) only when the article has one. */
	image: { url: string; alt: string } | null;
	/** The body: the text sections in their `order` (the article's `content` when it has none). */
	body: RichTextDoc[];
	toc: { id: string; label: string }[];
	/** «Περισσότερα άρθρα»: `[]` draws no row (none, or the list failed). */
	related: ArticleListCard[];
};

/** The body (U-57.4): the `text` sections by `order`, unknown kinds left out; without one, the article's `content`. */
export function articleBodyDocs(article: ArticlePublicView): RichTextDoc[] {
	const sections = (Array.isArray(article.sections) ? article.sections : [])
		.filter(
			(section) =>
				section &&
				section.type === TEXT_SECTION &&
				section.content &&
				typeof section.content === 'object'
		)
		.map((section, index) => ({ section, index }))
		.sort(
			(a, b) =>
				(a.section.order ?? Number.MAX_SAFE_INTEGER) -
					(b.section.order ?? Number.MAX_SAFE_INTEGER) || a.index - b.index
		)
		.map(({ section }) => section.content as RichTextDoc);
	if (sections.length > 0) return sections;
	return article.content && typeof article.content === 'object' ? [article.content] : [];
}

/**
 * 🔴 U-57.4 / U-57.5 Ε4 (app = web): the author the page names — the primary one with a name, else the first with
 * one; its name links the doctor's profile ONLY with the `slug` the backend gives a doctor the marketplace shows. A
 * doctor the marketplace hides comes without a name: no author at all, no link, no card.
 */
export function buildArticleAuthor(
	authors: ArticleAuthorView[] | null | undefined,
	doctorHref: (slug: string) => ResolvedPathname
): ArticleAuthor | null {
	const named = (Array.isArray(authors) ? authors : []).filter(
		(author): author is ArticleAuthorView & { name: string } =>
			typeof author?.name === 'string' && author.name.trim().length > 0
	);
	const author = named.find((entry) => entry.isPrimary === true) ?? named[0];
	if (!author) return null;
	const name = author.name.trim();
	const slug = typeof author.slug === 'string' ? author.slug.trim() : '';
	const initial = name
		.replace(/^(dr\.?|δρ\.?)\s*/iu, '')
		.charAt(0)
		.toLocaleUpperCase();
	return { name, href: slug ? doctorHref(slug) : null, initial: initial || name.charAt(0) };
}

/**
 * «Περισσότερα άρθρα» (U-57.4, the prototype's Π11): three cards of the list without the article itself — the same
 * kind first, the newest first in each group; none when the list failed.
 */
export function buildRelatedArticles(
	related: ArticlePublicView[] | null,
	current: ArticlePublicView,
	locale: SupportedLocale
): ArticleListCard[] {
	if (!related) return [];
	const cards = related
		.filter((article) => article && article.slug !== current.slug)
		.map((article) => buildArticleListCard(article, locale))
		.sort(byNewest);
	return [
		...cards.filter((card) => card.type === current.type),
		...cards.filter((card) => card.type !== current.type)
	].slice(0, RELATED_ARTICLES_SHOWN);
}

/** The article's page in the page's language (U-57.4). */
export function buildArticlePage({
	article,
	related,
	locale,
	doctorHref
}: {
	article: ArticlePublicView;
	related: ArticlePublicView[] | null;
	locale: SupportedLocale;
	doctorHref: (slug: string) => ResolvedPathname;
}): ArticlePageView {
	const body = articleBodyDocs(article);
	const photo =
		article.image?.lgSizeUrl?.trim() ||
		article.image?.mediumSizeUrl?.trim() ||
		article.image?.smSizeUrl?.trim();
	const type = article.type === 'ARTICLE' || article.type === 'HEALTH_ADVICE' ? article.type : null;
	return {
		title: article.title,
		subtitle: extractPlainText(article.shortDescription),
		type,
		typeLabel: articleTypeLabel(type, locale),
		typePluralLabel: articleTypePluralLabel(type, locale),
		author: buildArticleAuthor(article.authors, doctorHref),
		date: formatArticleDate(article.publishedAt, locale),
		reading: readingLabel(readingMinutes(body), locale) ?? '',
		image: photo ? { url: resolveMediaUrl(photo), alt: article.image?.alt?.trim() ?? '' } : null,
		body,
		toc: richTextToc(buildRichText(body).headings),
		related: buildRelatedArticles(related, article, locale)
	};
}

/** The article's `<head>` (U-28.4): title, description, canonical, its languages, Open Graph `article`, JSON-LD. */
export type ArticleSeo = {
	title: string;
	description: string;
	canonicalUrl: string;
	alternates: { hreflang: string; href: string }[];
	imageUrl: string | null;
	publishedAt: string | null;
	jsonLd: Record<string, unknown>;
};

/**
 * 🔴 U-28.4 / common v2 (U-57.4): «<τίτλος> | eDoctor» (the CMS's `metaTitle` first), the description (its
 * `metaDescription`, else the short description, else the body's first words), the canonical address the caller gives,
 * the photo for Open Graph, and a JSON-LD `Article` — headline, `datePublished` only with a date, every named author a
 * `Person`, the image.
 */
export function buildArticleSeo({
	article,
	locale,
	canonicalUrl,
	alternateUrls
}: {
	article: ArticlePublicView;
	locale: SupportedLocale;
	canonicalUrl: string;
	alternateUrls?: Partial<Record<SupportedLocale, string>>;
}): ArticleSeo {
	const heading = article.metaTitle?.trim() || article.title;
	const title = m.article_meta_title({ title: heading }, { locale });
	const description = clipText(
		article.metaDescription?.trim() ||
			extractPlainText(article.shortDescription) ||
			extractPlainText(articleBodyDocs(article)[0]),
		DESCRIPTION_LIMIT
	);
	const photo =
		article.image?.lgSizeUrl?.trim() ||
		article.image?.mediumSizeUrl?.trim() ||
		article.image?.smSizeUrl?.trim();
	const imageUrl = photo ? resolveMediaUrl(photo) : null;
	const published =
		article.publishedAt && !Number.isNaN(new Date(article.publishedAt).getTime())
			? new Date(article.publishedAt).toISOString()
			: null;
	const authors = (Array.isArray(article.authors) ? article.authors : [])
		.map((author) => author?.name?.trim())
		.filter((name): name is string => Boolean(name))
		.map((name) => ({ '@type': 'Person', name }));
	const jsonLd: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: article.title,
		url: canonicalUrl,
		mainEntityOfPage: canonicalUrl,
		inLanguage: article.language ?? locale,
		...(description ? { description } : {}),
		...(published ? { datePublished: published } : {}),
		...(authors.length ? { author: authors.length === 1 ? authors[0] : authors } : {}),
		...(imageUrl ? { image: imageUrl } : {})
	};
	const alternates: ArticleSeo['alternates'] = (['el', 'en'] as const)
		.filter((language) => alternateUrls?.[language])
		.map((language) => ({ hreflang: language, href: alternateUrls?.[language] ?? '' }));
	if (alternateUrls?.el) alternates.push({ hreflang: 'x-default', href: alternateUrls.el });
	return {
		title,
		description,
		canonicalUrl,
		alternates,
		imageUrl,
		publishedAt: published,
		jsonLd
	};
}
