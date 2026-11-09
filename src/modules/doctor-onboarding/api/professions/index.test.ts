import { describe, expect, it } from 'vitest';
import type { ProfessionalListResponseView } from '$shared/lib/api-client';
import { mapDoctorOnboardingProfessions } from '.';

// What a broken answer may hold, typed as the contract's list it is not (W-4: the adapter's negatives).
const wire = (value: unknown) => value as ProfessionalListResponseView;

describe('doctor-onboarding · api/professions (contract §5 B-6)', () => {
	it('each specialty with its Greek and English names; another language, a row without an id or a name — left out', () => {
		expect(
			mapDoctorOnboardingProfessions(
				wire([
					{
						id: 'p-1',
						key: 'cardiology',
						translations: [
							{ language: 'el', name: ' Καρδιολόγος ' },
							{ language: 'en', name: 'Cardiologist' },
							{ language: 'de', name: 'Kardiologe' }
						]
					},
					{ id: 'p-2', translations: [{ language: 'el', name: '<b>Παθολόγος</b>' }] },
					{ id: '', translations: [{ language: 'el', name: 'Χωρίς id' }] },
					{ id: 'p-3', translations: [{ language: 'el', name: '  ' }] },
					null
				])
			)
		).toEqual([
			{ professionalId: 'p-1', names: { el: 'Καρδιολόγος', en: 'Cardiologist' } },
			{ professionalId: 'p-2', names: { el: '<b>Παθολόγος</b>', en: null } }
		]);
		expect(mapDoctorOnboardingProfessions(wire({ items: [] }))).toEqual([]);
		expect(mapDoctorOnboardingProfessions(null)).toEqual([]);
		expect(
			mapDoctorOnboardingProfessions(
				wire([
					{ id: 7, translations: [{ language: 'el', name: 'Χ' }] },
					{ id: 'p-9', translations: 'el' }
				])
			)
		).toEqual([]);
	});
});
