import { describe, expect, it } from 'vitest';
import {
	doctorAppointmentFacts,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import {
	doctorHistoryRows,
	doctorOfficeLine,
	doctorWaitingRequests,
	groupDoctorAhead,
	groupDoctorHistory
} from '.';

/*
 * Wave 5.1 · screen 67 «Ραντεβού» (D-W51-29): the book's pure rules, on the prototype's «now» — Saturday 14 November
 * 2026, 12:40 in Athens. Made-up rows.
 */

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe('🔴 D-W51-29 · «Αιτήματα»', () => {
	it('every request still waiting, whatever its day — the one that expires first, first; one without a deadline last', () => {
		const late = doctorAppointmentFacts({
			id: 'late',
			status: 'pending',
			startTime: '2026-11-20T08:00:00.000Z',
			expiresAt: '2026-11-15T08:00:00.000Z'
		});
		const soon = doctorAppointmentFacts({
			id: 'soon',
			status: 'pending',
			startTime: '2026-11-14T15:30:00.000Z',
			expiresAt: '2026-11-14T14:30:00.000Z'
		});
		const open = doctorAppointmentFacts({ id: 'open', status: 'pending', expiresAt: null });
		expect(ids(doctorWaitingRequests([open, late, soon, soon], TODAY_NOW))).toEqual([
			'soon',
			'late',
			'open'
		]);
	});

	it('🔴 D-W51-23 (negative): a deadline reached leaves the list; a row that is no request is none', () => {
		const due = doctorAppointmentFacts({
			id: 'due',
			status: 'pending',
			expiresAt: new Date(TODAY_NOW).toISOString()
		});
		const booked = doctorAppointmentFacts({ id: 'booked' });
		expect(doctorWaitingRequests([due, booked], TODAY_NOW)).toEqual([]);
	});
});

describe('🔴 D-W51-29 · «Επερχόμενα»', () => {
	const today = [
		doctorAppointmentFacts({ id: 'begun', startTime: '2026-11-14T10:30:00.000Z' }),
		doctorAppointmentFacts({ id: 'n1', startTime: '2026-11-14T11:00:00.000Z' }),
		doctorAppointmentFacts({
			id: 'r1',
			status: 'pending',
			startTime: '2026-11-14T15:30:00.000Z',
			expiresAt: '2026-11-14T14:30:00.000Z'
		})
	];
	const upcoming = [
		doctorAppointmentFacts({ id: 'u4', startTime: '2026-11-17T07:30:00.000Z' }),
		doctorAppointmentFacts({
			id: 'r2',
			status: 'pending',
			startTime: '2026-11-16T08:00:00.000Z',
			expiresAt: '2026-11-14T19:15:00.000Z'
		}),
		doctorAppointmentFacts({ id: 'u2', startTime: '2026-11-16T09:00:00.000Z' })
	];

	it('today’s still ahead under «Σήμερα», then each day from tomorrow by its name — each day by the hour, the requests among them', () => {
		const days = groupDoctorAhead({ today, upcoming, now: TODAY_NOW, locale: 'el' });
		expect(days.map((day) => [day.label, day.today, ids(day.items)])).toEqual([
			['Σήμερα', true, ['n1', 'r1']],
			['Δευτέρα 16 Νοεμβρίου', false, ['r2', 'u2']],
			['Τρίτη 17 Νοεμβρίου', false, ['u4']]
		]);
		expect(groupDoctorAhead({ today, upcoming, now: TODAY_NOW, locale: 'en' })[0].label).toBe(
			'Today'
		);
	});

	it('(negative) begun at «now» or before is no longer ahead; a request past its deadline, a closed row, a row read twice — none or once', () => {
		const due = doctorAppointmentFacts({
			id: 'due',
			status: 'pending',
			startTime: '2026-11-16T10:00:00.000Z',
			expiresAt: '2026-11-14T10:00:00.000Z'
		});
		const closed = doctorAppointmentFacts({
			id: 'closed',
			status: 'canceled',
			startTime: '2026-11-16T10:00:00.000Z'
		});
		const atNow = doctorAppointmentFacts({
			id: 'now',
			startTime: new Date(TODAY_NOW).toISOString()
		});
		const days = groupDoctorAhead({
			today: [atNow, ...today],
			upcoming: [due, closed, ...upcoming, upcoming[0]],
			now: TODAY_NOW,
			locale: 'el'
		});
		const shown = days.flatMap((day) => ids(day.items));
		expect(shown).toEqual(['n1', 'r1', 'r2', 'u2', 'u4']);
		expect(groupDoctorAhead({ today: [], upcoming: [], now: TODAY_NOW, locale: 'el' })).toEqual([]);
	});
});

describe('🔴 D-W51-29 · «Ιστορικό»', () => {
	const rows = [
		doctorAppointmentFacts({
			id: 'h1',
			status: 'completed',
			startTime: '2026-11-14T07:00:00.000Z'
		}),
		doctorAppointmentFacts({ id: 'open', status: 'booked', startTime: '2026-11-13T16:00:00.000Z' }),
		doctorAppointmentFacts({
			id: 'h3',
			status: 'no_show',
			startTime: '2026-11-13T16:00:00.000Z'
		}),
		doctorAppointmentFacts({ id: 'h6', status: 'rejected', startTime: '2026-10-22T08:00:00.000Z' }),
		doctorAppointmentFacts({ id: 'h7', status: 'expired', startTime: '2026-10-05T14:30:00.000Z' })
	];

	it('only what is closed — the open visit of the day before is «Τι έγινε» of screen 66, never here; each once, in the order read', () => {
		expect(ids(doctorHistoryRows([...rows, rows[0]]))).toEqual(['h1', 'h3', 'h6', 'h7']);
		for (const status of ['pending', 'booked', 'checked_in'] as const) {
			expect(doctorHistoryRows([doctorAppointmentFacts({ status })]), status).toEqual([]);
		}
	});

	it('by the office’s month («Νοέμβριος 2026»), in the order read; a month split between two pages keeps one heading', () => {
		const months = groupDoctorHistory(doctorHistoryRows(rows), 'el');
		expect(months.map((month) => [month.label, ids(month.items)])).toEqual([
			['Νοέμβριος 2026', ['h1', 'h3']],
			['Οκτώβριος 2026', ['h6', 'h7']]
		]);
		// The last of October's page, then the next page begins in October again: still one «Οκτώβριος 2026».
		const next = doctorAppointmentFacts({
			id: 'h8',
			status: 'completed',
			startTime: '2026-10-01T08:00:00.000Z'
		});
		expect(
			groupDoctorHistory([...doctorHistoryRows(rows), next], 'el').map((month) => month.month)
		).toEqual(['2026-11', '2026-10']);
		expect(groupDoctorHistory(rows.slice(0, 1), 'en')[0].label).toBe('November 2026');
	});
});

describe('the office’s line', () => {
	it('in the page’s language, else its first; none at all an empty word', () => {
		const office = {
			lines: [
				{ language: 'el', line: 'Κηφισίας 120' },
				{ language: 'en', line: 'Kifisias 120' }
			]
		};
		expect(doctorOfficeLine(office, 'el')).toBe('Κηφισίας 120');
		expect(doctorOfficeLine(office, 'en')).toBe('Kifisias 120');
		expect(doctorOfficeLine({ lines: [office.lines[0]] }, 'en')).toBe('Κηφισίας 120');
		expect(doctorOfficeLine({ lines: [] }, 'el')).toBe('');
	});
});
