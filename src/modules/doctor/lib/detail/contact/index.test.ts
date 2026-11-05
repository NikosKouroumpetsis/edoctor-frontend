import { describe, expect, it } from 'vitest';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import { buildDoctorContactFacts } from '.';

const profile = (extra: Partial<DoctorProfile> = {}): DoctorProfile =>
	({
		doctorId: 'doc-1',
		doctorSlug: 'dr-athena',
		name: 'Dr. Athena Papadopoulou',
		professional: { name: 'Παθολόγος' },
		images: [],
		rating: 0,
		reviewCount: 0,
		pricingVisible: false,
		fee: null,
		...extra
	}) as DoctorProfile;

describe('what the #18 says of the doctor (U-84 Π3)', () => {
	it('name, specialty, initial past the title; no metric, no line', () => {
		const facts = buildDoctorContactFacts(profile(), 'el');
		expect(facts).toMatchObject({
			id: 'doc-1',
			name: 'Dr. Athena Papadopoulou',
			sentenceName: 'Dr. Athena Papadopoulou',
			specialty: 'Παθολόγος',
			initial: 'A',
			imageUrl: null
		});
		expect(facts).not.toHaveProperty('responseLabel');
	});

	it('🔴 U-99.1: «Dr.» only inside a sentence: the card’s own line keeps the bare name, and a doctor with no name gets no title', () => {
		const named = buildDoctorContactFacts({ ...profile(), name: 'Σοφία Ρηγοπούλου' }, 'el');
		expect(named).toMatchObject({
			name: 'Σοφία Ρηγοπούλου',
			sentenceName: 'Dr. Σοφία Ρηγοπούλου'
		});
		const nameless = buildDoctorContactFacts({ ...profile(), name: undefined }, 'el');
		expect(nameless?.sentenceName).toBe('Επαγγελματίας υγείας');
	});

	it('U-36.5: the response time, from the profile', () => {
		const facts = buildDoctorContactFacts(
			profile({ responseMetrics: { responseTimeId: 'within-hour' } }),
			'el'
		);
		expect(facts?.responseLabel).toBe('Χρόνος απόκρισης: Εντός μίας ώρας');
		expect(facts?.responseWhen).toBe('εντός μίας ώρας');
	});

	it('the office’s phone only as a dialler takes it', () => {
		const facts = buildDoctorContactFacts(
			profile({ office: { phone: '+30 210 412 8890' } as DoctorProfile['office'] }),
			'el'
		);
		expect(facts?.phone).toEqual({ label: '+30 210 412 8890', dialNumber: '+302104128890' });
	});

	it('a doctor with no id: nobody to write to', () => {
		expect(buildDoctorContactFacts(profile({ doctorId: undefined }), 'el')).toBeNull();
	});
});
