import { describe, expect, it } from 'vitest';
import type { SearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';
import {
	getFieldSummary,
	getFieldValueLabel,
	getWhatFallbackSuggestionOptions,
	nextCriteriaField,
	normalizeCriteria
} from './fields';
import { criteriaTranslator } from '$modules/search-doctors/lib/criteria-messages';

function criteria(overrides: Partial<SearchDoctorsCriteria>): SearchDoctorsCriteria {
	return {
		availability: '',
		what: '',
		where: '',
		whatSelection: null,
		whereSelection: null,
		...overrides
	};
}

// The application's `search-criteria-modal::criteria-modal` spec, title for title (S-01.6).
describe('search-criteria-modal::criteria-modal', () => {
	describe('normalizeCriteria', () => {
		it('preserves a committed structured selection', () => {
			const result = normalizeCriteria(
				criteria({
					what: 'Cardiology',
					whatSelection: { kind: 'professional', label: 'Cardiology', id: 'prof-1' }
				})
			);
			expect(result.whatSelection).toEqual({
				kind: 'professional',
				label: 'Cardiology',
				id: 'prof-1'
			});
		});

		it('derives a text selection from free-typed input with no committed selection', () => {
			const result = normalizeCriteria(criteria({ what: '  heart  ', whatSelection: null }));
			expect(result.what).toBe('heart');
			expect(result.whatSelection).toEqual({ kind: 'text', label: 'heart' });
		});

		it('carries no selection when the field is empty', () => {
			expect(
				normalizeCriteria(criteria({ what: '', whatSelection: null })).whatSelection
			).toBeNull();
		});

		it('preserves a committed structured where selection', () => {
			const result = normalizeCriteria(
				criteria({
					where: 'Municipality of Piraeus',
					whereSelection: {
						kind: 'location',
						label: 'Municipality of Piraeus',
						slug: 'dimos-peiraia',
						locationType: 'MUNICIPALITY'
					}
				})
			);
			expect(result.whereSelection).toEqual({
				kind: 'location',
				label: 'Municipality of Piraeus',
				slug: 'dimos-peiraia',
				locationType: 'MUNICIPALITY'
			});
		});

		it('derives a text where selection from free-typed input with no committed selection', () => {
			const result = normalizeCriteria(criteria({ where: '  athens  ', whereSelection: null }));
			expect(result.where).toBe('athens');
			expect(result.whereSelection).toEqual({ kind: 'text', label: 'athens' });
		});

		it('carries no where selection when the field is empty', () => {
			expect(
				normalizeCriteria(criteria({ where: '', whereSelection: null })).whereSelection
			).toBeNull();
		});
	});

	describe('getWhatFallbackSuggestionOptions', () => {
		it('shapes the static defaults as professional suggestion options', () => {
			const options = getWhatFallbackSuggestionOptions((key) => key);
			expect(options.length).toBeGreaterThan(0);
			expect(options.every((option) => option.kind === 'professional')).toBe(true);
			// No backend id, so a tap will commit as free text.
			expect(options.every((option) => option.id === undefined)).toBe(true);
		});
	});

	describe('web (U-21/U-23.2)', () => {
		const t = criteriaTranslator('el');

		it('U-23.2: a choice opens the next card — «Τι» ⇒ «Πού» ⇒ «Πότε», which stays open', () => {
			expect(nextCriteriaField).toEqual({
				what: 'where',
				where: 'availability',
				availability: 'availability'
			});
		});

		it('U-21: a closed card says «Προσθέστε …» while empty, else the choice — «Πότε» in its words', () => {
			const empty = criteria({});
			expect(getFieldSummary(empty, 'what', t)).toBe('Προσθέστε ειδικότητα, υπηρεσία ή γιατρό');
			expect(getFieldSummary(empty, 'where', t)).toBe('Προσθέστε περιοχή');
			expect(getFieldSummary(empty, 'availability', t)).toBe('Προσθέστε ημερομηνίες');
			const chosen = criteria({
				what: 'Καρδιολόγος',
				where: 'Πειραιάς',
				availability: 'next3Days'
			});
			expect(getFieldSummary(chosen, 'what', t)).toBe('Καρδιολόγος');
			expect(getFieldSummary(chosen, 'where', t)).toBe('Πειραιάς');
			expect(getFieldSummary(chosen, 'availability', t)).toBe('Επόμενες 3 ημέρες');
		});

		it('U-22 (negative): an empty field has no value to show — no default «Πότε»', () => {
			const empty = criteria({});
			expect(getFieldValueLabel(empty, 'availability', t)).toBeUndefined();
			expect(getFieldValueLabel(empty, 'what', t)).toBeUndefined();
			expect(getFieldValueLabel(criteria({ availability: 'all' }), 'availability', t)).toBe(
				'Οποτεδήποτε'
			);
		});
	});
});
