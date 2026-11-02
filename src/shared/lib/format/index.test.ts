import { describe, expect, it } from 'vitest';
import { APPROX_COUNT_CAP, formatApproxCount, formatCount, formatEuro } from '.';

// The application's `shared/lib/format-count` cases (`index.unit.spec.ts`), the same titles (S-22), and its
// `formatEuro` `orMore` (the price filter's ceiling, S-31.6).
describe('formatCount and formatApproxCount', () => {
	it('returns the exact count below the cap', () => {
		expect(formatApproxCount(47, 'el')).toEqual({ capped: false, display: '47' });
		expect(formatApproxCount(999, 'en')).toEqual({ capped: false, display: '999' });
		expect(formatApproxCount(1, 'el', 100000)).toEqual({ capped: false, display: '1' });
	});

	it('S-31.2: groups thousands by the language, through the one number rule', () => {
		expect(formatApproxCount(12345, 'el', 100000).display).toBe('12.345');
		expect(formatApproxCount(12345, 'en', 100000).display).toBe('12,345');
		expect(formatApproxCount(1234, 'el', 100000).display).not.toBe('1234');
	});

	it('caps at the ceiling with a "+" suffix, in the language', () => {
		expect(formatApproxCount(1000, 'el')).toEqual({ capped: true, display: '1.000+' });
		expect(formatApproxCount(5000, 'en')).toEqual({ capped: true, display: '1,000+' });
		expect(formatApproxCount(5000, 'en', 500).display).toBe('500+');
	});

	it('collapses non-positive and non-finite inputs to zero', () => {
		expect(formatApproxCount(0, 'el').display).toBe('0');
		expect(formatApproxCount(-5, 'el').display).toBe('0');
		expect(formatApproxCount(Number.NaN, 'en').display).toBe('0');
	});

	it.each([
		['el', 186, '186+', '186'],
		['el', 1000, '1.000+', '1.000'],
		['en', 1000, '1,000+', '1,000'],
		['el', 1234, '1.234+', '1.234'],
		['en', 1234, '1,234+', '1,234']
	] as const)(
		'S-34.6: in %s a lower bound of %p reads «%s», the exact count «%s»',
		(language, count, lower, exact) => {
			expect(formatCount(count, language, true)).toBe(lower);
			expect(formatCount(count, language, false)).toBe(exact);
			expect(formatCount(count, language, false)).not.toContain('+');
		}
	);

	it('S-34.6: a lower bound under the compact cap is «N+» and counts as plural; an exact one is not', () => {
		expect(formatApproxCount(186, 'el', 1000, true)).toEqual({ capped: true, display: '186+' });
		expect(formatApproxCount(186, 'el', 1000, false)).toEqual({ capped: false, display: '186' });
		expect(formatApproxCount(1, 'en', 1000, true)).toEqual({ capped: true, display: '1+' });
	});

	it.each(['el', 'en'] as const)(
		'S-34.6: in %s a lower bound of 0 reads «0», never «0+»',
		(language) => {
			expect(formatCount(0, language, true)).toBe('0');
			expect(formatCount(0, language, true)).not.toContain('+');
			expect(formatApproxCount(0, language, APPROX_COUNT_CAP, true)).toEqual({
				capped: false,
				display: '0'
			});
			expect(formatApproxCount(0, language, APPROX_COUNT_CAP, true).display).not.toContain('+');
		}
	);

	it('S-34.7: the compact «1.000+» ceiling is ONE named constant, and the default cap', () => {
		expect(APPROX_COUNT_CAP).toBe(1000);
		expect(formatApproxCount(APPROX_COUNT_CAP - 1, 'el')).toEqual({
			capped: false,
			display: '999'
		});
		expect(formatApproxCount(APPROX_COUNT_CAP, 'el')).toEqual({ capped: true, display: '1.000+' });
	});
});

describe('formatEuro', () => {
	it('S-31.6 (app = web): «+» only at the ceiling, on the number, in the language', () => {
		expect(formatEuro(80, 'el')).toBe('80 €');
		expect(formatEuro(420, 'el', { orMore: true })).toBe('420+ €');
		expect(formatEuro(80, 'en')).toBe('€80');
		expect(formatEuro(420, 'en', { orMore: true })).toBe('€420+');
		expect(formatEuro(420, 'el', { orMore: false })).not.toContain('+');
	});
});
