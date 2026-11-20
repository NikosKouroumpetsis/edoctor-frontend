import { describe, expect, it } from 'vitest';
import { formatVisitLength, isVisitLength, VISIT_LENGTHS } from './index';

describe('the visit lengths (D-W52-10)', () => {
	it('🔴 U-212.4 / D-W52-10: ONE list — 15, 20, then every quarter up to two hours', () => {
		expect([...VISIT_LENGTHS]).toEqual([15, 20, 30, 45, 60, 75, 90, 105, 120]);
		expect(VISIT_LENGTHS.every((minutes) => isVisitLength(minutes))).toBe(true);
		for (const other of [0, 10, 25, 50, 135, 150, '30', null, undefined, 30.5]) {
			expect(isVisitLength(other)).toBe(false);
		}
	});

	it('🔴 U-212.4 / D-W52-10: from one hour the length is written in hours — «1 ώρα», «1 ώρα και 30 λεπτά», «2 ώρες»', () => {
		expect(VISIT_LENGTHS.map((minutes) => formatVisitLength(minutes, 'el'))).toEqual([
			'15 λεπτά',
			'20 λεπτά',
			'30 λεπτά',
			'45 λεπτά',
			'1 ώρα',
			'1 ώρα και 15 λεπτά',
			'1 ώρα και 30 λεπτά',
			'1 ώρα και 45 λεπτά',
			'2 ώρες'
		]);
		expect(formatVisitLength(135, 'el')).toBe('2 ώρες και 15 λεπτά');
	});

	it('🔴 U-212.4 / D-W52-10: the short form of a row — «30′», «1 ώρα 30′», «2 ώρες»', () => {
		expect(VISIT_LENGTHS.map((minutes) => formatVisitLength(minutes, 'el', 'short'))).toEqual([
			'15′',
			'20′',
			'30′',
			'45′',
			'1 ώρα',
			'1 ώρα 15′',
			'1 ώρα 30′',
			'1 ώρα 45′',
			'2 ώρες'
		]);
		expect(formatVisitLength(150, 'el', 'short')).toBe('2 ώρες 30′');
	});

	it('the English words', () => {
		expect(formatVisitLength(45, 'en')).toBe('45 minutes');
		expect(formatVisitLength(60, 'en')).toBe('1 hour');
		expect(formatVisitLength(90, 'en')).toBe('1 hour 30 minutes');
		expect(formatVisitLength(120, 'en')).toBe('2 hours');
		expect(formatVisitLength(90, 'en', 'short')).toBe('1 h 30′');
	});

	it('(negative) a length that is no whole positive number of minutes is written as nothing', () => {
		for (const broken of [0, -15, 12.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(formatVisitLength(broken, 'el')).toBe('');
		}
	});
});
