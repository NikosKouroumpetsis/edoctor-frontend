import { describe, expect, it } from 'vitest';
import {
	DOCTOR_ONBOARDING_STEPS,
	doctorOnboardingPath,
	doctorOnboardingStepOf,
	isDoctorOnboardingBeyondProgress,
	nextDoctorOnboardingStep,
	previousDoctorOnboardingStep,
	readDoctorOnboardingFill,
	readDoctorOnboardingScreen,
	resumeDoctorOnboardingStep
} from '.';

describe('doctor-onboarding · lib/steps (D-W3-28, record §6.3–§6.4)', () => {
	it('D-W3-28: the closed list — the application’s addresses, the overview at the root', () => {
		expect(readDoctorOnboardingScreen('')).toBe('overview');
		expect(readDoctorOnboardingScreen(undefined)).toBe('overview');
		expect(readDoctorOnboardingScreen('stage/2')).toBe('stage-2');
		expect(readDoctorOnboardingScreen('email/code')).toBe('email-code');
		expect(readDoctorOnboardingScreen('specialty/list')).toBe('specialty-list');
		expect(readDoctorOnboardingScreen('location/search')).toBe('address-search');
		expect(readDoctorOnboardingScreen('location/confirm')).toBe('address-confirm');
		expect(readDoctorOnboardingScreen('location/pin')).toBe('pin');
		expect(readDoctorOnboardingScreen('done')).toBe('done');
		expect(doctorOnboardingPath('overview')).toBe('/doctor/onboarding');
		expect(doctorOnboardingPath('pin')).toBe('/doctor/onboarding/location/pin');
		expect(doctorOnboardingPath('stage-1')).toBe('/doctor/onboarding/stage/1');
	});

	it('D-W3-28 / U-65.6 (negative): anything else is no page — a guess, a path out, a stage that is not 1–3, one level too deep or too shallow', () => {
		for (const rest of [
			'stage',
			'stage/4',
			'stage/0',
			'../admin',
			'basic/',
			'BASIC',
			'location/pin/x',
			'specialty/list/',
			'email/code/../..',
			'<script>',
			'%2e%2e'
		]) {
			expect(readDoctorOnboardingScreen(rest), rest).toBeUndefined();
		}
	});

	it('record §6.3: the bar — the stage and how far into it (the two email screens only for an account asked them)', () => {
		expect(readDoctorOnboardingFill('stage-1', false)).toEqual({ stage: 0, fill: 1 / 3 });
		expect(readDoctorOnboardingFill('basic', true)).toEqual({ stage: 0, fill: 2 / 5 });
		expect(readDoctorOnboardingFill('specialty', false)).toEqual({ stage: 0, fill: 1 });
		expect(readDoctorOnboardingFill('location', false)).toEqual({ stage: 1, fill: 2 / 9 });
		expect(readDoctorOnboardingFill('pin', false)).toEqual({ stage: 1, fill: 4 / 9 });
		expect(readDoctorOnboardingFill('overview', false)).toBeNull();
		expect(readDoctorOnboardingFill('done', false)).toBeNull();
	});

	it('the order: the email screens come only when the contact email is missing; «Πίσω» from a page opened cold is the page before', () => {
		expect(nextDoctorOnboardingStep('basic', false)).toBe('specialty');
		expect(nextDoctorOnboardingStep('basic', true)).toBe('email');
		expect(nextDoctorOnboardingStep('email-code', false)).toBe('specialty');
		expect(nextDoctorOnboardingStep('specialty', false)).toBe('stage-2');
		expect(nextDoctorOnboardingStep('pin', false)).toBe('office');
		expect(nextDoctorOnboardingStep('access', false)).toBe('done');
		expect(previousDoctorOnboardingStep('specialty', true)).toBe('email-code');
		expect(previousDoctorOnboardingStep('specialty', false)).toBe('basic');
		expect(previousDoctorOnboardingStep('stage-1', false)).toBe('overview');
		expect(doctorOnboardingStepOf('address-search')).toBe('location');
		expect(doctorOnboardingStepOf('specialty-list')).toBe('specialty');
	});

	it('P-B3 Σ-24: «Συνέχεια» opens the first missing section’s screen; nothing missing is the last step', () => {
		expect(resumeDoctorOnboardingStep({ missing: ['CONTACT_EMAIL', 'PROFESSIONAL'] })).toBe(
			'email'
		);
		expect(resumeDoctorOnboardingStep({ missing: ['OFFICE_ADDRESS'] })).toBe('location');
		expect(resumeDoctorOnboardingStep({ missing: ['TERMS'] })).toBe('terms');
		expect(resumeDoctorOnboardingStep({ missing: [] })).toBe('access');
	});

	it('P-W3 §3.3.3: a page beyond what the server holds — past the last page of the first missing section — is not answered from a link', () => {
		const address = { missing: ['OFFICE_ADDRESS', 'OFFICE_PHONE'] as const };
		expect(isDoctorOnboardingBeyondProgress('location', { missing: [...address.missing] })).toBe(
			false
		);
		expect(
			isDoctorOnboardingBeyondProgress('address-confirm', { missing: [...address.missing] })
		).toBe(false);
		expect(isDoctorOnboardingBeyondProgress('pin', { missing: [...address.missing] })).toBe(false);
		expect(isDoctorOnboardingBeyondProgress('office', { missing: [...address.missing] })).toBe(
			true
		);
		expect(isDoctorOnboardingBeyondProgress('email-code', { missing: ['CONTACT_EMAIL'] })).toBe(
			false
		);
		expect(isDoctorOnboardingBeyondProgress('specialty', { missing: ['CONTACT_EMAIL'] })).toBe(
			true
		);
		expect(isDoctorOnboardingBeyondProgress('specialty-list', { missing: ['BASIC_INFO'] })).toBe(
			true
		);
		expect(isDoctorOnboardingBeyondProgress('basic', { missing: ['PROFESSIONAL'] })).toBe(false);
		expect(isDoctorOnboardingBeyondProgress('overview', { missing: ['BASIC_INFO'] })).toBe(false);
		expect(isDoctorOnboardingBeyondProgress('access', { missing: [] })).toBe(false);
	});
	it('🔴 Ε2 (U-108.5, D-W3-01): the terms come at the end — after the calendar, in the last stage, before «Πρόσβαση»; 42 is the last step before the end', () => {
		const order = DOCTOR_ONBOARDING_STEPS as readonly string[];
		expect(order.indexOf('terms')).toBeGreaterThan(order.indexOf('calendar'));
		expect(order.indexOf('terms')).toBeGreaterThan(order.indexOf('stage-3'));
		expect(order.slice(-3)).toEqual(['terms', 'access', 'done']);
		expect(readDoctorOnboardingFill('terms', false)?.stage).toBe(2);
		expect(nextDoctorOnboardingStep('calendar', false)).toBe('stage-3');
		expect(nextDoctorOnboardingStep('access', false)).toBe('done');
		expect(resumeDoctorOnboardingStep({ missing: ['LIABILITY', 'TERMS'] })).toBe('terms');
		expect(resumeDoctorOnboardingStep({ missing: ['TERMS', 'ACTIVATION_INTENT'] })).toBe('terms');
	});

	it('38–42: the office’s screens in the prototype’s order, each the step after the other; a missing phone keeps every page after «Πώς θα σας βρουν» shut', () => {
		expect(
			['pin', 'office', 'amenities', 'payments', 'price', 'calendar'].map((step) =>
				nextDoctorOnboardingStep(step as never, false)
			)
		).toEqual(['office', 'amenities', 'payments', 'price', 'calendar', 'stage-3']);
		const phoneMissing = { missing: ['OFFICE_PHONE', 'OFFICE_PAYMENTS'] } as const;
		expect(isDoctorOnboardingBeyondProgress('office', { missing: [...phoneMissing.missing] })).toBe(
			false
		);
		expect(
			isDoctorOnboardingBeyondProgress('amenities', { missing: [...phoneMissing.missing] })
		).toBe(true);
		expect(isDoctorOnboardingBeyondProgress('payments', { missing: ['OFFICE_PAYMENTS'] })).toBe(
			false
		);
		expect(isDoctorOnboardingBeyondProgress('price', { missing: ['OFFICE_PAYMENTS'] })).toBe(true);
		expect(isDoctorOnboardingBeyondProgress('access', { missing: ['ACTIVATION_INTENT'] })).toBe(
			false
		);
		expect(isDoctorOnboardingBeyondProgress('access', { missing: ['TERMS'] })).toBe(true);
		expect(isDoctorOnboardingBeyondProgress('done', { missing: ['TERMS'] })).toBe(false);
	});
});
