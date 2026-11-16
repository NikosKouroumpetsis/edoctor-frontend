import { describe, expect, it } from 'vitest';
import { mapAppointmentLine, mapPatientId } from '.';

describe('🔴 D-W51-79 · U-65.6: the line and the patient of a conversation of the doctor’s side, as read', () => {
	it('the contract’s three kinds, the relative as plain text', () => {
		expect(
			mapAppointmentLine({
				kind: 'request',
				startTime: '2026-11-15T15:30:00.000Z',
				forRelative: { firstName: ' Νίκος ', lastName: 'Μαυρίδης', relation: 'CHILD' }
			})
		).toEqual({
			kind: 'request',
			startTime: '2026-11-15T15:30:00.000Z',
			forRelative: { firstName: 'Νίκος', lastName: 'Μαυρίδης', relation: 'CHILD' }
		});
		for (const kind of ['upcoming', 'lastVisit']) {
			expect(
				mapAppointmentLine({ kind, startTime: '2026-11-15T15:30:00.000Z', forRelative: null })
			).toMatchObject({ kind, forRelative: null });
		}
	});

	it('(negative) an unknown kind, a time that is no instant, anything not an object ⇒ none; names cut at 80, a word at 32', () => {
		for (const view of [
			null,
			'upcoming',
			[],
			{ kind: 'admin', startTime: '2026-11-15T15:30:00.000Z' },
			{ kind: 'toString', startTime: '2026-11-15T15:30:00.000Z' },
			{ kind: 'upcoming', startTime: 'αύριο' },
			{ kind: 'upcoming', startTime: 42 }
		]) {
			expect(mapAppointmentLine(view), JSON.stringify(view)).toBeNull();
		}
		const long = mapAppointmentLine({
			kind: 'request',
			startTime: '2026-11-15T15:30:00.000Z',
			forRelative: { firstName: 'α'.repeat(200), lastName: 7, relation: 'R'.repeat(100) }
		});
		expect(long?.forRelative?.firstName).toHaveLength(80);
		expect(long?.forRelative?.lastName).toBeNull();
		expect(long?.forRelative?.relation).toHaveLength(32);
	});

	it('(negative) the patient goes into an address: a server id only', () => {
		expect(mapPatientId('0193d000-0000-7000-8000-0000000000e1')).toBe(
			'0193d000-0000-7000-8000-0000000000e1'
		);
		for (const value of ['../x', 'javascript:alert(1)', '1', 42, null, undefined]) {
			expect(mapPatientId(value), String(value)).toBeNull();
		}
	});
});
