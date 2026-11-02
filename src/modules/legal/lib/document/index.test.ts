import { describe, expect, it } from 'vitest';
import type { LegalDocumentFacts } from '$modules/legal/api/page';
import {
	buildContentLanguageNote,
	buildLegalDocumentView,
	buildLegalMeta,
	formatLegalDay
} from '.';

const facts = (overrides: Partial<LegalDocumentFacts> = {}): LegalDocumentFacts => ({
	body: {
		content: [
			{ type: 'heading', attrs: { level: 2 }, text: 'Ο λογαριασμός σας' },
			{ type: 'paragraph', text: 'Κείμενο.' },
			{ type: 'heading', attrs: { level: 2 }, text: 'Ραντεβού και ακυρώσεις' }
		]
	},
	effectiveAt: '2026-07-01T00:00:00.000Z',
	slug: 'terms-of-use',
	title: 'Όροι χρήσης',
	upcoming: null,
	updatedAt: null,
	version: '1.0.1',
	language: 'el',
	metaTitle: null,
	metaDescription: null,
	canonicalUrl: null,
	...overrides
});

const hrefs = {
	upcomingHref: '/legal/terms-of-use?edition=upcoming',
	currentHref: '/legal/terms-of-use'
};

describe('legal::lib::document', () => {
	it('U-59.1 Π1: «Έκδοση X · Ισχύει από <ημέρα>» — the day on the Greek calendar, long month; the parts that are known', () => {
		expect(formatLegalDay('2026-06-30T22:30:00.000Z', 'el')).toBe('1 Ιουλίου 2026');
		expect(buildLegalMeta(facts(), 'el')).toBe('Έκδοση 1.0.1 · Ισχύει από 1 Ιουλίου 2026');
		expect(buildLegalMeta(facts({ version: null }), 'en')).toBe('In force from July 1, 2026');
		expect(buildLegalMeta(facts({ version: null, effectiveAt: null }), 'el')).toBe('');
	});

	it('U-59.1 Π2 / U-59.2: a text in force that announces a change says so and links the new edition', () => {
		const view = buildLegalDocumentView({
			document: facts({ upcoming: { version: '1.1.0', effectiveAt: '2026-12-02T00:00:00.000Z' } }),
			edition: undefined,
			locale: 'el',
			...hrefs
		});
		expect(view.notice).toEqual({
			text: 'Νέα έκδοση 1.1.0 — ισχύει από 2 Δεκεμβρίου 2026',
			actionLabel: 'Δείτε τη νέα έκδοση',
			actionHref: '/legal/terms-of-use?edition=upcoming',
			testId: 'legal-edition-notice'
		});
	});

	it('U-59.1 Π2: the announced edition says which one it is and links the one in force («Δείτε την ισχύουσα»)', () => {
		const view = buildLegalDocumentView({
			document: facts({ version: '1.1.0', effectiveAt: '2026-12-02T00:00:00.000Z' }),
			edition: 'upcoming',
			locale: 'el',
			...hrefs
		});
		expect(view.notice?.text).toBe(
			'Διαβάζετε τη νέα έκδοση 1.1.0, που ισχύει από 2 Δεκεμβρίου 2026.'
		);
		expect(view.notice?.actionLabel).toBe('Δείτε την ισχύουσα');
		expect(view.notice?.actionHref).toBe('/legal/terms-of-use');
	});

	it('U-59.1 (negative): no announcement, no notice', () => {
		expect(
			buildLegalDocumentView({ document: facts(), edition: undefined, locale: 'el', ...hrefs })
				.notice
		).toBeNull();
	});

	it('U-59.4 (app = web): a text in another language than the page’s is named; the same language says nothing', () => {
		expect(buildContentLanguageNote('el', 'en')).toBe('This text is available in Greek only.');
		expect(buildContentLanguageNote('en', 'el')).toBe(
			'Το κείμενο είναι διαθέσιμο μόνο στα Αγγλικά.'
		);
		expect(buildContentLanguageNote('el', 'el')).toBeNull();
		expect(buildContentLanguageNote(null, 'en')).toBeNull();
	});

	it('common v2 §A: «Σε αυτό το κείμενο» lists the text’s H2s at the body’s ids', () => {
		const view = buildLegalDocumentView({
			document: facts(),
			edition: undefined,
			locale: 'el',
			...hrefs
		});
		expect(view.toc).toEqual([
			{ id: 'ο-λογαριασμος-σας', label: 'Ο λογαριασμός σας' },
			{ id: 'ραντεβου-και-ακυρωσεις', label: 'Ραντεβού και ακυρώσεις' }
		]);
	});
});
