import { describe, expect, it } from 'vitest';
import { bookingPatientSample } from '../booking.sample';
import { buildForWhomOptions, forWhomOptionId } from '.';

describe('«Για ποιον είναι το ραντεβού;» (record §3.3, app = web)', () => {
	it('the account holder, then each relative by name', () => {
		const options = buildForWhomOptions(bookingPatientSample, 'el');
		expect(options.map((option) => [option.id, option.label])).toEqual([
			['self', 'Για μένα'],
			['rel-1', 'Πέτρος Μάρκου']
		]);
		expect(forWhomOptionId({ kind: 'relative', relativeId: 'rel-1' }, options)).toBe('rel-1');
	});

	it('(negative) no relatives: one row; a relative the list lost is no option', () => {
		const options = buildForWhomOptions({ ...bookingPatientSample, relatives: [] }, 'en');
		expect(options).toEqual([{ id: 'self', label: 'For me', visitor: { kind: 'self' } }]);
		expect(forWhomOptionId({ kind: 'relative', relativeId: 'gone' }, options)).toBeNull();
	});
});
