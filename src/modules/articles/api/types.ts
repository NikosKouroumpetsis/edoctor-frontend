/**
 * Wire types of the public articles feed (`GET /api/v1/article/public/articles`), hand-written against the
 * backend as the application's (`application/src/modules/articles/api/feed/dto`): the endpoint is not in the
 * committed OpenAPI document yet. Tolerant by design: every optional field may be absent or `null`.
 */
export type ArticleRichTextNode = {
	type?: string;
	text?: string | null;
	content?: ArticleRichTextNode[] | null;
	children?: ArticleRichTextNode[] | null;
};

export type ArticleRichTextDoc = {
	type?: string;
	content?: ArticleRichTextNode[] | null;
	blocks?: ArticleRichTextNode[] | null;
};

export type ArticleAuthorView = {
	id?: string;
	doctorId?: string;
	isPrimary?: boolean;
	name?: string | null;
};

export type ArticlePublicView = {
	id: string;
	slug: string;
	title: string;
	content?: ArticleRichTextDoc | null;
	authors?: ArticleAuthorView[] | null;
	image?: {
		smSizeUrl?: string | null;
		mediumSizeUrl?: string | null;
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
