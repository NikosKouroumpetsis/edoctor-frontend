import { describe, expect, it } from 'vitest';
import type { DoctorServiceFacts } from '$modules/doctor/api/profile';
import { SAMPLE_NOW, sampleDoctorProfile } from '../detail.sample';
import { buildDoctorServicesPage, buildDoctorSpecializationsPage } from './index';

const service = (id: string, extra: Partial<DoctorServiceFacts> = {}): DoctorServiceFacts => ({
	id,
	title: id,
	priceRange: null,
	kind: 'other',
	isSpecialized: false,
	...extra
});

describe('buildDoctorServicesPage (U-70, screen 14)', () => {
	it('Π4: the fields of expertise first under their name, then «Άλλες υπηρεσίες», each in the backend’s order', () => {
		const page = buildDoctorServicesPage(sampleDoctorProfile(), 'el');
		expect(page?.title).toBe('Υπηρεσίες');
		expect(page?.groups.map((group) => [group.id, group.title])).toEqual([
			['specializations', 'Τομείς εξειδίκευσης'],
			['other', 'Άλλες υπηρεσίες']
		]);
		expect(page?.groups[0]?.services.map((row) => row.id)).toEqual(['svc-1', 'svc-2']);
	});

	it('Π4: no field of expertise, no titles; only fields, no «Άλλες»', () => {
		const none = buildDoctorServicesPage(
			sampleDoctorProfile({ services: [service('a'), service('b')] }),
			'el'
		);
		expect(none?.groups).toHaveLength(1);
		expect(none?.groups[0]?.title).toBeUndefined();
		const only = buildDoctorServicesPage(
			sampleDoctorProfile({
				services: [service('a', { isSpecialized: true }), service('b', { isSpecialized: true })]
			}),
			'el'
		);
		expect(only?.groups.map((group) => group.id)).toEqual(['specializations']);
	});

	it('Π8: a single service is already open; none has no page (U-38)', () => {
		expect(
			buildDoctorServicesPage(sampleDoctorProfile({ services: [service('a')] }), 'el')?.soloId
		).toBe('a');
		expect(buildDoctorServicesPage(sampleDoctorProfile(), 'el')?.soloId).toBeUndefined();
		expect(buildDoctorServicesPage(sampleDoctorProfile({ services: [] }), 'el')).toBeNull();
	});
});

describe('buildDoctorSpecializationsPage (U-72, screen 15)', () => {
	const doctor = (extra = {}) =>
		sampleDoctorProfile({
			licenseObtainedDate: '2013-06-15',
			responseMetrics: { completedVisits: 37, windowMonths: 6 },
			services: [
				service('a', { isSpecialized: true, yearsOfExperience: 13, completedVisits: 21 }),
				service('b', { isSpecialized: true, yearsOfExperience: 1, completedVisits: 1 }),
				service('c', { isSpecialized: true }),
				service('d')
			],
			...extra
		});
	const build = (extra = {}) =>
		buildDoctorSpecializationsPage({ doctor: doctor(extra), locale: 'el', now: SAMPLE_NOW });

	it('only the fields of expertise, each with its years and its visits, and the words in the singular', () => {
		const page = build();
		expect(page?.domains.map((domain) => domain.id)).toEqual(['a', 'b', 'c']);
		expect(page?.domains[0]?.years).toEqual({ value: '13', label: 'χρόνια εμπειρίας' });
		expect(page?.domains[0]?.visits).toEqual({ value: '21', label: 'επισκέψεις' });
		expect(page?.domains[1]?.years).toEqual({ value: '1', label: 'χρόνος εμπειρίας' });
		expect(page?.domains[1]?.visits).toEqual({ value: '1', label: 'επίσκεψη' });
	});

	it('U-72.3: a service without visits or years says nothing, never «0»', () => {
		const [, , plain] = build()?.domains ?? [];
		expect(plain).not.toHaveProperty('years');
		expect(plain).not.toHaveProperty('visits');
		expect(JSON.stringify(plain)).not.toMatch(/"0"/u);
	});

	it('Π3: the card’s figures: how many fields, the doctor’s visits, the years from the licence', () => {
		expect(build()?.stats.map(({ id, value, label }) => [id, value, label])).toEqual([
			['domains', '3', 'Τομείς εξειδίκευσης'],
			['visits', '37', 'Επισκέψεις'],
			['years', '13', 'Χρόνια εμπειρίας']
		]);
		expect(build()?.stats[1]?.accessibleLabel).toBe('37 ολοκληρωμένες επισκέψεις');
	});

	it('Π3 / Π6: a figure the server does not have is no cell, and never one cell alone', () => {
		expect(build({ responseMetrics: undefined })?.stats.map((cell) => cell.id)).toEqual([
			'domains',
			'years'
		]);
		expect(build({ responseMetrics: undefined, licenseObtainedDate: undefined })?.stats).toEqual(
			[]
		);
	});

	it('Π4: each sentence of the note only with its number', () => {
		expect(build()?.footnote).toMatch(/Οι επισκέψεις μετρούν.*Τα χρόνια εμπειρίας/u);
		const noYears = build({ licenseObtainedDate: undefined })?.footnote;
		expect(noYears).toMatch(/Οι επισκέψεις μετρούν/u);
		expect(noYears).not.toMatch(/Τα χρόνια εμπειρίας/u);
		expect(
			build({
				responseMetrics: undefined,
				licenseObtainedDate: undefined,
				services: [service('a', { isSpecialized: true })]
			})?.footnote
		).toBeUndefined();
	});

	it('U-72.4: κανένα «(6 μήνες)», in either language', () => {
		const words = (locale: 'el' | 'en') =>
			JSON.stringify(buildDoctorSpecializationsPage({ doctor: doctor(), locale, now: SAMPLE_NOW }));
		expect(words('el')).not.toMatch(/6 μήν|\(6|μηνών/u);
		expect(words('en')).not.toMatch(/6 month|\(6/u);
	});

	it('U-38: no field of expertise, no page', () => {
		expect(build({ services: [service('d')] })).toBeNull();
	});
});
