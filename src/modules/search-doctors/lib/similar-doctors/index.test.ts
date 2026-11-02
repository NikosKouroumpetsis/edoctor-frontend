import { describe, expect, it } from 'vitest';
import {
	buildSearchDoctorsQueryParams,
	readSearchDoctorsCriteria,
	resolveSearchDoctorsCriteria,
	searchResultsHref
} from '../search-criteria';
import { buildSearchDoctorsScope } from '../search-query';
import { buildSimilarDoctorsCriteria } from '.';

const professional = {
	professionalId: 'prof-internal-medicine',
	professionalName: 'Παθολόγος',
	professionalSlug: 'pathologos'
};

describe('search-doctors::lib::similar-doctors (app = web)', () => {
	it('U-37.2 — MAJOR-2 of r1: a doctor in Πειραιάς — the same specialty by its catalogue id, IN Πειραιάς as a location with its slug, never the default Αττική', () => {
		const criteria = buildSimilarDoctorsCriteria({
			...professional,
			area: { label: 'Πειραιάς', locationType: 'MUNICIPALITY', slug: 'dimos-peiraia' }
		});
		const scope = buildSearchDoctorsScope(
			resolveSearchDoctorsCriteria(buildSearchDoctorsQueryParams(criteria))
		);
		expect(criteria.where).toBe('Πειραιάς');
		expect(scope.what).toMatchObject({
			kind: 'professional',
			professionalId: 'prof-internal-medicine'
		});
		expect(scope.where).toEqual({ kind: 'location', locationSlug: 'dimos-peiraia' });
	});

	it('U-37.2 — MAJOR-2 of r1 (the web’s address): the results link carries the location by its slug and reads back to the same scope', () => {
		const href = searchResultsHref(
			'/doctors',
			buildSimilarDoctorsCriteria({
				...professional,
				area: { label: 'Πειραιάς', slug: 'dimos-peiraia' }
			})
		);
		const params = new URL(href, 'https://edoctor.test').searchParams;
		expect(params.get('whereKind')).toBe('location');
		expect(params.get('whereSlug')).toBe('dimos-peiraia');
		expect(params.get('whereLabel')).toBe('Πειραιάς');
		expect(buildSearchDoctorsScope(readSearchDoctorsCriteria(params)).where).toEqual({
			kind: 'location',
			locationSlug: 'dimos-peiraia'
		});
	});

	it('U-37.2 — MAJOR-2 of r1: with no area resolved writes no «Πού» at all — never words the search would not apply', () => {
		const criteria = buildSimilarDoctorsCriteria({ ...professional, area: null });
		expect(criteria.where).toBe('');
		expect(criteria.whereSelection).toBeNull();
		expect(buildSearchDoctorsQueryParams(criteria)).not.toHaveProperty('where');
		const params = new URL(searchResultsHref('/doctors', criteria), 'https://edoctor.test')
			.searchParams;
		expect(['where', 'whereKind', 'whereSlug', 'whereLabel'].some((key) => params.has(key))).toBe(
			false
		);
		expect(buildSearchDoctorsScope(readSearchDoctorsCriteria(params)).where).toEqual({
			kind: 'default'
		});
	});

	it('U-37.2: a specialty the catalogue does not know is searched by its words alone', () => {
		const criteria = buildSimilarDoctorsCriteria({ area: null, professionalName: 'Οδοντίατρος' });
		expect(criteria.what).toBe('Οδοντίατρος');
		expect(criteria.whatSelection).toBeNull();
	});
});
