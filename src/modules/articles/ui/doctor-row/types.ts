import type { ResolvedPathname } from '$app/types';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorArticlesCounts } from '$modules/articles/lib/article-list';

/** What the profile's «Άρθρα · Συμβουλές υγείας» needs from its screen (U-77, U-92). */
export type DoctorArticlesRowProps = {
	doctorId: string;
	/** The profile's `articlesSummary`: only counts, so the section knows its name and its button with no request. */
	counts: DoctorArticlesCounts;
	locale: SupportedLocale;
	articleHref: (slug: string) => ResolvedPathname;
	/** `/doctors/<slug>/articles`. */
	allHref: ResolvedPathname;
	/**
	 * U-73 Π8: on the doctor's own page: its name in the place of the kind's, and a row with arrows, as its reviews.
	 */
	title?: string;
};
