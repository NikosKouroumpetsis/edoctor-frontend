import { describe, expect, it } from 'vitest';
import { SAMPLE_NOW, sampleAvailability, sampleDoctorProfile } from '../detail.sample';
import {
	buildDoctorAvailabilityElsewhere,
	buildDoctorOfficeView,
	buildOfficeTabs,
	findDoctorEarliestSlot,
	isDoctorProfileOffice,
	resolveDoctorActiveOfficeId,
	resolveDoctorNearestOfficeId
} from './index';

const doctor = sampleDoctorProfile();
const offices = doctor.offices;

describe('lib/detail office (the application’s names, MINOR-3 of r1)', () => {
	it('U-39.1 (app = web): ONE active office — the requested one when the doctor has it, else the nearest time, else the first', () => {
		const availabilityByOffice = {
			'off-1': sampleAvailability('off-1', { '2026-11-03': [600] }),
			'off-2': sampleAvailability('off-2', { '2026-11-01': [900] })
		};
		const active = (requestedOfficeId?: string) =>
			resolveDoctorActiveOfficeId({ availabilityByOffice, offices, requestedOfficeId });
		expect(active('off-1')).toBe('off-1');
		expect(active()).toBe('off-2');
		expect(active('not-hers')).toBe('off-2');
		expect(resolveDoctorActiveOfficeId({ availabilityByOffice: {}, offices })).toBe('off-1');
		expect(resolveDoctorActiveOfficeId({ availabilityByOffice: {}, offices: [] })).toBeUndefined();
		expect(resolveDoctorNearestOfficeId(offices, availabilityByOffice)).toBe('off-2');
		expect(findDoctorEarliestSlot(availabilityByOffice['off-1'])).toMatchObject({
			date: '2026-11-03',
			startMinute: 600
		});
		expect(findDoctorEarliestSlot(sampleAvailability('off-1'))).toBeUndefined();
	});

	it('U-39.2 (app = web): a pill per office, none for one office', () => {
		expect(buildOfficeTabs(offices, 'el')).toEqual([
			{ id: 'off-1', label: 'Νίκης 12' },
			{ id: 'off-2', label: 'Ερμού 81' }
		]);
		expect(buildOfficeTabs(offices?.slice(0, 1), 'el')).toEqual([]);
	});

	it('D-103 / U-39.1 (app = web): only ANOTHER office is read — the roster’s first is the profile’s own `office`', () => {
		expect(isDoctorProfileOffice(doctor, 'off-1')).toBe(true);
		expect(isDoctorProfileOffice(doctor, undefined)).toBe(true);
		expect(isDoctorProfileOffice(doctor, 'off-2')).toBe(false);
	});

	it('U-39.1 (app = web): the view of the active office — the profile’s own facts, another office’s read, and its roster address while the read comes', () => {
		const own = buildDoctorOfficeView({ activeOfficeId: 'off-1', doctor, locale: 'el' });
		expect(own.phone).toBe('2101234567');
		expect(own.location?.streetLine).toContain('Νίκης 12');
		expect(own.tabs.map((tab) => tab.id)).toEqual(['off-1', 'off-2']);
		const coming = buildDoctorOfficeView({ activeOfficeId: 'off-2', doctor, locale: 'el' });
		expect(coming.phone).toBeUndefined();
		expect(coming.location?.streetLine).toContain('Ερμού 81');
		const read = buildDoctorOfficeView({
			activeOfficeId: 'off-2',
			doctor,
			officeFacts: { officeId: 'off-2', phone: '2310123456' },
			locale: 'el'
		});
		expect(read.phone).toBe('2310123456');
		expect(read.location?.streetLine).toContain('Ερμού 81');
		const otherRead = buildDoctorOfficeView({
			activeOfficeId: 'off-2',
			doctor,
			officeFacts: { officeId: 'off-9', phone: '2310123456' },
			locale: 'el'
		});
		expect(otherRead.phone).toBeUndefined();
	});

	it('U-37.2 case 3 (app = web): the active office has no time while another has — «Διαθέσιμο στο ιατρείο Χ από …»; none while the active one has a time', () => {
		const availabilityByOffice = {
			'off-1': sampleAvailability('off-1', { '2026-11-01': [600] }),
			'off-2': sampleAvailability('off-2')
		};
		const elsewhere = buildDoctorAvailabilityElsewhere({
			activeOfficeId: 'off-2',
			availabilityByOffice,
			locale: 'el',
			now: SAMPLE_NOW,
			offices
		});
		expect(elsewhere?.officeId).toBe('off-1');
		expect(elsewhere?.label).toBe('Διαθέσιμο στο ιατρείο Νίκης 12 από Αύριο · 10:00');
		expect(
			buildDoctorAvailabilityElsewhere({
				activeOfficeId: 'off-1',
				availabilityByOffice,
				locale: 'el',
				now: SAMPLE_NOW,
				offices
			})
		).toBeNull();
	});
});
