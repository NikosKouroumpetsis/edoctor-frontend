import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	doctorSmsBalanceQuery,
	doctorSmsSettingsQuery,
	getDoctorSmsBalance,
	getDoctorSmsSettings,
	mapDoctorSmsBalance,
	mapDoctorSmsSettings
} from '.';

/* Wave 5.1 · screen 72's «Ενημέρωση» (D-W51-70; card w51-w8). */

afterEach(() => vi.unstubAllGlobals());

describe('D-W51-70 · the doctor’s SMS switch and what is left of the packages', () => {
	it('«SMS επιβεβαίωσης» only when the answer says `true`; the units left as a whole number', () => {
		expect(mapDoctorSmsSettings({ smsPatientConfirmed: true } as never)).toEqual({
			confirmed: true
		});
		expect(mapDoctorSmsBalance({ remainingUnits: 118 } as never)).toEqual({ remaining: 118 });
	});

	it('U-65.6 (negative): anything else is «κλειστό», and a broken balance names no number', () => {
		for (const value of ['true', 1, null, undefined]) {
			expect(mapDoctorSmsSettings({ smsPatientConfirmed: value } as never).confirmed).toBe(false);
		}
		expect(mapDoctorSmsSettings(null).confirmed).toBe(false);
		for (const units of [-1, 1.5, '118', null, 10_000_001]) {
			expect(mapDoctorSmsBalance({ remainingUnits: units } as never), String(units)).toBeNull();
		}
	});

	it('the reads: the session’s own doctor, with the cookies; personal', async () => {
		const spy = vi.fn(
			async (input: string) =>
				new Response(
					JSON.stringify({
						status: 'success',
						message: '',
						data: String(input).includes('settings')
							? { smsPatientConfirmed: true }
							: { remainingUnits: 7 }
					}),
					{ status: 200 }
				)
		);
		vi.stubGlobal('fetch', spy);
		expect(await getDoctorSmsSettings()).toEqual({ confirmed: true });
		expect(await getDoctorSmsBalance()).toEqual({ remaining: 7 });
		const urls = spy.mock.calls.map((call) => String(call[0]));
		expect(urls[0]).toMatch(/\/notification\/settings\/me$/u);
		expect(urls[1]).toMatch(/\/notification\/sms-packages\/me$/u);
		const init = (spy.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(init.credentials).toBe('include');
		expect(doctorSmsSettingsQuery().meta).toBeDefined();
		expect(doctorSmsBalanceQuery().meta).toBeDefined();
	});
});
