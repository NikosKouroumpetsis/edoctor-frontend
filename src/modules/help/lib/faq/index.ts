import {
	buildRichText,
	richTextBlocksText,
	type RichTextBlock,
	type RichTextDoc
} from '$shared/lib/rich-text';
import { foldSearchText, matchesSearch, searchWords } from '$shared/lib/text';
import { FAQ_POPULAR_LIMIT } from '$modules/help/config/faq';

/** One question: the H3's words, its anchor, its answer (the blocks up to the next H2 or H3) and their words. */
export type FaqQuestion = {
	id: string;
	topicId: string;
	question: string;
	answer: RichTextBlock[];
	answerText: string;
	/** The CMS's «popular» mark (`attrs.popular`; its place, when it has one, in `popularRank`). */
	popular: boolean;
	/** Its place among the popular ones (`attrs.popularRank`), `null` when the CMS gives none. */
	popularRank: number | null;
};

/** One topic: the H2 (its anchor, `#booking`), the chip's short name (`attrs.label`, else the title), its questions. */
export type FaqTopic = { id: string; title: string; label: string; questions: FaqQuestion[] };

/**
 * What the CMS page gives the help centre (U-60.1, MAJOR-1 of r1): `topics` its H2/H3 structure; `text` words without
 * that structure (the page drawn as a text, as the legal ones); `empty` nothing at all.
 */
export type FaqShape = 'topics' | 'text' | 'empty';

/** The FAQ as the help centre draws it (U-60.1): the topics with answered questions, the popular ones, the body. */
export type Faq = {
	shape: FaqShape;
	topics: FaqTopic[];
	popular: FaqQuestion[];
	body: RichTextBlock[];
};

/** One answer of a search: the question and its topic. */
export type FaqSearchHit = { topic: FaqTopic; question: FaqQuestion };

/** Where an anchor of the FAQ points: a topic, or a question (with its topic), or nothing on the page. */
export type FaqTarget =
	| { kind: 'topic'; topic: FaqTopic }
	| { kind: 'question'; topic: FaqTopic; question: FaqQuestion }
	| null;

type DraftTopic = { id: string; title: string; label: string; questions: FaqQuestion[] };

/** The levels of the FAQ (the application's `TOPIC_LEVEL` / `QUESTION_LEVEL`): deeper headings belong to an answer. */
const TOPIC_LEVEL = 2;
const QUESTION_LEVEL = 3;

/**
 * 🔴 U-60.1 / U-60.3 Ε4 (app = web, the application's `readFaqTopics`): the CMS page `faq` read by its headings — an H2
 * is a topic (its anchor, its short name `attrs.label`), an H3 a question, what follows a question up to the next H2
 * or H3 its answer (an H4 included, MINOR-9 of r1). A question without an answer is not shown, nor a topic left
 * without questions; words before the first H2 are not a question either. «Δημοφιλείς ερωτήσεις» = the questions the
 * CMS marks (`attrs.popular`): by `attrs.popularRank` (the backend's round 1, given only with the mark), then the
 * marked ones without a place in the page's order, at most six.
 * 🔴 MAJOR-1 of r1: a page without that structure (the plain paragraphs of today's seed) is `text`, its words kept.
 */
export function buildFaq(document: RichTextDoc | null | undefined): Faq {
	const { blocks } = buildRichText(document);
	const topics: DraftTopic[] = [];
	let topic: DraftTopic | null = null;
	let question: FaqQuestion | null = null;

	for (const block of blocks) {
		if (block.kind === 'heading' && block.level === TOPIC_LEVEL) {
			topic = { id: block.id, title: block.text, label: block.label ?? block.text, questions: [] };
			topics.push(topic);
			question = null;
		} else if (block.kind === 'heading' && block.level === QUESTION_LEVEL) {
			if (!topic) continue;
			question = {
				id: block.id,
				topicId: topic.id,
				question: block.text,
				answer: [],
				answerText: '',
				popular: block.popular,
				popularRank: block.popularRank
			};
			topic.questions.push(question);
		} else if (question) {
			question.answer.push(block);
		}
	}

	const shown = topics
		.map((entry) => ({
			...entry,
			questions: entry.questions
				.map((item) => ({ ...item, answerText: richTextBlocksText(item.answer) }))
				.filter((item) => item.answerText.length > 0)
		}))
		.filter((entry) => entry.questions.length > 0);
	const marked = shown.flatMap((entry) => entry.questions).filter((item) => item.popular);
	const popular = [
		...marked
			.filter((item) => item.popularRank !== null)
			.sort((a, b) => (a.popularRank ?? 0) - (b.popularRank ?? 0)),
		...marked.filter((item) => item.popularRank === null)
	].slice(0, FAQ_POPULAR_LIMIT);
	const words = richTextBlocksText(blocks).length > 0;
	const shape: FaqShape = shown.length > 0 ? 'topics' : words ? 'text' : 'empty';
	return { shape, topics: shown, popular, body: shape === 'text' ? blocks : [] };
}

/** The topic of a `?topic=` (its anchor), or `null` for «Όλα» and for a topic the page does not have. */
export function faqTopicOf(faq: Faq, id: string | null | undefined): FaqTopic | null {
	return faq.topics.find((topic) => topic.id === id) ?? null;
}

/**
 * 🔴 U-60.1 (app = web, the prototype 08's Π4): the search in the page — every word in the question or its answer,
 * case and accents folded (`foldSearchText`: «ΚΩΔΙΚΟ» finds «κωδικό»); those with every word in the question first,
 * the page's order inside each group; within one topic when one is chosen. No words ⇒ nothing.
 */
export function searchFaq(faq: Faq, query: string, topic: FaqTopic | null = null): FaqSearchHit[] {
	const words = searchWords(query);
	if (!words.length) return [];
	const hits = faq.topics
		.filter((entry) => !topic || entry.id === topic.id)
		.flatMap((entry) =>
			entry.questions
				.filter((item) => matchesSearch(`${item.question} ${item.answerText}`, words))
				.map((item) => ({ topic: entry, question: item }))
		);
	const inQuestion = (hit: FaqSearchHit) => matchesSearch(hit.question.question, words);
	return [...hits.filter(inQuestion), ...hits.filter((hit) => !inQuestion(hit))];
}

/**
 * Where the answer matched when the question did not (the suggestion's muted line): the words from the one before
 * the first match, about 28 characters after it, with «…» where it was cut. `''` when the question holds every word.
 */
export function faqMatchExcerpt(hit: FaqSearchHit, query: string): string {
	const words = searchWords(query);
	if (!words.length || matchesSearch(hit.question.question, words)) return '';
	const text = hit.question.answerText;
	const folded = Array.from(text, (char) => foldSearchText(char).charAt(0) || char).join('');
	const word = words.find((entry) => folded.includes(entry));
	if (!word) return '';
	const at = folded.indexOf(word);
	const space = folded.lastIndexOf(' ', at - 2);
	const from = space > 0 ? space + 1 : 0;
	const to = Math.min(text.length, at + word.length + 28);
	return `${from ? '…' : ''}${text.slice(from, to)}${to < text.length ? '…' : ''}`;
}

/** The anchor of an address's `#…`, decoded; `''` for a broken escape (`#%`, MINOR-4 of r1: never a throw). */
export function faqAnchorOf(hash: string | null | undefined): string {
	const raw = (hash ?? '').replace(/^#/u, '');
	try {
		return decodeURIComponent(raw);
	} catch {
		return '';
	}
}

/** 🔴 U-60.1: where `#anchor` points — a topic (`#booking`) or a question (`#cancellation`, opened), else `null`. */
export function faqTargetOf(faq: Faq, anchor: string | null | undefined): FaqTarget {
	const id = (anchor ?? '').replace(/^#/u, '');
	if (!id) return null;
	for (const topic of faq.topics) {
		if (topic.id === id) return { kind: 'topic', topic };
		const question = topic.questions.find((item) => item.id === id);
		if (question) return { kind: 'question', topic, question };
	}
	return null;
}

/** The JSON-LD `FAQPage` (U-28.4, common v2): every answered question with its answer's words; `null` without any. */
export function buildFaqJsonLd(faq: Faq): Record<string, unknown> | null {
	const questions = faq.topics.flatMap((topic) => topic.questions);
	if (questions.length === 0) return null;
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: questions.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: { '@type': 'Answer', text: item.answerText }
		}))
	};
}
