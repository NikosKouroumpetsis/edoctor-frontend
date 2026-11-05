import { describe, expect, it } from 'vitest';
import {
	DOCTOR_DETAIL_SECTIONS,
	doctorDetailsPath,
	doctorProfilePath,
	isDoctorDetailSection,
	readDoctorDetailHints,
	readDoctorPhotoFocus
} from './index';

describe('lib/detail sections (the windows’ addresses)', () => {
	it('Π7 (app = web): the windows are the application’s `details/*` plus the photos, each its own address with its hints', () => {
		expect(DOCTOR_DETAIL_SECTIONS).toEqual([
			'services',
			'specializations',
			'know',
			'location',
			'reviews',
			'availability',
			'photos'
		]);
		expect(doctorProfilePath('dr-athena')).toBe('/doctors/dr-athena');
		expect(
			doctorDetailsPath('dr-athena', 'availability', { office: 'off-2', date: '2026-11-02' })
		).toBe('/doctors/dr-athena/details/availability?office=off-2&date=2026-11-02');
		expect(doctorDetailsPath('dr-athena', 'photos', { focus: '2' })).toBe(
			'/doctors/dr-athena/details/photos?focus=2'
		);
	});

	it('Π7: an address is untrusted — only plain ids and a `YYYY-MM-DD` day survive; an unknown section is none', () => {
		const hints = readDoctorDetailHints(
			new URLSearchParams(
				'focus=rev-1&office=%3Cscript%3E&date=2026-11-02&service=svc_1&photo=4&extra=1'
			)
		);
		expect(hints).toEqual({ focus: 'rev-1', date: '2026-11-02', service: 'svc_1' });
		expect(readDoctorDetailHints(new URLSearchParams('date=02/11/2026'))).toEqual({});
		expect(isDoctorDetailSection('reviews')).toBe(true);
		expect(isDoctorDetailSection('articles')).toBe(false);
	});

	it('U-65.6: a link’s `mention` passes only by the list of the six, anything else is ignored', () => {
		const read = (query: string) => readDoctorDetailHints(new URLSearchParams(query)).mention;
		expect(read('mention=COURTESY')).toBe('COURTESY');
		expect(read('mention=ACCESS')).toBe('ACCESS');
		for (const query of [
			'',
			'mention=',
			'mention=WAIT',
			'mention=PUNCTUALITY',
			'mention=courtesy',
			'mention=COURTESY%20',
			'mention=%3Cscript%3Ealert(1)%3C/script%3E',
			"mention=COURTESY'%20OR%201=1",
			`mention=${'A'.repeat(5000)}`
		]) {
			expect(read(query), query).toBeUndefined();
		}
	});

	it('U-14.6 (app = web): the photos window takes the application’s `focus` — a photo’s place from 0, digits only (≤ 3); anything else is the tour', () => {
		expect(readDoctorPhotoFocus('0')).toBe(0);
		expect(readDoctorPhotoFocus('24')).toBe(24);
		expect(readDoctorPhotoFocus('999')).toBe(999);
		for (const value of [undefined, '', 'abc', '-1', '1.5', '1000', ' 2', '2e1']) {
			expect(readDoctorPhotoFocus(value)).toBeUndefined();
		}
	});
});
