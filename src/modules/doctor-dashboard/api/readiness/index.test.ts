import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDoctorReadiness, mapDoctorReadiness } from '.';

afterEach(() => vi.unstubAllGlobals());

describe('D-W51-22 (4) · the doctor’s readiness, only what blocks', () => {
	it('the blockers’ codes, each once — nothing else of the answer is kept', async () => {
		const spy = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						status: 'success',
						message: '',
						data: {
							facts: { doctorId: 'd-1' },
							capabilities: { schedulingReady: false },
							blockers: [
								{ code: 'NO_ENABLED_AVAILABILITY', capability: 'SCHEDULING', severity: 'BLOCKING' },
								{ code: 'NO_ENABLED_AVAILABILITY', capability: 'PUBLIC', severity: 'BLOCKING' },
								{ code: 'DOCTOR_PHONE_UNVERIFIED', capability: 'SCHEDULING', severity: 'BLOCKING' }
							],
							suggestions: []
						}
					}),
					{ status: 200 }
				)
		);
		vi.stubGlobal('fetch', spy);
		expect(await getDoctorReadiness()).toEqual({
			blockers: ['NO_ENABLED_AVAILABILITY', 'DOCTOR_PHONE_UNVERIFIED']
		});
		expect(String((spy.mock.calls[0] as unknown as [string])[0])).toMatch(
			/\/doctor\/activation\/readiness$/u
		);
	});

	it('U-65.6 (negative): a broken answer blocks nothing it did not name', () => {
		expect(mapDoctorReadiness(null)).toEqual({ blockers: [] });
		expect(mapDoctorReadiness({ blockers: 'NO_ENABLED_AVAILABILITY' } as never)).toEqual({
			blockers: []
		});
		expect(
			mapDoctorReadiness({
				blockers: [null, { code: 7 }, { code: '<b>x</b>' }, { code: 'APPOINTMENTS_DISABLED' }]
			} as never)
		).toEqual({ blockers: ['APPOINTMENTS_DISABLED'] });
	});
});
