import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOCTOR_REVIEW_TOPICS } from '$modules/doctor/config/review-topics';
import { doctorReviewTopicGlyphs } from '$modules/doctor/ui/detail/components/icons';
import { projectRoot, readSourceFiles, stripComments } from './source-scan';

/**
 * 🔴 U-91.2 (the owner, 04/11: «μην βάλεις καθόλου tag για χρονο αναμονης»): «Οι ασθενείς αναφέρουν» has six topics. No
 * label, key, glyph or value of the code speaks of the wait, in either language. The prototype 11 still shows seven.
 */
const WAIT_WORDS = /Χρόνος αναμονής|Τήρηση ώρας|Waiting time|On time/iu;
const OLD_TOPIC_VALUE = /['"`](WAIT|PUNCTUALITY)['"`]/u;
const TEST_FILE = /\.test\.ts$/u;

const catalog = (locale: 'el' | 'en'): Record<string, string> =>
	JSON.parse(readFileSync(join(projectRoot, `messages/${locale}.json`), 'utf8'));

const TOPIC_KEYS = [
	'doctor_reviews_mentions_topic_access',
	'doctor_reviews_mentions_topic_cleanliness',
	'doctor_reviews_mentions_topic_courtesy',
	'doctor_reviews_mentions_topic_explanation',
	'doctor_reviews_mentions_topic_organization',
	'doctor_reviews_mentions_topic_patience'
];

describe('U-91.2: no topic about the wait', () => {
	it.each(['el', 'en'] as const)(
		'the %s catalogue has the six topics and no word of the wait',
		(locale) => {
			const messages = catalog(locale);
			const keys = Object.keys(messages)
				.filter((key) => key.startsWith('doctor_reviews_mentions_topic_'))
				.sort();
			expect(keys).toEqual(TOPIC_KEYS);
			expect(Object.entries(messages).filter(([, text]) => WAIT_WORDS.test(text))).toEqual([]);
		}
	);

	it('the topics, their labels and their glyphs are the same six, with no hourglass', () => {
		expect(DOCTOR_REVIEW_TOPICS).toHaveLength(6);
		expect(Object.keys(doctorReviewTopicGlyphs).sort()).toEqual([...DOCTOR_REVIEW_TOPICS].sort());
		expect(Object.values(doctorReviewTopicGlyphs)).not.toContain('hourglass-outline');
	});

	it('no code of the site names the old topic', () => {
		const found = readSourceFiles()
			.filter((file) => !TEST_FILE.test(file.path))
			.filter((file) => OLD_TOPIC_VALUE.test(stripComments(file.text)))
			.map((file) => file.path);
		expect(found).toEqual([]);
	});

	it('(negative) the checks catch the wait: its words, its old values, and the scan reads the code', () => {
		for (const words of ['Χρόνος αναμονής', 'Τήρηση ώρας', 'Waiting time', 'On time']) {
			expect(WAIT_WORDS.test(words), words).toBe(true);
		}
		for (const code of [`mention: 'WAIT'`, `"PUNCTUALITY"`]) {
			expect(OLD_TOPIC_VALUE.test(code), code).toBe(true);
		}
		expect(WAIT_WORDS.test('Φιλικότητα')).toBe(false);
		expect(readSourceFiles().length).toBeGreaterThan(300);
	});

	it('the wire’s enum is the six', () => {
		const schema = readFileSync(join(projectRoot, 'src/generated/api/schema.ts'), 'utf8');
		expect(schema).toContain(
			'ReviewTopic: "COURTESY" | "EXPLANATION" | "ORGANIZATION" | "CLEANLINESS" | "PATIENCE" | "ACCESS";'
		);
	});
});
