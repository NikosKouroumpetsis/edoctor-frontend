import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { appointmentDateLabel } from '$shared/lib/appointment-when';
import type { StatusPillValue } from '$shared/ui/molecules/status-pill';
import { articleTextHasWords, type ArticleTextDoc } from '$shared/lib/article-text';
import type {
	DoctorArticleFacts,
	DoctorArticleKind,
	DoctorArticleListItemFacts,
	DoctorArticlesFailure,
	DoctorArticlesPageFacts
} from '$modules/doctor-dashboard/api/articles';

type Locale = 'el' | 'en';

const SEPARATOR = ' · ';

/** «12 Νοεμβρίου 2026»: a day of the platform's calendar (D-118); empty for no instant. */
export function doctorArticleDay(instant: string | null, locale: Locale): string {
	return instant ? appointmentDateLabel(instant, locale, PLATFORM_TIME_ZONE) : '';
}

/** U-221.1: «Άρθρο» / «Συμβουλή υγείας». */
export function doctorArticleKindLabel(kind: DoctorArticleKind, locale: Locale): string {
	return kind === 'HEALTH_ADVICE'
		? m.article_type_health_advice({}, { locale })
		: m.article_type_article({}, { locale });
}

/** One row of «Τα άρθρα μου» as drawn: its state's pill, the title, «είδος · what the state says», its cover. */
export type DoctorArticleRow = {
	id: string;
	pill: StatusPillValue;
	title: string;
	meta: string;
	imageUrl: string | null;
};

/**
 * 🔴 D-W52-102 (U-221.1, `sw.js` `arState`): the state of one article in the page's words — «Πρόχειρο · Τελευταία αλλαγή
 * …», «Σε έλεγχο · Στάλθηκε …», «Δημοσιευμένο · Από …» (or «Η αλλαγή σας ελέγχεται» while a change waits, «Η αλλαγή σας
 * δεν δημοσιεύτηκε» after the team refused it: the published text stays), «Δεν δημοσιεύτηκε · Διορθώστε το και στείλτε
 * το ξανά».
 */
export function doctorArticleState(
	article: DoctorArticleListItemFacts,
	locale: Locale
): { pill: StatusPillValue; line: string } {
	const options = { locale };
	switch (article.status) {
		case 'PUBLISHED': {
			const pill: StatusPillValue = {
				label: m.doctor_my_articles_state_published({}, options),
				tone: 'success'
			};
			if (article.hasPendingRevision)
				return { pill, line: m.doctor_my_articles_change_pending({}, options) };
			if (article.revision?.status === 'REJECTED')
				return { pill, line: m.doctor_my_articles_change_rejected({}, options) };
			const day = doctorArticleDay(article.publishedAt, locale);
			return { pill, line: day ? m.doctor_my_articles_since({ day }, options) : '' };
		}
		case 'IN_REVIEW': {
			const day = doctorArticleDay(article.submittedAt, locale);
			return {
				pill: { label: m.doctor_my_articles_state_review({}, options), tone: 'warning' },
				line: day ? m.doctor_my_articles_sent({ day }, options) : ''
			};
		}
		case 'REJECTED':
			return {
				pill: { label: m.doctor_my_articles_state_rejected({}, options), tone: 'refused' },
				line: m.doctor_my_articles_fix({}, options)
			};
		default: {
			const day = doctorArticleDay(article.updatedAt, locale);
			return {
				pill: { label: m.doctor_my_articles_state_draft({}, options), tone: 'muted' },
				line: day ? m.doctor_my_articles_changed({ day }, options) : ''
			};
		}
	}
}

/** 🔴 D-W52-102: the rows of the pages read so far, newest first as the server sent them, each article once. */
export function buildDoctorArticleRows(
	pages: readonly DoctorArticlesPageFacts[] | undefined,
	locale: Locale
): DoctorArticleRow[] {
	const seen = new Set<string>();
	const rows: DoctorArticleRow[] = [];
	for (const article of (pages ?? []).flatMap((page) => page.items)) {
		if (seen.has(article.id)) continue;
		seen.add(article.id);
		const state = doctorArticleState(article, locale);
		rows.push({
			id: article.id,
			pill: state.pill,
			title: article.title,
			meta: [doctorArticleKindLabel(article.kind, locale), state.line]
				.filter(Boolean)
				.join(SEPARATOR),
			imageUrl: article.imageUrl
		});
	}
	return rows;
}

/**
 * 🔴 D-W52-95: a refusal in the page's words — the rate, an article no longer the doctor's, its state changed meanwhile,
 * the 50 before a first publication, the cover too small, a text the server would not take, the waiting uploads, a body
 * too large, anything else the connection. The three fields of a sending are said under each field by the page.
 */
export function doctorArticlesFailureText(
	failure: Exclude<DoctorArticlesFailure, 'session'>,
	act: 'save' | 'send' | 'delete' | 'image',
	locale: Locale
): string {
	const options = { locale };
	switch (failure) {
		case 'rate-limited':
			return m.doctor_reason_rate_limited({}, options);
		case 'gone':
			return m.doctor_my_article_gone({}, options);
		case 'changed':
			return m.doctor_my_article_changed({}, options);
		case 'limit':
			return m.doctor_my_article_limit({}, options);
		case 'cover-small':
			return m.doctor_photos_error_small({}, options);
		case 'content':
			return m.doctor_my_article_content_refused({}, options);
		case 'images-pending':
			return m.doctor_my_article_images_pending({}, options);
		case 'too-large':
			return m.doctor_photos_error_large({}, options);
		case 'required':
		case 'invalid':
			return m.doctor_my_article_invalid({}, options);
		case 'unknown':
			return act === 'delete'
				? m.doctor_photos_delete_failed({}, options)
				: m.doctor_my_article_failed({}, options);
	}
}

/** U-221.1: the two kinds as rows of a choice (U-112), with their line. */
export function doctorArticleKindOptions(
	locale: Locale
): { value: DoctorArticleKind; label: string; note: string }[] {
	const options = { locale };
	return [
		{
			value: 'ARTICLE',
			label: m.article_type_article({}, options),
			note: m.doctor_my_article_kind_article_note({}, options)
		},
		{
			value: 'HEALTH_ADVICE',
			label: m.article_type_health_advice({}, options),
			note: m.doctor_my_article_kind_advice_note({}, options)
		}
	];
}

/**
 * 🔴 D-W52-103 (U-221.1, `sw.js` `arNote`): what stands over the page — a draft, in review since, published since, a
 * change in review since (the public page keeps the published text), or a refusal (of the article or of its change) with
 * the team's words. `null` for a new article.
 */
export type DoctorArticleNote =
	| { kind: 'band'; glyph: 'pen' | 'clock' | 'done'; text: string }
	| { kind: 'refused'; title: string; reason: string | null; fix: string };

export function doctorArticleNote(
	article: DoctorArticleFacts | null,
	locale: Locale
): DoctorArticleNote | null {
	if (!article) return null;
	const options = { locale };
	const day = (instant: string | null) => doctorArticleDay(instant, locale);
	const refused = (title: string, reason: string | null): DoctorArticleNote => ({
		kind: 'refused',
		title,
		reason: reason ? m.doctor_my_article_note_team({ reason }, options) : null,
		fix: `${m.doctor_my_articles_fix({}, options)}.`
	});
	switch (article.status) {
		case 'DRAFT':
			return { kind: 'band', glyph: 'pen', text: m.doctor_my_article_note_draft({}, options) };
		case 'IN_REVIEW':
			return {
				kind: 'band',
				glyph: 'clock',
				text: m.doctor_my_article_note_review({ day: day(article.submittedAt) }, options)
			};
		case 'REJECTED':
			return refused(
				m.doctor_my_article_note_rejected({ day: day(article.rejectedAt) }, options),
				article.rejectionReason
			);
		case 'PUBLISHED':
			if (article.revision?.status === 'REJECTED')
				return refused(
					m.doctor_my_article_note_change_rejected(
						{ day: day(article.revision.rejectedAt) },
						options
					),
					article.revision.rejectionReason
				);
			if (article.hasPendingRevision)
				return {
					kind: 'band',
					glyph: 'clock',
					text: m.doctor_my_article_note_change(
						{ day: day(article.revision?.submittedAt ?? article.submittedAt) },
						options
					)
				};
			return {
				kind: 'band',
				glyph: 'done',
				text: m.doctor_my_article_note_published({ day: day(article.publishedAt) }, options)
			};
	}
}

/** 🔴 D-W52-95: «Αποθήκευση πρόχειρου» only before the first publication — a new article, a draft, a refused one. */
export function doctorArticleCanDraft(article: DoctorArticleFacts | null): boolean {
	return !article || article.status === 'DRAFT' || article.status === 'REJECTED';
}

/** The fields a write of the page needs (D-W52-95): what is written now. */
export type DoctorArticleFields = {
	title: string;
	description: string;
	content: ArticleTextDoc | null;
};

/**
 * 🔴 D-W52-103 (U-221.1, `sw.js` `arErrs`): the three messages of the page — a draft needs a title («Γράψτε τίτλο για να
 * το αποθηκεύσετε.»); a sending needs the title, the short description and a text with a word (the server's three).
 */
export function doctorArticleErrors(
	fields: DoctorArticleFields,
	act: 'save' | 'send',
	locale: Locale
): { title?: string; description?: string; text?: string } {
	const options = { locale };
	const errors: { title?: string; description?: string; text?: string } = {};
	if (!fields.title.trim())
		errors.title =
			act === 'save'
				? m.doctor_my_article_error_title_save({}, options)
				: m.doctor_my_article_error_title({}, options);
	if (act === 'send' && !fields.description.trim())
		errors.description = m.doctor_my_article_error_description({}, options);
	if (act === 'send' && !articleTextHasWords(fields.content))
		errors.text = m.doctor_my_article_error_text({}, options);
	return errors;
}

/** «686 / 50.000 χαρακτήρες»: the count and the limit in the page's numbers. */
export function doctorArticleCount(count: number, limit: number, locale: Locale): string {
	const numbers = new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-GB');
	return m.article_editor_count(
		{ count: numbers.format(count), limit: numbers.format(limit) },
		{ locale }
	);
}
