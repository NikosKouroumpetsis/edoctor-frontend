import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { buildRichText, extractPlainText, richTextToc } from '$shared/lib/rich-text';
import { clipText } from '$shared/lib/seo';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { LegalDocumentEdition, LegalDocumentFacts } from '$modules/legal/api/page';

/** A meta description's room: search engines show about 160 characters. */
const DESCRIPTION_LIMIT = 160;

/** The notice over the text (the kit's `Banner` info, U-59.2): its words and, optionally, one link. */
export type LegalNotice = {
	text: string;
	actionLabel?: string;
	actionHref?: string;
	testId: string;
};

/**
 * The day a legal version applies, on the Greek calendar (D-118) in the reader's language — the application's ONE
 * spelling of it (`formatLegalDay`: day, long month, year); empty for an unreadable instant.
 */
export function formatLegalDay(iso: string, locale: SupportedLocale): string {
	const day = new Date(iso);
	return Number.isNaN(day.getTime())
		? ''
		: day.toLocaleDateString(locale, {
				day: 'numeric',
				month: 'long',
				timeZone: PLATFORM_TIME_ZONE,
				year: 'numeric'
			});
}

/**
 * 🔴 The binding `upcoming` rule (the application's `buildEditionNotice`, backend `legal-consent-flow.md` §Notices;
 * U-59.1 Π2): over the text in force, a page that announces a change says «Νέα έκδοση X — ισχύει από <ημέρα>» and
 * links that text («Δείτε τη νέα έκδοση», `?edition=upcoming`); the announced text says which version it is and from
 * when, and links the text in force («Δείτε την ισχύουσα»). No announcement, no notice.
 */
export function buildLegalEditionNotice({
	document,
	edition,
	locale,
	upcomingHref,
	currentHref
}: {
	document: LegalDocumentFacts;
	edition: LegalDocumentEdition | undefined;
	locale: SupportedLocale;
	upcomingHref: string;
	currentHref: string;
}): LegalNotice | null {
	if (edition === 'upcoming' && document.version && document.effectiveAt) {
		const date = formatLegalDay(document.effectiveAt, locale);
		return {
			text: m.legal_upcoming_viewing({ date, version: document.version }, { locale }),
			actionLabel: m.legal_upcoming_current({}, { locale }),
			actionHref: currentHref,
			testId: 'legal-edition-notice'
		};
	}
	if (edition === undefined && document.upcoming) {
		const date = formatLegalDay(document.upcoming.effectiveAt, locale);
		return {
			text: m.legal_upcoming_notice({ date, version: document.upcoming.version }, { locale }),
			actionLabel: m.legal_upcoming_open({}, { locale }),
			actionHref: upcomingHref,
			testId: 'legal-edition-notice'
		};
	}
	return null;
}

/**
 * 🔴 U-59.4 (app = web): when the text came in another language than the page's (the backend's Greek fallback), a note
 * names it — «Το κείμενο είναι διαθέσιμο μόνο στα Ελληνικά.» on the English page; none when they match or it is unsaid.
 */
export function buildContentLanguageNote(
	textLanguage: string | null | undefined,
	locale: SupportedLocale
): string | null {
	if (!textLanguage || textLanguage === locale) return null;
	if (textLanguage === 'el') return m.document_language_note_el({}, { locale });
	if (textLanguage === 'en') return m.document_language_note_en({}, { locale });
	return null;
}

/** «Έκδοση X · Ισχύει από <ημέρα>» (U-59.1 Π1): the parts that are known (`version`, `effectiveAt`). */
export function buildLegalMeta(document: LegalDocumentFacts, locale: SupportedLocale): string {
	const day = document.effectiveAt ? formatLegalDay(document.effectiveAt, locale) : '';
	return [
		document.version ? m.legal_meta_version({ version: document.version }, { locale }) : null,
		day ? m.legal_meta_effective({ date: day }, { locale }) : null
	]
		.filter(Boolean)
		.join(' · ');
}

/** What the legal page draws (U-59.1): its meta, its edition's notice, the language note, its ToC. */
export type LegalDocumentView = {
	meta: string;
	notice: LegalNotice | null;
	languageNote: string | null;
	toc: { id: string; label: string }[];
};

export function buildLegalDocumentView({
	document,
	edition,
	locale,
	upcomingHref,
	currentHref
}: {
	document: LegalDocumentFacts;
	edition: LegalDocumentEdition | undefined;
	locale: SupportedLocale;
	upcomingHref: string;
	currentHref: string;
}): LegalDocumentView {
	return {
		meta: buildLegalMeta(document, locale),
		notice: buildLegalEditionNotice({ document, edition, locale, upcomingHref, currentHref }),
		languageNote: buildContentLanguageNote(document.language, locale),
		toc: richTextToc(buildRichText(document.body).headings)
	};
}

/** The legal page's `<head>` (U-28.4): «<τίτλος> | eDoctor», the description, the canonical address, its languages. */
export type LegalSeo = {
	title: string;
	description: string;
	canonicalUrl: string;
	alternates: { hreflang: string; href: string }[];
};

export function buildLegalSeo({
	document,
	locale,
	canonicalUrl,
	alternateUrls
}: {
	document: LegalDocumentFacts;
	locale: SupportedLocale;
	canonicalUrl: string;
	alternateUrls: Record<SupportedLocale, string>;
}): LegalSeo {
	return {
		title: m.legal_meta_title({ title: document.metaTitle ?? document.title }, { locale }),
		description: clipText(
			document.metaDescription ?? extractPlainText(document.body),
			DESCRIPTION_LIMIT
		),
		canonicalUrl,
		alternates: [
			{ hreflang: 'el', href: alternateUrls.el },
			{ hreflang: 'en', href: alternateUrls.en },
			{ hreflang: 'x-default', href: alternateUrls.el }
		]
	};
}
