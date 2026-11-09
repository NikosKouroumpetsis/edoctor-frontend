import { describe, expect, it } from 'vitest';
import { officeFloorOf } from '.';

describe('the office’s floor (D-W3-26)', () => {
	it('D-W3-26: no floor from the server starts — and is sent — as the ground floor (0)', () => {
		expect(officeFloorOf(null)).toBe(0);
		expect(officeFloorOf(undefined)).toBe(0);
	});

	it('the server’s own floor stays, the basement and the 20th included', () => {
		expect(officeFloorOf(-1)).toBe(-1);
		expect(officeFloorOf(3)).toBe(3);
		expect(officeFloorOf(20)).toBe(20);
	});

	it('(negative) a floor outside the schema or not whole is the ground floor', () => {
		expect(officeFloorOf(21)).toBe(0);
		expect(officeFloorOf(-2)).toBe(0);
		expect(officeFloorOf(2.5)).toBe(0);
		expect(officeFloorOf(Number.NaN)).toBe(0);
	});
});
