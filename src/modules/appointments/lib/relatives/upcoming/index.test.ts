import { describe, expect, it } from 'vitest';
import { appointmentFactsSample } from '$modules/appointments/api/appointment/appointment.sample';
import { relativeUpcoming, relativeUpcomingLine } from '.';

const visit = (id: string, relativeId: string | null, startTime: string) => ({
	...appointmentFactsSample,
	id,
	relativeId,
	startTime
});

describe('U-139.4 · D-W4-21: a relative’s upcoming visits, out of the ONE read of the upcoming', () => {
	const page = [
		visit('a-1', null, '2026-11-12T10:30:00.000Z'),
		visit('a-2', 'r-1', '2026-11-24T15:30:00.000Z'),
		visit('a-3', 'r-2', '2026-11-25T08:00:00.000Z'),
		visit('a-4', 'r-1', '2026-12-02T09:00:00.000Z')
	];

	it('0 / 1 / many: only the visits booked for this relative, the first in the server’s order', () => {
		expect(relativeUpcoming(page, 'r-9')).toEqual({ count: 0, first: null });
		expect(relativeUpcoming(page, 'r-2')).toMatchObject({ count: 1, first: { id: 'a-3' } });
		expect(relativeUpcoming(page, 'r-1')).toMatchObject({ count: 2, first: { id: 'a-2' } });
		expect(relativeUpcoming([], 'r-1')).toEqual({ count: 0, first: null });
	});

	it('the window’s line: the day, the hour and the doctor (once known); many say how many and the first; none says nothing', () => {
		expect(
			relativeUpcomingLine(relativeUpcoming(page, 'r-9'), 'Αθηνά Παπαδοπούλου', 'el')
		).toBeNull();
		expect(relativeUpcomingLine(relativeUpcoming(page, 'r-2'), 'Αθηνά Παπαδοπούλου', 'el')).toBe(
			'Έχει 1 επερχόμενο ραντεβού, που θα γίνει κανονικά: Τετάρτη 25 Νοεμβρίου · 10:00 · Dr. Αθηνά Παπαδοπούλου.'
		);
		expect(relativeUpcomingLine(relativeUpcoming(page, 'r-1'), null, 'el')).toBe(
			'Έχει 2 επερχόμενα ραντεβού, που θα γίνουν κανονικά. Το πρώτο: Τρίτη 24 Νοεμβρίου · 17:30.'
		);
	});
});
