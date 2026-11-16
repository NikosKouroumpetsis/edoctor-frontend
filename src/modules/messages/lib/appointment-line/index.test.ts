import { describe, expect, it } from 'vitest';
import { buildAppointmentLine } from '.';

/** Sunday 15 November 2026, 12:00 in Athens. */
const NOW = Date.parse('2026-11-15T10:00:00.000Z');

describe('🔴 D-W51-86: η γραμμή του ραντεβού, ποτέ «Ασθενής» (88 §74)', () => {
	it('the four lines of 88 §74, with the «πότε» of 66 / 67 / 73', () => {
		expect(
			buildAppointmentLine(
				{ kind: 'upcoming', startTime: '2026-11-17T09:00:00.000Z', forRelative: null },
				NOW,
				'el'
			)
		).toBe('Ραντεβού: Τρίτη 17 Νοεμβρίου, 11:00');
		expect(
			buildAppointmentLine(
				{ kind: 'upcoming', startTime: '2026-11-16T09:00:00.000Z', forRelative: null },
				NOW,
				'el'
			)
		).toBe('Ραντεβού: αύριο, 11:00');
		expect(
			buildAppointmentLine(
				{ kind: 'request', startTime: '2026-11-15T15:30:00.000Z', forRelative: null },
				NOW,
				'el'
			)
		).toBe('Αίτημα: σήμερα, 17:30');
		expect(
			buildAppointmentLine(
				{
					kind: 'request',
					startTime: '2026-11-15T15:30:00.000Z',
					forRelative: { firstName: 'Νίκος', lastName: 'Μαυρίδης', relation: 'CHILD' }
				},
				NOW,
				'el'
			)
		).toBe('Αίτημα για τον/την Νίκος Μαυρίδης (παιδί) · σήμερα, 17:30');
		expect(
			buildAppointmentLine(
				{ kind: 'lastVisit', startTime: '2026-11-14T08:00:00.000Z', forRelative: null },
				NOW,
				'el'
			)
		).toBe('Τελευταία επίσκεψη: χθες');
		expect(
			buildAppointmentLine(
				{ kind: 'lastVisit', startTime: '2026-10-13T08:00:00.000Z', forRelative: null },
				NOW,
				'el'
			)
		).toBe('Τελευταία επίσκεψη: 13 Οκτωβρίου');
	});

	it('the English words', () => {
		expect(
			buildAppointmentLine(
				{ kind: 'upcoming', startTime: '2026-11-17T09:00:00.000Z', forRelative: null },
				NOW,
				'en'
			)
		).toBe('Appointment: Tuesday, November 17, 11:00');
		expect(
			buildAppointmentLine(
				{ kind: 'lastVisit', startTime: '2026-11-15T08:00:00.000Z', forRelative: null },
				NOW,
				'en'
			)
		).toBe('Last visit: today');
	});

	it('no line is `null` — never «Ασθενής» in its place; a time that is no instant is none too', () => {
		expect(buildAppointmentLine(null, NOW, 'el')).toBeNull();
		expect(
			buildAppointmentLine({ kind: 'upcoming', startTime: 'αύριο', forRelative: null }, NOW, 'el')
		).toBeNull();
	});

	it('U-65.6 (negative): a relationship this build cannot name reads the name alone; markup in a name stays text', () => {
		expect(
			buildAppointmentLine(
				{
					kind: 'request',
					startTime: '2026-11-15T15:30:00.000Z',
					forRelative: { firstName: '<b>Νίκος</b>', lastName: null, relation: 'NEPHEW' }
				},
				NOW,
				'el'
			)
		).toBe('Αίτημα για τον/την <b>Νίκος</b> · σήμερα, 17:30');
		expect(
			buildAppointmentLine(
				{
					kind: 'request',
					startTime: '2026-11-15T15:30:00.000Z',
					forRelative: { firstName: null, lastName: null, relation: 'CHILD' }
				},
				NOW,
				'el'
			)
		).toBe('Αίτημα: σήμερα, 17:30');
	});
});
