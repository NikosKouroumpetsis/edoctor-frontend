import { describe, expect, it } from 'vitest';
import { isExploreFlow, showsBottomNav, showsSiteFooter } from './frame';

describe('the frame’s rules per page', () => {
	it('Π1 (wave 1.5, screen 5): the phone’s capsule shows everywhere but on a doctor’s profile and its windows, which keep their own booking bar', () => {
		expect(showsBottomNav('/')).toBe(true);
		expect(showsBottomNav('/doctors')).toBe(true);
		expect(showsBottomNav('/articles/flu')).toBe(true);
		expect(showsBottomNav('/doctors/dr-athena')).toBe(false);
		expect(showsBottomNav('/doctors/dr-athena/')).toBe(false);
		expect(showsBottomNav('/doctors/dr-athena/details/reviews')).toBe(false);
		expect(showsBottomNav('/doctors/dr-athena/other')).toBe(true);
	});

	it('U-61.2 Ε3: an error page shows the capsule on every path — a doctor’s «δεν βρέθηκε» too (no booking bar there)', () => {
		expect(showsBottomNav('/doctors/den-yparxei', 404)).toBe(true);
		expect(showsBottomNav('/doctors/dr-athena', 503)).toBe(true);
		expect(showsBottomNav('/doctors/dr-athena', 200)).toBe(false);
	});

	it('MINOR-4 (r1, U-25.2): a profile is no page of the search, and keeps the footer', () => {
		expect(isExploreFlow('/doctors/dr-athena')).toBe(false);
		expect(showsSiteFooter('/doctors/dr-athena')).toBe(true);
		expect(showsSiteFooter('/doctors')).toBe(false);
	});
});
