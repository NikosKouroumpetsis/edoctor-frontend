import { afterEach, describe, expect, it } from 'vitest';
import {
	helpfulArticleTarget,
	helpfulFaqTarget,
	HELPFUL_NO_ANSWER,
	nextHelpfulAnswer,
	nextHelpfulReason,
	readHelpfulVoterKey,
	writeHelpfulVoterKey
} from '.';

const KEY = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const STORAGE = 'edoctor.test.helpful.v1';

afterEach(() => {
	window.localStorage.clear();
});

describe('helpful::lib::vote (U-78)', () => {
	it('names its targets as the server reads them', () => {
		expect(helpfulArticleTarget('ti-einai')).toBe('article:ti-einai');
		expect(helpfulFaqTarget('cancellation')).toBe('faq:cancellation');
	});

	it('U-65.6 (negative): an anchor outside the server’s grammar has no target, so no widget', () => {
		for (const anchor of ['Ακύρωση', '<script>', 'a b', '-a', 'a'.repeat(81), '']) {
			expect(helpfulFaqTarget(anchor)).toBeNull();
		}
	});

	it('Π2: the same thumb takes it back, the other one changes it', () => {
		const up = nextHelpfulAnswer(HELPFUL_NO_ANSWER, 'up');
		expect(up).toEqual({ value: 'up', reason: null });
		expect(nextHelpfulAnswer(up, 'up')).toEqual(HELPFUL_NO_ANSWER);
		expect(nextHelpfulAnswer(up, 'down')).toEqual({ value: 'down', reason: null });
	});

	it('Π3: a reason goes only with «down»; «up» forgets it, a second press clears it', () => {
		const down = { value: 'down', reason: 'unclear' } as const;
		expect(nextHelpfulAnswer(down, 'up')).toEqual({ value: 'up', reason: null });
		expect(nextHelpfulReason(down, 'unclear')).toEqual({ value: 'down', reason: null });
		expect(nextHelpfulReason(down, 'outdated')).toEqual({ value: 'down', reason: 'outdated' });
		expect(nextHelpfulReason({ value: 'up', reason: null }, 'unclear')).toEqual({
			value: 'up',
			reason: null
		});
	});

	it('U-78.1 Ε2: the device keeps the key the server gave, in its own env-scoped place', () => {
		expect(readHelpfulVoterKey()).toBeNull();
		writeHelpfulVoterKey(KEY);
		expect(window.localStorage.getItem(STORAGE)).toBe(KEY);
		expect(readHelpfulVoterKey()).toBe(KEY);
	});

	it('U-65.6 (negative): what has no key’s shape never goes to the storage or comes out of it', () => {
		writeHelpfulVoterKey('<script>');
		expect(window.localStorage.getItem(STORAGE)).toBeNull();
		window.localStorage.setItem(STORAGE, 'tampered');
		expect(readHelpfulVoterKey()).toBeNull();
	});
});
