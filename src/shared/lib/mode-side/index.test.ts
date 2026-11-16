import { describe, expect, it } from 'vitest';
import { modeSideOfPath } from '.';

const ID = '018f3c1e-7a2b-7c3d-8e4f-0a1b2c3d4e5f';

describe('shared/lib/mode-side', () => {
	it('🔴 D-W51-77 · U-182.3: the badge’s side is the mode’s — the doctor’s dashboard reads the doctor’s, every other page (the sign-up too) the patient’s', () => {
		for (const path of [
			'/doctor',
			'/doctor/',
			'/doctor/menu',
			'/doctor/messages',
			`/doctor/messages/${ID}`
		]) {
			expect(modeSideOfPath(path), path).toBe('doctor');
		}
		for (const path of [
			'/',
			'/messages',
			`/messages/${ID}`,
			'/doctors',
			'/doctors/dr-athena',
			'/doctorx',
			'/doctor/onboarding',
			'/doctor/onboarding/office'
		]) {
			expect(modeSideOfPath(path), path).toBe('patient');
		}
	});

	it('D-W51-89: the doctor’s notifications are the doctor’s side, the patient’s list and the «Προφίλ» the patient’s; never a look-alike word', () => {
		expect(modeSideOfPath('/doctor/notifications')).toBe('doctor');
		expect(modeSideOfPath('/doctor/notifications/')).toBe('doctor');
		for (const path of ['/notifications', '/profile', '/doctornotifications', '']) {
			expect(modeSideOfPath(path), path).toBe('patient');
		}
	});
});
