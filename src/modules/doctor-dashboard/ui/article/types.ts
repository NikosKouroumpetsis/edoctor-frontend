import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** One article's page (screen 85, D-W52-103): the page's language and the article (`null`: «Νέο άρθρο»). */
export type DoctorArticleProps = {
	locale: SupportedLocale;
	articleId: string | null;
};
