import { describe, expect, it } from 'vitest';
import { mapDoctorArticle, mapDoctorArticlesPage } from '$modules/doctor-dashboard/api/articles';
import {
	sampleArticle,
	sampleArticleRow,
	sampleArticleRows
} from '$modules/doctor-dashboard/api/articles/articles.sample';
import {
	buildDoctorArticleRows,
	doctorArticleCanDraft,
	doctorArticleCount,
	doctorArticleErrors,
	doctorArticleKindOptions,
	doctorArticleNote,
	doctorArticlesFailureText,
	doctorArticleState
} from '.';

const article = (input: Parameters<typeof sampleArticle>[1] = {}) => {
	const read = mapDoctorArticle(sampleArticle(1, input));
	if (!read) throw new Error('not an article');
	return read;
};

const page = (rows = sampleArticleRows()) => {
	const read = mapDoctorArticlesPage({ items: rows, nextCursor: null, total: rows.length });
	if (!read) throw new Error('not a page');
	return read;
};

describe('doctor-dashboard::lib::articles (D-W52-102)', () => {
	it('🔴 D-W52-102 (U-221.1): the four states and the two of a change — pill, tone and the words of the state', () => {
		const [changed, review, draft, rejected, published] = page().items;
		expect(doctorArticleState(published, 'el')).toEqual({
			pill: { label: 'Δημοσιευμένο', tone: 'success' },
			line: 'Από 3 Νοεμβρίου 2026'
		});
		expect(doctorArticleState(changed, 'el').line).toBe('Η αλλαγή σας ελέγχεται');
		expect(doctorArticleState(review, 'el')).toEqual({
			pill: { label: 'Σε έλεγχο', tone: 'warning' },
			line: 'Στάλθηκε 12 Νοεμβρίου 2026'
		});
		expect(doctorArticleState(draft, 'el')).toEqual({
			pill: { label: 'Πρόχειρο', tone: 'muted' },
			line: 'Τελευταία αλλαγή 10 Νοεμβρίου 2026'
		});
		expect(doctorArticleState(rejected, 'el')).toEqual({
			pill: { label: 'Δεν δημοσιεύτηκε', tone: 'refused' },
			line: 'Διορθώστε το και στείλτε το ξανά'
		});
		const refusedChange = page([
			sampleArticleRow(9, {
				status: 'PUBLISHED',
				publishedAt: '2026-10-01T09:00:00.000Z',
				revision: {
					status: 'REJECTED',
					submittedAt: '2026-11-01T09:00:00.000Z',
					rejectedAt: '2026-11-02T09:00:00.000Z',
					rejectionReason: 'Χωρίς πηγή.'
				}
			})
		]).items[0];
		expect(doctorArticleState(refusedChange, 'el')).toEqual({
			pill: { label: 'Δημοσιευμένο', tone: 'success' },
			line: 'Η αλλαγή σας δεν δημοσιεύτηκε'
		});
		expect(doctorArticleState(review, 'en').line).toBe('Sent November 12, 2026');
	});

	it('D-W52-102: the rows of the pages read, each article once, «είδος · state»', () => {
		const rows = buildDoctorArticleRows([page(), page()], 'el');
		expect(rows).toHaveLength(5);
		expect(rows[0]).toMatchObject({
			title: 'Άσκηση μετά από έμφραγμα: από πού να ξεκινήσετε',
			meta: 'Συμβουλή υγείας · Η αλλαγή σας ελέγχεται',
			imageUrl: 'https://cdn.seed.edoctor.test/articles/a2.webp'
		});
		expect(buildDoctorArticleRows(undefined, 'el')).toEqual([]);
	});

	it('D-W52-95: every refusal has its words — the rate, gone, changed, the 50, the cover, the text, the connection', () => {
		expect(doctorArticlesFailureText('rate-limited', 'save', 'el')).toMatch(/Πολλές προσπάθειες/u);
		expect(doctorArticlesFailureText('gone', 'save', 'el')).toBe('Αυτό το άρθρο δεν υπάρχει πια.');
		expect(doctorArticlesFailureText('limit', 'save', 'el')).toMatch(/50 άρθρα/u);
		expect(doctorArticlesFailureText('cover-small', 'save', 'el')).toMatch(/800 × 600/u);
		expect(doctorArticlesFailureText('content', 'send', 'el')).toMatch(/συνδέσμους/u);
		expect(doctorArticlesFailureText('unknown', 'delete', 'el')).toMatch(/διαγραφή/u);
		expect(doctorArticlesFailureText('unknown', 'send', 'en')).toBe(
			'Not saved. Check your connection and try again.'
		);
	});
	it('🔴 D-W52-103 (U-221.1): what stands over one article — a draft, in review, published, its change in review, a refusal of it or of its change with the team’s words', () => {
		expect(doctorArticleNote(null, 'el')).toBeNull();
		expect(doctorArticleNote(article(), 'el')).toEqual({
			kind: 'band',
			glyph: 'pen',
			text: 'Πρόχειρο. Το βλέπετε μόνο εσείς.'
		});
		expect(
			doctorArticleNote(
				article({ status: 'IN_REVIEW', submittedAt: '2026-11-12T09:00:00.000Z' }),
				'el'
			)
		).toMatchObject({ glyph: 'clock', text: expect.stringContaining('από 12 Νοεμβρίου 2026') });
		const published = { status: 'PUBLISHED' as const, publishedAt: '2026-10-12T09:00:00.000Z' };
		expect(doctorArticleNote(article(published), 'el')).toMatchObject({ glyph: 'done' });
		expect(
			doctorArticleNote(
				article({
					...published,
					hasPendingRevision: true,
					revision: {
						status: 'IN_REVIEW',
						submittedAt: '2026-11-13T09:00:00.000Z',
						rejectedAt: null,
						rejectionReason: null
					}
				}),
				'el'
			)
		).toMatchObject({
			text: 'Η αλλαγή σας ελέγχεται από 13 Νοεμβρίου 2026. Ως τότε οι ασθενείς βλέπουν το άρθρο όπως ήταν.'
		});
		expect(
			doctorArticleNote(
				article({
					...published,
					revision: {
						status: 'REJECTED',
						submittedAt: '2026-11-07T09:00:00.000Z',
						rejectedAt: '2026-11-09T09:00:00.000Z',
						rejectionReason: 'Χωρίς πηγές.'
					}
				}),
				'el'
			)
		).toEqual({
			kind: 'refused',
			title: 'Η αλλαγή σας δεν δημοσιεύτηκε · 9 Νοεμβρίου 2026',
			reason: 'Η ομάδα του eDoctor γράφει: «Χωρίς πηγές.»',
			fix: 'Διορθώστε το και στείλτε το ξανά.'
		});
		expect(
			doctorArticleNote(
				article({ status: 'REJECTED', rejectedAt: '2026-11-08T09:00:00.000Z' }),
				'el'
			)
		).toMatchObject({ kind: 'refused', reason: null });
	});

	it('🔴 D-W52-95: «Αποθήκευση πρόχειρου» only before the first publication', () => {
		expect(doctorArticleCanDraft(null)).toBe(true);
		expect(doctorArticleCanDraft(article())).toBe(true);
		expect(doctorArticleCanDraft(article({ status: 'REJECTED' }))).toBe(true);
		expect(doctorArticleCanDraft(article({ status: 'IN_REVIEW' }))).toBe(false);
		expect(doctorArticleCanDraft(article({ status: 'PUBLISHED' }))).toBe(false);
	});

	it('🔴 D-W52-103: the three messages — a draft needs a title; a sending the title, the short description and a word of text', () => {
		const empty = { title: ' ', description: '', content: null };
		expect(doctorArticleErrors(empty, 'save', 'el')).toEqual({
			title: 'Γράψτε τίτλο για να το αποθηκεύσετε.'
		});
		expect(doctorArticleErrors(empty, 'send', 'el')).toEqual({
			title: 'Γράψτε τον τίτλο.',
			description: 'Γράψτε μια σύντομη περιγραφή.',
			text: 'Γράψτε το κείμενο του άρθρου.'
		});
		const rule = { type: 'doc' as const, content: [{ type: 'horizontalRule' }] };
		expect(
			doctorArticleErrors({ title: 'Τ', description: 'Π', content: rule }, 'send', 'el')
		).toEqual({
			text: 'Γράψτε το κείμενο του άρθρου.'
		});
		expect(doctorArticleCount(50_000, 50_000, 'el')).toBe('50.000 / 50.000 χαρακτήρες');
		expect(doctorArticleCount(1_234, 50_000, 'en')).toBe('1,234 / 50,000 characters');
		expect(doctorArticleKindOptions('el').map((option) => option.value)).toEqual([
			'ARTICLE',
			'HEALTH_ADVICE'
		]);
	});
});
