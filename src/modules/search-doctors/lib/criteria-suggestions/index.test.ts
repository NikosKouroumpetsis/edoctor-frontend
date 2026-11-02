import { describe, expect, it } from 'vitest';
import type { SearchDoctorsSuggestionFact } from '$modules/search-doctors/api/marketplace/suggestions-adapter';
import {
	buildCriteriaSuggestionGroups,
	buildPopularSpecialtyOptions,
	toCriteriaSuggestionOption,
	toWhatSelection
} from '.';

// The application's cases (`lib/criteria-suggestions/index.unit.spec.ts`), the same inputs and results.
const professional: SearchDoctorsSuggestionFact = {
	kind: 'professional',
	id: 'prof-1',
	slug: 'cardiology',
	label: 'Cardiology'
};
const service: SearchDoctorsSuggestionFact = {
	kind: 'service',
	id: 'svc-1',
	slug: 'video-consultation',
	label: 'Video consultation'
};
const doctor: SearchDoctorsSuggestionFact = {
	kind: 'doctor',
	id: 'doc-1',
	slug: 'dr-x',
	label: 'Dr X',
	supportingLabel: 'Cardiology'
};

describe('search-doctors::criteria-suggestions', () => {
	it('groups facts in specialty -> service -> doctor order with their header keys', () => {
		const groups = buildCriteriaSuggestionGroups([doctor, service, professional]);
		expect(groups.map((group) => group.kind)).toEqual(['professional', 'service', 'doctor']);
		expect(groups[0].headerKey).toBe('criteria_group_specialties');
		expect(groups[1].headerKey).toBe('criteria_group_services');
		expect(groups[2].headerKey).toBe('criteria_group_doctors');
	});

	it('omits groups that have no rows', () => {
		const groups = buildCriteriaSuggestionGroups([professional]);
		expect(groups).toHaveLength(1);
		expect(groups[0].kind).toBe('professional');
	});

	it('carries the doctor supporting label onto the option', () => {
		expect(buildCriteriaSuggestionGroups([doctor])[0].options[0].supportingLabel).toBe(
			'Cardiology'
		);
	});

	it('caps each group at limitPerType', () => {
		const groups = buildCriteriaSuggestionGroups(
			[
				professional,
				{ ...professional, id: 'prof-2', slug: 'dermatology', label: 'Dermatology' },
				{ ...professional, id: 'prof-3', slug: 'pediatrics', label: 'Pediatrics' }
			],
			{ limitPerType: 2 }
		);
		expect(groups[0].options).toHaveLength(2);
	});

	it('returns an empty array when there are no facts', () => {
		expect(buildCriteriaSuggestionGroups([])).toEqual([]);
	});

	it('uses the professionalId as the stable value for a specialty, the slug for a service or doctor', () => {
		expect(toCriteriaSuggestionOption(professional).value).toBe('prof-1');
		expect(toCriteriaSuggestionOption(service).value).toBe('video-consultation');
		expect(toCriteriaSuggestionOption(doctor).value).toBe('dr-x');
	});

	it('maps popular specialty facts to options', () => {
		expect(
			buildPopularSpecialtyOptions([{ kind: 'professional', id: 'prof-1', label: 'Cardiology' }])
		).toEqual([{ kind: 'professional', value: 'prof-1', label: 'Cardiology', id: 'prof-1' }]);
	});

	it('commits a specialty with a real id as a professional selection carrying its slug', () => {
		expect(toWhatSelection(toCriteriaSuggestionOption(professional))).toEqual({
			kind: 'professional',
			label: 'Cardiology',
			id: 'prof-1',
			slug: 'cardiology'
		});
		expect(
			toWhatSelection({ kind: 'professional', value: 'prof-1', id: 'prof-1', label: 'Cardiology' })
		).toEqual({ kind: 'professional', label: 'Cardiology', id: 'prof-1' });
	});

	it('commits a service with a slug as a service selection', () => {
		expect(toWhatSelection(toCriteriaSuggestionOption(service))).toEqual({
			kind: 'service',
			label: 'Video consultation',
			slug: 'video-consultation'
		});
	});

	it('falls back to a text selection for a specialty without a backend id', () => {
		expect(
			toWhatSelection({
				kind: 'professional',
				value: 'internal-medicine',
				slug: 'internal-medicine',
				label: 'Internal medicine'
			})
		).toEqual({ kind: 'text', label: 'Internal medicine' });
	});
});
