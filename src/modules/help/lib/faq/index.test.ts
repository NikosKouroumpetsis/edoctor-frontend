import { describe, expect, it } from 'vitest';
import type { RichTextDoc } from '$shared/lib/rich-text';
import {
	buildFaq,
	buildFaqJsonLd,
	faqAnchorOf,
	faqMatchExcerpt,
	faqTargetOf,
	faqTopicOf,
	searchFaq
} from '.';

const h2 = (text: string, attrs: Record<string, unknown> = {}) => ({
	type: 'heading',
	attrs: { level: 2, ...attrs },
	text
});
const h3 = (text: string, attrs: Record<string, unknown> = {}) => ({
	type: 'heading',
	attrs: { level: 3, ...attrs },
	text
});
const p = (text: string) => ({ type: 'paragraph', text });

/** The seed's `faq` page in miniature: its anchors, a topic of unanswered questions, the popular marks. */
const faqPage: RichTextDoc = {
	type: 'doc',
	content: [
		p('Λέξεις πριν από το πρώτο θέμα.'),
		h2('Υπηρεσίες και πληροφορίες', { anchor: 'services', label: 'Υπηρεσίες' }),
		h3('Τι είναι το edoctor;', { anchor: 'what-is-edoctor' }),
		p('Η μεγαλύτερη υπηρεσία υγείας.'),
		h2('Διαδικασία ραντεβού', { anchor: 'booking', label: 'Ραντεβού' }),
		h3('Τι χρειάζεται για να κλείσω ραντεβού;', { anchor: 'what-you-need', popular: true }),
		p('Θα χρειαστεί το email σας.'),
		h3('Πώς μπορώ να αλλάξω ή να ακυρώσω το ραντεβού μου;', {
			anchor: 'cancellation',
			popular: true
		}),
		p('Για ακύρωση θα χρειαστεί να συνδεθείτε στον λογαριασμό σας.'),
		h2('edoctor chat', { anchor: 'chat' }),
		h3('Τι είναι το edoctor chat;'),
		h3('Ποιοι γιατροί είναι διαθέσιμοι;'),
		h2('Προσωπικός λογαριασμός', { anchor: 'account' }),
		h3('Έχω ξεχάσει τον κωδικό μου;', { anchor: 'forgot-password' }),
		p('Στην ενότητα Σύνδεση πατήστε «Ξέχασες τον κωδικό σου;».'),
		h3('Πώς διαγράφω τον λογαριασμό;', { anchor: 'delete-account' }),
		p('Προφίλ › Ρυθμίσεις λογαριασμού › Διαγραφή λογαριασμού.')
	]
};

describe('help::lib::faq', () => {
	it('U-60.1 (app = web): an H2 is a topic (its anchor, its short name), an H3 a question, what follows it its answer', () => {
		const faq = buildFaq(faqPage);
		expect(faq.topics.map((topic) => [topic.id, topic.label])).toEqual([
			['services', 'Υπηρεσίες'],
			['booking', 'Ραντεβού'],
			['account', 'Προσωπικός λογαριασμός']
		]);
		const [cancellation] = faq.topics[1].questions.slice(1);
		expect(cancellation).toMatchObject({
			id: 'cancellation',
			topicId: 'booking',
			question: 'Πώς μπορώ να αλλάξω ή να ακυρώσω το ραντεβού μου;',
			answerText: 'Για ακύρωση θα χρειαστεί να συνδεθείτε στον λογαριασμό σας.'
		});
	});

	it('U-60.3 Ε4 (app = web, negative): a question without an answer is not shown, nor a topic left empty; words before the first topic are no question', () => {
		const faq = buildFaq(faqPage);
		const questions = faq.topics.flatMap((topic) => topic.questions.map((item) => item.question));
		expect(questions).not.toContain('Τι είναι το edoctor chat;');
		expect(faq.topics.map((topic) => topic.id)).not.toContain('chat');
		expect(questions).not.toContain('Λέξεις πριν από το πρώτο θέμα.');
		expect(buildFaq(null)).toEqual({ shape: 'empty', topics: [], popular: [], body: [] });
	});

	it('U-60.1 / U-60.3 Ε3: «Δημοφιλείς ερωτήσεις» are the CMS’s marks, in the page’s order; none marked ⇒ none', () => {
		expect(buildFaq(faqPage).popular.map((item) => item.id)).toEqual([
			'what-you-need',
			'cancellation'
		]);
		const unmarked: RichTextDoc = { content: [h2('Θέμα'), h3('Ερώτηση;'), p('Απάντηση.')] };
		expect(buildFaq(unmarked).popular).toEqual([]);
		const many: RichTextDoc = {
			content: [
				h2('Θέμα'),
				...Array.from({ length: 8 }, (_, n) => [
					h3(`Ερώτηση ${n};`, { popular: true }),
					p('Ναι.')
				]).flat()
			]
		};
		expect(buildFaq(many).popular).toHaveLength(6);
	});

	it('U-60.1 / U-60.3 Ε3 (backend round 1, m-3): `attrs.popularRank` orders the marked ones; the marked without a (valid) place follow in the page’s order; a place without the mark is no popular one (negative)', () => {
		const ranked: RichTextDoc = {
			content: [
				h2('Θέμα'),
				h3('Τι χρειάζεται;', { popular: true, popularRank: 1 }),
				p('Α.'),
				h3('Χρέωση;', { popular: true, popularRank: 3 }),
				p('Α.'),
				h3('Χωρίς θέση;', { popular: true }),
				p('Α.'),
				h3('Αλλαγή ή ακύρωση;', { popular: true, popularRank: 2 }),
				p('Α.'),
				h3('Μόνο θέση;', { popularRank: 4 }),
				p('Α.'),
				h3('Άκυρη θέση;', { popular: true, popularRank: 0 }),
				p('Α.')
			]
		};
		expect(buildFaq(ranked).popular.map((item) => item.question)).toEqual([
			'Τι χρειάζεται;',
			'Αλλαγή ή ακύρωση;',
			'Χρέωση;',
			'Χωρίς θέση;',
			'Άκυρη θέση;'
		]);
	});

	it('MINOR-9 of r1 (app = web, `QUESTION_LEVEL = 3`): an H4 inside an answer belongs to the answer — never a question of its own', () => {
		const faq = buildFaq({
			content: [
				h2('Θέμα', { anchor: 'topic' }),
				h3('Ερώτηση;', { anchor: 'question' }),
				p('Πρώτα.'),
				{ type: 'heading', attrs: { level: 4 }, text: 'Υπότιτλος' },
				p('Μετά.')
			]
		});
		expect(faq.topics[0].questions.map((item) => item.id)).toEqual(['question']);
		expect(faq.topics[0].questions[0].answerText).toContain('Υπότιτλος');
		expect(faq.topics[0].questions[0].answerText).toContain('Μετά.');
	});

	it('U-60.1 (negative, MAJOR-1 of r1): a page without H2/H3 (the seed’s plain paragraphs of HEAD) is its text — never an empty page', () => {
		const plain: RichTextDoc = {
			type: 'doc',
			content: [p('Πώς κλείνω ραντεβού;'), p('Από την αναζήτηση γιατρών.'), p('Ακύρωση;')]
		};
		const faq = buildFaq(plain);
		expect(faq.shape).toBe('text');
		expect(faq.topics).toEqual([]);
		expect(faq.popular).toEqual([]);
		expect(faq.body).toHaveLength(3);
		expect(buildFaqJsonLd(faq)).toBeNull();
		const onlyTopics = buildFaq({ content: [h2('Ραντεβού'), p('Κείμενο.'), h2('Λογαριασμός')] });
		expect(onlyTopics.shape).toBe('text');
		expect(onlyTopics.body).toHaveLength(3);
		expect(buildFaq({ content: [] }).shape).toBe('empty');
		expect(buildFaq(faqPage).shape).toBe('topics');
		expect(buildFaq(faqPage).body).toEqual([]);
	});

	it('U-60.3 Ε3: a topic without a short name shows its title on the chip', () => {
		const faq = buildFaq({
			content: [h2('Προσωπικός λογαριασμός', { anchor: 'account' }), h3('Ε;'), p('Α.')]
		});
		expect(faq.topics[0].label).toBe('Προσωπικός λογαριασμός');
		expect(faqTopicOf(faq, 'account')?.id).toBe('account');
		expect(faqTopicOf(faq, 'unknown')).toBeNull();
		expect(faqTopicOf(faq, null)).toBeNull();
	});

	it('U-60.1 (app = web): the search is in the question AND its answer, without accents or case; the question’s hits first', () => {
		const faq = buildFaq(faqPage);
		expect(searchFaq(faq, 'ΚΩΔΙΚΟ').map((hit) => hit.question.id)).toEqual(['forgot-password']);
		expect(searchFaq(faq, 'λογαριασμο').map((hit) => hit.question.id)).toEqual([
			'delete-account',
			'cancellation'
		]);
		expect(
			searchFaq(faq, 'ραντεβου', faqTopicOf(faq, 'booking')).map((hit) => hit.topic.id)
		).toEqual(['booking', 'booking']);
		expect(searchFaq(faq, '   ')).toEqual([]);
		expect(searchFaq(faq, 'τίποτα-τέτοιο')).toEqual([]);
	});

	it('U-60.1: a suggestion that matched in the answer shows where, from the word before, with «…» where it was cut', () => {
		const faq = buildFaq(faqPage);
		const [hit] = searchFaq(faq, 'συνδεθειτε');
		expect(faqMatchExcerpt(hit, 'συνδεθειτε')).toBe('…να συνδεθείτε στον λογαριασμό σας.');
		const [inQuestion] = searchFaq(faq, 'κωδικο');
		expect(faqMatchExcerpt(inQuestion, 'κωδικο')).toBe('');
	});

	it('U-60.1 (Π5): `#booking` is a topic, `#cancellation` a question (to open); anything else nothing', () => {
		const faq = buildFaq(faqPage);
		expect(faqTargetOf(faq, '#booking')).toMatchObject({ kind: 'topic', topic: { id: 'booking' } });
		expect(faqTargetOf(faq, 'cancellation')).toMatchObject({
			kind: 'question',
			topic: { id: 'booking' },
			question: { id: 'cancellation' }
		});
		expect(faqTargetOf(faq, '#chat')).toBeNull();
		expect(faqTargetOf(faq, '')).toBeNull();
	});

	it('MINOR-4 of r1 (negative): a broken escape in the address is no anchor — never a throw', () => {
		expect(faqAnchorOf('#cancellation')).toBe('cancellation');
		expect(faqAnchorOf('#%CE%B1')).toBe('α');
		expect(faqAnchorOf('#%')).toBe('');
		expect(faqAnchorOf('#%E0%A4')).toBe('');
		expect(faqAnchorOf('')).toBe('');
		expect(faqAnchorOf(null)).toBe('');
	});

	it('U-28.4 / common v2: the JSON-LD `FAQPage` holds only the answered questions', () => {
		const ld = buildFaqJsonLd(buildFaq(faqPage)) as { mainEntity: { name: string }[] };
		expect(ld.mainEntity.map((entry) => entry.name)).toHaveLength(5);
		expect(ld.mainEntity.map((entry) => entry.name)).not.toContain('Τι είναι το edoctor chat;');
		expect(buildFaqJsonLd(buildFaq(null))).toBeNull();
	});
});
