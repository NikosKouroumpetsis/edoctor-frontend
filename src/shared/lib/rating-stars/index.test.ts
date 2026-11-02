import { describe, expect, it } from 'vitest';
import { RATING_STARS_MAX, toStarScore } from './index';

describe('shared/lib/rating-stars', () => {
	it('U-49: every public score is on 5 stars — 0…5 passes as it comes, halves and two decimals included', () => {
		expect(RATING_STARS_MAX).toBe(5);
		for (const value of [0, 0.5, 3.42, 4.5, 4.91, 5]) expect(toStarScore(value)).toBe(value);
	});

	it('U-49 (negative): a value above 5 (the old 1–10 scale), below 0 or no number is no score — never clamped, never halved', () => {
		for (const value of [
			5.01,
			9,
			9.81,
			10,
			-0.5,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			null,
			undefined
		]) {
			expect(toStarScore(value)).toBeNull();
		}
	});
});
