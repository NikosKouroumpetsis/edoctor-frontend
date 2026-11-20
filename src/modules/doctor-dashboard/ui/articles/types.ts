import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** Every address the list leads to, resolved by the screen that holds it in the page's language. */
export type DoctorArticlesLinks = {
	/** «‹» below 950: the doctor's «Μενού». */
	menu: string;
	/** «+ Νέο άρθρο»: a page of its own (U-102). */
	newArticle: string;
	/** 🔴 D-W52-103: one article's page. */
	article: (articleId: string) => string;
};

/** «Τα άρθρα μου» (screen 85, D-W52-102): the page's language and its addresses. */
export type DoctorArticlesProps = {
	locale: SupportedLocale;
	links: DoctorArticlesLinks;
};

/** Where the list stands: its read is on its way; it failed; the doctor has written none; or the rows. */
export type DoctorArticlesView = 'loading' | 'failed' | 'empty' | 'ready';
