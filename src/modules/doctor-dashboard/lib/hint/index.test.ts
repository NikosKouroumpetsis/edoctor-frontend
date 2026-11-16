import { afterEach, describe, expect, it } from 'vitest';
import { doctorModeStorageKey } from '$shared/config/env';
import {
	forgetDoctorModeHint,
	readDoctorModeHint,
	sanitizeDoctorModeHint,
	writeDoctorModeHint
} from './index';

afterEach(() => window.localStorage.clear());

describe('the device’s memory of the doctor standing (D-W51-19)', () => {
	it('versioned, the kind and the mode only — what is written is what is read', () => {
		writeDoctorModeHint({ kind: 'doctor', lastMode: 'DOCTOR' });
		expect(JSON.parse(window.localStorage.getItem(doctorModeStorageKey) ?? '')).toEqual({
			v: 1,
			kind: 'doctor',
			lastMode: 'DOCTOR'
		});
		expect(readDoctorModeHint()).toEqual({ kind: 'doctor', lastMode: 'DOCTOR' });
		expect(doctorModeStorageKey).toMatch(/^edoctor\.[a-z]+\.doctor-mode\.v1$/u);
	});

	it('a sign-out forgets it', () => {
		writeDoctorModeHint({ kind: 'pending', lastMode: 'PATIENT' });
		forgetDoctorModeHint();
		expect(window.localStorage.getItem(doctorModeStorageKey)).toBeNull();
		expect(readDoctorModeHint()).toBeNull();
	});

	it('(negative) another version, an unknown kind or mode, broken JSON, a planted name — no memory', () => {
		expect(sanitizeDoctorModeHint({ v: 2, kind: 'doctor', lastMode: 'DOCTOR' })).toBeNull();
		expect(sanitizeDoctorModeHint({ v: 1, kind: 'admin', lastMode: 'DOCTOR' })).toBeNull();
		expect(sanitizeDoctorModeHint({ v: 1, kind: 'doctor', lastMode: 'TILL' })).toBeNull();
		expect(sanitizeDoctorModeHint('doctor')).toBeNull();
		window.localStorage.setItem(doctorModeStorageKey, '{broken');
		expect(readDoctorModeHint()).toBeNull();
		writeDoctorModeHint({ kind: 'doctor', lastMode: 'DOCTOR', name: 'Ελένη' } as never);
		expect(window.localStorage.getItem(doctorModeStorageKey)).not.toContain('Ελένη');
	});

	it('(negative) the doctor’s mode is never remembered without the doctor’s kind', () => {
		expect(sanitizeDoctorModeHint({ v: 1, kind: 'payments', lastMode: 'DOCTOR' })).toEqual({
			kind: 'payments',
			lastMode: 'PATIENT'
		});
	});
});
