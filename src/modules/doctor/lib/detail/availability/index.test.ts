import { describe, expect, it } from 'vitest';
import { DOCTOR_AVAILABILITY_WINDOW_DAYS } from '$modules/doctor/api/availability';
import { SAMPLE_NOW, sampleAvailability, sampleDoctorProfile } from '../detail.sample';
import {
	buildDoctorAvailabilityModalContent,
	buildDoctorAvailabilitySection,
	DOCTOR_AVAILABILITY_DATE_CARD_LIMIT,
	resolveDoctorAvailabilityServiceId
} from './index';

const offices = sampleDoctorProfile().offices;

describe('lib/detail availability', () => {
	it('U-37.1 (app = web): the window is 4 weeks — 28 days asked, six day cards at most', () => {
		expect(DOCTOR_AVAILABILITY_WINDOW_DAYS).toBe(28);
		expect(DOCTOR_AVAILABILITY_DATE_CARD_LIMIT).toBe(6);
	});

	it('U-37.1 (app = web, the application’s `resolveDoctorAvailabilityServiceId`): the slots are asked for the requested service only when the doctor has it, else the primary visit', () => {
		const services = sampleDoctorProfile().services;
		expect(resolveDoctorAvailabilityServiceId(services, 'svc-2')).toBe('svc-2');
		expect(resolveDoctorAvailabilityServiceId(services, 'not-hers')).toBe('svc-1');
		expect(resolveDoctorAvailabilityServiceId(services)).toBe('svc-1');
		expect(resolveDoctorAvailabilityServiceId([], 'svc-2')).toBeUndefined();
	});

	it('U-37 (app = web): the section of the active office — its first days with their first time; no time anywhere, no section', () => {
		const byOffice = {
			'off-1': sampleAvailability('off-1', { '2026-11-01': [600, 660], '2026-11-02': [540] }),
			'off-2': sampleAvailability('off-2')
		};
		const section = buildDoctorAvailabilitySection({
			offices,
			availabilityByOffice: byOffice,
			activeOfficeId: 'off-1',
			locale: 'el',
			now: SAMPLE_NOW
		});
		expect(section?.cards.map((card) => card.date)).toEqual(['2026-11-01', '2026-11-02']);
		expect(section?.elsewhere).toBeNull();
		expect(
			buildDoctorAvailabilitySection({
				offices,
				availabilityByOffice: {
					'off-1': sampleAvailability('off-1'),
					'off-2': sampleAvailability('off-2')
				},
				activeOfficeId: 'off-1',
				locale: 'el',
				now: SAMPLE_NOW
			})
		).toBeNull();
	});

	it('S-26.1 (app = web): the window shows every day of the 28, the empty ones dimmed, and the day’s times', () => {
		const modal = buildDoctorAvailabilityModalContent({
			offices,
			availabilityByOffice: { 'off-1': sampleAvailability('off-1', { '2026-11-01': [600] }) },
			activeOfficeId: 'off-1',
			locale: 'el',
			now: SAMPLE_NOW
		});
		expect(modal?.days).toHaveLength(28);
		expect(modal?.days.filter((day) => !day.isDisabled).map((day) => day.date)).toEqual([
			'2026-11-01'
		]);
		expect(modal?.days[1].slots.map((slot) => slot.label)).toEqual(['10:00']);
		expect(modal?.officeHeading).toBe('Επιλέξτε ιατρείο');
	});
});
