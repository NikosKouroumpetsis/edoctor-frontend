import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { resolveMediaUrl } from '$shared/lib/http';
import { extractPlainText } from '$shared/lib/rich-text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	ArticleAppliedService,
	ArticlePublicView,
	ArticleTypeDto,
	ArticlesPage
} from '$modules/articles/api/types';
import {
	authorName,
	cardReadingMinutes,
	type HomeArticle
} from '$modules/articles/lib/article-card';

/** The kind in the address (U-57.2, the prototype's `?type=article|advice`); «Όλα» has none. */
export type ArticleTypeParam = 'article' | 'advice';

const TYPE_PARAMS: Record<ArticleTypeParam, ArticleTypeDto> = {
	article: 'ARTICLE',
	advice: 'HEALTH_ADVICE'
};

/** The backend's kind of a `?type=` of the address; anything else is «Όλα» (`null`). */
export function articleTypeFromParam(value: string | null | undefined): ArticleTypeDto | null {
	return value === 'article' || value === 'advice' ? TYPE_PARAMS[value] : null;
}

/** The address's word for a kind (`null` for «Όλα»). */
export function articleTypeParam(type: ArticleTypeDto | null): ArticleTypeParam | null {
	if (type === 'ARTICLE') return 'article';
	if (type === 'HEALTH_ADVICE') return 'advice';
	return null;
}

/** The kind's words (the application's `articles.type.*`): «Συμβουλή υγείας» for HEALTH_ADVICE, else «Άρθρο». */
export function articleTypeLabel(
	type: ArticleTypeDto | null | undefined,
	locale: SupportedLocale
): string {
	return type === 'HEALTH_ADVICE'
		? m.article_type_health_advice({}, { locale })
		: m.article_type_article({}, { locale });
}

/** The kind's plural (the chips', the article's breadcrumb): «Συμβουλές υγείας», «Άρθρα». */
export function articleTypePluralLabel(
	type: ArticleTypeDto | null | undefined,
	locale: SupportedLocale
): string {
	return type === 'HEALTH_ADVICE'
		? m.articles_filter_health_advice({}, { locale })
		: m.articles_filter_article({}, { locale });
}

/**
 * The day it was published, on the Greek calendar (D-118), the application's card spelling (`formatDateLabel`: day,
 * short month, year); `''` for a missing or unreadable instant, so the meta drops it.
 */
export function formatArticleDate(iso: string | null | undefined, locale: SupportedLocale): string {
	if (!iso) return '';
	const day = new Date(iso);
	return Number.isNaN(day.getTime())
		? ''
		: day.toLocaleDateString(locale, {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				timeZone: PLATFORM_TIME_ZONE
			});
}

/** The kind an address asks (`?type=`): the one reader for a doctor's articles page (S-07.3: a route reads no parameter). */
export function readArticleType(params: URLSearchParams): ArticleTypeDto | null {
	return articleTypeFromParam(params.get('type'));
}

/** How many articles of each kind a doctor has (the profile's `articlesSummary`: counts only, U-92.2). */
export type DoctorArticlesCounts = { articlesCount: number; healthAdviceCount: number };

/** U-77: a doctor's articles by name: both kinds, or the one the doctor has (the section's and the page's). */
export function doctorArticlesTitle(
	{ articlesCount, healthAdviceCount }: DoctorArticlesCounts,
	locale: SupportedLocale
): string {
	if (articlesCount > 0 && healthAdviceCount > 0) return m.articles_doctor_title({}, { locale });
	return healthAdviceCount > 0
		? m.articles_filter_health_advice({}, { locale })
		: m.articles_filter_article({}, { locale });
}

/** «N΄ ανάγνωσης» (U-57.5 Ε3) for minutes that are known, else `null`. */
export function readingLabel(minutes: number, locale: SupportedLocale): string | null {
	return minutes > 0 ? m.article_reading_time({ minutes }, { locale }) : null;
}

/** One card of the list (U-57.2): the home's card (U-20) + the kind's badge + two lines of the short description. */
export type ArticleListCard = HomeArticle & {
	type: ArticleTypeDto | null;
	typeLabel: string;
	excerpt: string;
	imageAlt: string;
	publishedAt: string | null;
	/** The featured one's line: «Από <συγγραφέας> · <ημέρα> · N΄ ανάγνωσης». */
	featuredMeta: string;
	/** Below 744 the application's list card line «<ημέρα> · <συγγραφέας>» (`buildArticleMetaLine`, U-58.1). */
	listMeta: string;
};

const photoOf = (article: ArticlePublicView) =>
	article.image?.mediumSizeUrl?.trim() ||
	article.image?.lgSizeUrl?.trim() ||
	article.image?.smSizeUrl?.trim() ||
	'';

/**
 * 🔴 U-57.2 (app = web): an article of the list — «<συγγραφέας> · N΄ ανάγνωσης» under the title (a doctor the
 * marketplace hides has no name: only the time, Ε4), the kind for the badge, the short description's words, and the
 * featured line with «Από …» and the day. U-77: a list of ONE doctor names no author (`withoutAuthor`): it is the
 * doctor's own. 🔴 U-92: the card has no body, the time is the server's.
 */
export function buildArticleListCard(
	article: ArticlePublicView,
	locale: SupportedLocale,
	options: { withoutAuthor?: boolean } = {}
): ArticleListCard {
	const reading = readingLabel(cardReadingMinutes(article), locale);
	const author = options.withoutAuthor ? null : authorName(article.authors);
	const date = formatArticleDate(article.publishedAt, locale);
	const photo = photoOf(article);
	const type = article.type === 'HEALTH_ADVICE' || article.type === 'ARTICLE' ? article.type : null;
	return {
		id: article.id,
		slug: article.slug,
		title: article.title,
		meta: [author, reading].filter((part): part is string => Boolean(part)).join(' · '),
		imageUrl: photo ? resolveMediaUrl(photo) : null,
		imageAlt: article.image?.alt?.trim() ?? '',
		type,
		typeLabel: articleTypeLabel(type, locale),
		excerpt: extractPlainText(article.shortDescription),
		publishedAt: article.publishedAt ?? null,
		featuredMeta: [
			author ? m.article_by({ name: author }, { locale }) : null,
			date || null,
			reading
		]
			.filter((part): part is string => Boolean(part))
			.join(' · '),
		listMeta: [date, author].filter((part): part is string => Boolean(part)).join(' · ')
	};
}

/** Newest first; an article without a day goes last (the prototype's order inside the page). */
export function byNewest(a: { publishedAt: string | null }, b: { publishedAt: string | null }) {
	return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
}

/** What the list draws under its head (U-57.2, U-57.3). */
export type ArticlesListView = {
	/** The newest of the first page, big; none while searching (`q` or a service). */
	featured: ArticleListCard | null;
	cards: ArticleListCard[];
	/** «N αποτελέσματα για «…»» while searching, when the total is known. */
	countLabel: string | null;
	/** The service the backend applied (its name for the chip «Υπηρεσία: … ×»). */
	appliedService: ArticleAppliedService | null;
};

/**
 * 🔴 U-57.2 / U-57.3 (app = web): the list's body — the newest article of the first page featured above the grid (the
 * backend orders by slug: the newest of what came), never while searching; the rest in the grid; while searching
 * the line «N αποτελέσματα για «λέξεις»» (or the service's name), with the backend's total.
 */
export function buildArticlesListView({
	pages,
	locale,
	query,
	searching,
	hasMore,
	withoutAuthor = false
}: {
	pages: readonly ArticlesPage[];
	locale: SupportedLocale;
	/** The words typed, else the service's name, for the count line. */
	query: string | null;
	searching: boolean;
	hasMore: boolean;
	/** U-77: the list of one doctor. */
	withoutAuthor?: boolean;
}): ArticlesListView {
	const cards = pages.flatMap((page) =>
		page.articles.map((article) => buildArticleListCard(article, locale, { withoutAuthor }))
	);
	const appliedService = pages[0]?.appliedService ?? null;
	const total = pages[0]?.total ?? (hasMore ? null : cards.length);
	const what = query ?? appliedService?.name ?? null;
	const countLabel =
		searching && what && total !== null
			? total === 1
				? m.articles_results_one({ count: '1', query: what }, { locale })
				: m.articles_results_other({ count: String(total), query: what }, { locale })
			: null;
	if (searching || cards.length === 0) return { featured: null, cards, countLabel, appliedService };
	const firstPage = cards.slice(0, pages[0]?.articles.length ?? 0);
	const featured = [...firstPage].sort(byNewest)[0] ?? null;
	return {
		featured,
		cards: cards.filter((card) => card !== featured),
		countLabel,
		appliedService
	};
}
