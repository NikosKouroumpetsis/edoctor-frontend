import { describe, expect, it } from 'vitest';
import type { DoctorServiceFacts } from '$modules/doctor/api/profile';
import { SAMPLE_NOW, sampleDoctorProfile } from '../detail.sample';
import { buildDoctorServicesPage, buildDoctorSpecializationsPage } from './index';

const service = (id: string, extra: Partial<DoctorServiceFacts> = {}): DoctorServiceFacts => ({
	id,
	title: id,
	priceRange: null,
	kind: 'other',
	...extra
});

/** Three lines of a closed list, as the server names them (the catalogue's own). */
const FIELDS = [
	{ code: 'PR021-01', name: 'Επείγουσα ιατρική' },
	{ code: 'PR021-03', name: 'Εντατική θεραπεία' },
	{ code: 'PR021-04', name: 'Σακχαρώδης διαβήτης' }
];

describe('buildDoctorServicesPage (U-70, screen 14)', () => {
	// Rewrites «Π4: the fields of expertise first under their name, then «Άλλες υπηρεσίες»…» and «Π4: no field of
	// expertise, no titles; only fields, no «Άλλες»» by U-209.3 (D-W52-56 / 60): no service is a field of expertise.
	it('🔴 D-W52-60 (U-209.3): ONE list of every service in the backend’s order — no group, no title, nothing of «Τομείς εξειδίκευσης» — whatever the doctor’s specializations', () => {
		const page = buildDoctorServicesPage(sampleDoctorProfile(), 'el');
		expect(page?.title).toBe('Υπηρεσίες');
		expect(page?.services.map((row) => row.id)).toEqual(['svc-1', 'svc-2', 'svc-3']);
		expect(page).not.toHaveProperty('groups');
		expect(JSON.stringify(page)).not.toMatch(/Τομείς εξειδίκευσης|Άλλες υπηρεσίες/u);
		const without = buildDoctorServicesPage(
			sampleDoctorProfile({ specializations: undefined }),
			'el'
		);
		expect(without).toEqual(page);
	});

	// Rewrites «only the fields of expertise, each with its years and its visits, and the words in the singular» (it
	// stood on screen 15) by U-209.3: «τα χρόνια και οι επισκέψεις μένουν στις υπηρεσίες».
	it('🔴 D-W52-60 (U-209.3): each service keeps its OWN years and visits, the words in the singular', () => {
		const page = buildDoctorServicesPage(
			sampleDoctorProfile({
				services: [
					service('a', { yearsOfExperience: 13, completedVisits: 21 }),
					service('b', { yearsOfExperience: 1, completedVisits: 1 }),
					service('c')
				]
			}),
			'el'
		);
		const [many, one] = page?.services ?? [];
		expect(many?.years).toEqual({ value: '13', label: 'χρόνια εμπειρίας' });
		expect(many?.visits).toEqual({ value: '21', label: 'επισκέψεις' });
		expect(one?.years).toEqual({ value: '1', label: 'χρόνος εμπειρίας' });
		expect(one?.visits).toEqual({ value: '1', label: 'επίσκεψη' });
	});

	it('U-72.3: a service without visits or years says nothing, never «0»', () => {
		const page = buildDoctorServicesPage(
			sampleDoctorProfile({ services: [service('a', { yearsOfExperience: 2 }), service('c')] }),
			'el'
		);
		const [, plain] = page?.services ?? [];
		expect(plain).not.toHaveProperty('years');
		expect(plain).not.toHaveProperty('visits');
		expect(JSON.stringify(plain)).not.toMatch(/"0"/u);
	});

	it('Π4: the note says what the visits count only when a service shows its own; U-72.4: κανένα «(6 μήνες)»', () => {
		const withVisits = (locale: 'el' | 'en') =>
			buildDoctorServicesPage(
				sampleDoctorProfile({ services: [service('a', { completedVisits: 4 }), service('b')] }),
				locale
			);
		expect(withVisits('el')?.footnote).toMatch(/^Οι επισκέψεις μετρούν/u);
		expect(withVisits('el')?.footnote).not.toMatch(/Τα χρόνια εμπειρίας/u);
		expect(JSON.stringify(withVisits('el'))).not.toMatch(/6 μήν|\(6|μηνών/u);
		expect(JSON.stringify(withVisits('en'))).not.toMatch(/6 month|\(6/u);
		expect(
			buildDoctorServicesPage(
				sampleDoctorProfile({ services: [service('a', { yearsOfExperience: 4 })] }),
				'el'
			)
		).not.toHaveProperty('footnote');
		expect(buildDoctorServicesPage(sampleDoctorProfile(), 'el')).not.toHaveProperty('footnote');
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
			specializations: FIELDS,
			services: [
				service('a', { yearsOfExperience: 13, completedVisits: 21 }),
				service('b', { yearsOfExperience: 1, completedVisits: 1 }),
				service('c'),
				service('d')
			],
			...extra
		});
	const build = (extra = {}) =>
		buildDoctorSpecializationsPage({ doctor: doctor(extra), locale: 'el', now: SAMPLE_NOW });

	// Rewrites «only the fields of expertise, each with its years and its visits…» by U-209.3 (D-W52-60): the fields
	// are the doctor's specializations of the closed list, never services.
	it('🔴 D-W52-60 (U-209.3, U-225): the fields of expertise are the doctor’s specializations as the server names them, in its order — never a service, and nothing of a service on them (no fee, no years, no visits, no «Κλείστε…»)', () => {
		const page = build();
		expect(page?.domains).toEqual([
			{ id: 'PR021-01', title: 'Επείγουσα ιατρική' },
			{ id: 'PR021-03', title: 'Εντατική θεραπεία' },
			{ id: 'PR021-04', title: 'Σακχαρώδης διαβήτης' }
		]);
		expect(page).not.toHaveProperty('bookLabel');
		expect(page).not.toHaveProperty('readMoreLabel');
		expect(page).not.toHaveProperty('backLabel');
	});

	it('Π3: the card’s figures: how many fields, the doctor’s visits, the years from the licence', () => {
		expect(build()?.stats.map(({ id, value, label }) => [id, value, label])).toEqual([
			['domains', '3', 'Τομείς εξειδίκευσης'],
			['visits', '37', 'Επισκέψεις'],
			['years', '13', 'Χρόνια εμπειρίας']
		]);
		expect(build()?.stats[1]?.accessibleLabel).toBe('37 ολοκληρωμένες επισκέψεις');
		expect(
			build({ specializations: FIELDS.slice(0, 1) })?.stats.map(({ id, value, label }) => [
				id,
				value,
				label
			])[0]
		).toEqual(['domains', '1', 'Τομέας εξειδίκευσης']);
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
		// A service's own visits are the services' page's to explain (D-W52-60), never this page's.
		expect(
			build({ responseMetrics: undefined, licenseObtainedDate: undefined })?.footnote
		).toBeUndefined();
	});

	it('U-72.4: κανένα «(6 μήνες)», in either language', () => {
		const words = (locale: 'el' | 'en') =>
			JSON.stringify(buildDoctorSpecializationsPage({ doctor: doctor(), locale, now: SAMPLE_NOW }));
		expect(words('el')).not.toMatch(/6 μήν|\(6|μηνών/u);
		expect(words('en')).not.toMatch(/6 month|\(6/u);
	});

	// Rewrites «U-38: no field of expertise, no page» by U-209.3: marked services no longer make a field.
	it('U-38 · 🔴 D-W52-60: no specialization, no page — whatever the services', () => {
		expect(build({ specializations: undefined })).toBeNull();
		expect(build({ specializations: [] })).toBeNull();
	});
});
