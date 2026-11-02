import type { HomeArticle } from '$modules/articles/lib/article-card';

/**
 * `rail` the home's row (its cell's width); `grid` «Περισσότερα άρθρα» (below 744 the home's card, as the
 * application's rail; from 744 the list's card); `list` the list — the card of the prototype 06 v3 at every width
 * (U-57.2, U-63.2); `framed` below 744 the application's framed list card, from 744 the list's (U-58.1 of round 1;
 * kept, unused since U-63.1, U-30.2).
 */
export type ArticleCardVariant = 'rail' | 'grid' | 'list' | 'framed';

export type ArticleCardProps = {
	/**
	 * The home's card facts, and on the list's and «Περισσότερα» cards the kind's words and the short description; on
	 * the `framed` card below 744 «ημέρα · συγγραφέας» (`listMeta`) and «Διαβάστε» (`readLabel`), the application's.
	 */
	article: HomeArticle & { typeLabel?: string; excerpt?: string; listMeta?: string };
	href: string;
	variant?: ArticleCardVariant;
	/** The `framed` card's «Διαβάστε» below 744 (words, not a second link: the whole card is the link). */
	readLabel?: string;
	/** The card's test id: `home-article-card` in the rail, `article-card` otherwise, unless the caller names one. */
	testId?: string;
};
