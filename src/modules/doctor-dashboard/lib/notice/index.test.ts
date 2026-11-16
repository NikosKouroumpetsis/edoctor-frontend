import { describe, expect, it } from 'vitest';
import { buildLicenceNotice } from './index';

describe('the licence notice above «Σήμερα» (U-185.2)', () => {
	it('U-185.2: «λήγει» from the server’s EXPIRING, with the day on the platform’s calendar and what it means', () => {
		const notice = buildLicenceNotice(
			{ kind: 'EXPIRING', endsAt: '2026-12-14T10:00:00.000Z' },
			'el'
		);
		expect(notice).toEqual({
			title: 'Η άδειά σας λήγει στις 14 Δεκεμβρίου 2026',
			lines: [
				'Μετά τη λήξη δεν θα εμφανίζεστε στην αναζήτηση και δεν θα δέχεστε νέα ραντεβού. Για ανανέωση, γράψτε μας από το Κέντρο βοήθειας.'
			]
		});
	});

	it('U-185.2: «έληξε» after the end — the booked visits and the messages stay', () => {
		const notice = buildLicenceNotice(
			{ kind: 'EXPIRED', endsAt: '2026-10-31T10:00:00.000Z' },
			'el'
		);
		expect(notice?.title).toBe('Η άδειά σας έληξε στις 31 Οκτωβρίου 2026');
		expect(notice?.lines[0]).toContain('Τα ραντεβού που έχουν ήδη κλειστεί μένουν');
		expect(
			buildLicenceNotice({ kind: 'EXPIRED', endsAt: '2026-10-31T10:00:00.000Z' }, 'en')?.title
		).toBe('Your licence expired on October 31, 2026');
	});

	it('the day is the platform’s (Athens): an end at 23:30 UTC is already the next day there', () => {
		expect(
			buildLicenceNotice({ kind: 'EXPIRING', endsAt: '2026-12-14T23:30:00.000Z' }, 'el')?.title
		).toBe('Η άδειά σας λήγει στις 15 Δεκεμβρίου 2026');
	});

	it('D-W51-18 (negative): no notice, or a day that is none — nothing is drawn, never «Λογαριασμός γιατρού»', () => {
		expect(buildLicenceNotice(null, 'el')).toBeNull();
		expect(buildLicenceNotice({ kind: 'EXPIRED', endsAt: 'soon' }, 'el')).toBeNull();
		const notice = buildLicenceNotice(
			{ kind: 'EXPIRING', endsAt: '2026-12-14T10:00:00.000Z' },
			'el'
		);
		expect(JSON.stringify(notice)).not.toContain('Λογαριασμός γιατρού');
	});
});
