import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { doctorOfficesQuery, listDoctorOffices, mapDoctorOffices } from '.';

afterEach(() => vi.unstubAllGlobals());

const A = '0193d000-0000-7000-8000-0000000000f1';
const B = '0193d000-0000-7000-8000-0000000000f2';

/** The doctor of the session, a made-up id. */
const DOCTOR = '0193d000-0000-7000-8000-0000000000d1';
/** One row of `GET /doctor/profile/offices` (the link and the office), a made-up street. */
const row = (id: string, translations: unknown[], doctorId: unknown = DOCTOR) => ({
	doctorOffice: { id: `link-${id}`, doctorId, officeId: id, createdAt: '', updatedAt: '' },
	office: {
		id,
		postalCode: '11526',
		phone: '2100000000',
		latitude: 37.98,
		longitude: 23.73,
		translations
	}
});

describe('D-W51-29 · the doctor’s offices, for screen 67’s filter', () => {
	it('each office by its id and its street and number in each language — nothing else of the answer', async () => {
		const spy = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						status: 'success',
						message: '',
						data: [
							row(A, [
								{ language: 'el', street: 'Κηφισίας', streetNumber: '120', city: 'Αθήνα' },
								{ language: 'en', street: 'Kifisias', streetNumber: '120', city: 'Athens' }
							]),
							row(B, [{ language: 'el', street: 'Πατησίων', streetNumber: '45' }])
						]
					}),
					{ status: 200 }
				)
		);
		vi.stubGlobal('fetch', spy);
		const offices = await listDoctorOffices();
		// Screen 72 (D-W51-70; shape, not decision): the doctor the office is of and its whole address in each language.
		expect(offices).toEqual([
			{
				id: A,
				doctorId: DOCTOR,
				lines: [
					{ language: 'el', line: 'Κηφισίας 120', address: 'Κηφισίας 120, Αθήνα 11526' },
					{ language: 'en', line: 'Kifisias 120', address: 'Kifisias 120, Athens 11526' }
				]
			},
			{
				id: B,
				doctorId: DOCTOR,
				lines: [{ language: 'el', line: 'Πατησίων 45', address: 'Πατησίων 45, 11526' }]
			}
		]);
		expect(JSON.stringify(offices)).not.toContain('2100000000');
		expect(String((spy.mock.calls[0] as unknown as [string])[0])).toMatch(
			/\/doctor\/profile\/offices$/u
		);
	});

	it('U-65.6 (negative): an id that is no server id, an office named twice, one with no street, a broken answer — no choice', () => {
		expect(
			mapDoctorOffices([
				row('1', [{ language: 'el', street: 'Χ', streetNumber: '1' }]),
				row('<script>', [{ language: 'el', street: 'Χ', streetNumber: '1' }]),
				row(A, [{ language: 'el', street: 'Κηφισίας', streetNumber: '120' }]),
				row(A, [{ language: 'el', street: 'Άλλη', streetNumber: '2' }]),
				row(B, [{ language: 'el', street: '', streetNumber: '' }, null, 7]),
				null,
				{ office: 'x' }
			] as never)
		).toEqual([
			{
				id: A,
				doctorId: DOCTOR,
				lines: [{ language: 'el', line: 'Κηφισίας 120', address: 'Κηφισίας 120, 11526' }]
			}
		]);
		// D-W51-70 (negative): a doctor that is no server id is none (the booking then sleeps).
		expect(
			mapDoctorOffices([
				row(A, [{ language: 'el', street: 'Κηφισίας', streetNumber: '120' }], '<b>x</b>')
			] as never)[0]?.doctorId
		).toBeNull();
		expect(mapDoctorOffices(null)).toEqual([]);
		expect(mapDoctorOffices({ offices: [] } as never)).toEqual([]);
		// An oversized street is none.
		expect(
			mapDoctorOffices([
				row(A, [{ language: 'el', street: 'Χ'.repeat(201), streetNumber: '' }])
			] as never)
		).toEqual([]);
	});

	it('read once a visit, personal; a refusal is an answer (no retry)', () => {
		const options = doctorOfficesQuery();
		expect(options.queryKey).toEqual(['doctor-dashboard', 'offices']);
		expect(options.meta).toBeDefined();
		const retry = options.retry as (failures: number, error: unknown) => boolean;
		expect(retry(0, new ApiError('licence', 403, '/doctor/profile/offices'))).toBe(false);
		expect(retry(0, new ApiError('down', 503, '/doctor/profile/offices'))).toBe(true);
		expect(retry(1, new ApiError('down', 503, '/doctor/profile/offices'))).toBe(false);
	});
});
