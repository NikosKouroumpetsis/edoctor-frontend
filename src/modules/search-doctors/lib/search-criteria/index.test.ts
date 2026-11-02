import { describe, expect, it } from 'vitest';
import {
	buildSearchDoctorsQueryParams,
	defaultSearchDoctorsCriteria,
	getSearchCriteriaOptionLabel,
	getSearchCriteriaOptions,
	readSearchDoctorsCriteria,
	resolveSearchDoctorsCriteria,
	searchDoctorsCriteriaParamKeys,
	searchResultsHref,
	searchResultsParamKeys,
	textSelection,
	type SearchDoctorsCriteria
} from '.';

// The application's twelve names (`application/src/modules/search-doctors/lib/search-criteria`), and only these.
const APP_PARAM_NAMES = [
	'availability',
	'what',
	'where',
	'whatKind',
	'whatId',
	'whatSlug',
	'whatLabel',
	'whereKind',
	'whereSlug',
	'whereLabel',
	'whereLat',
	'whereLng'
];

describe('search-doctors::lib::search-criteria', () => {
	it('U-20: a structured «Τι» and «Πού» speak the application’s parameter names, key for key', () => {
		const params = buildSearchDoctorsQueryParams({
			availability: 'next7Days',
			what: 'Καρδιολόγος',
			where: 'Αθήνα',
			whatSelection: {
				kind: 'professional',
				label: 'Καρδιολόγος',
				id: 'prof-7',
				slug: 'kardiologos'
			},
			whereSelection: {
				kind: 'location',
				label: 'Αθήνα',
				slug: 'athina',
				latitude: 37.98,
				longitude: 23.72
			}
		});
		expect(params).toEqual({
			availability: 'next7Days',
			what: 'Καρδιολόγος',
			where: 'Αθήνα',
			whatKind: 'professional',
			whatLabel: 'Καρδιολόγος',
			whatId: 'prof-7',
			whatSlug: 'kardiologos',
			whereKind: 'location',
			whereLabel: 'Αθήνα',
			whereSlug: 'athina',
			whereLat: '37.98',
			whereLng: '23.72'
		});
		for (const name of Object.keys(params)) expect(APP_PARAM_NAMES).toContain(name);
		expect([...searchDoctorsCriteriaParamKeys]).toEqual(APP_PARAM_NAMES);
	});

	it('U-20 (negative): empty words and missing ids are omitted, never sent as empty keys', () => {
		expect(buildSearchDoctorsQueryParams(defaultSearchDoctorsCriteria)).toEqual({});
		expect(
			buildSearchDoctorsQueryParams({
				...defaultSearchDoctorsCriteria,
				what: '  Δερματολόγος ',
				whatSelection: textSelection('Δερματολόγος')
			})
		).toEqual({ what: 'Δερματολόγος', whatKind: 'text', whatLabel: 'Δερματολόγος' });
	});

	it('U-20: the results address — the localized `/doctors` with the query, or alone for empty criteria', () => {
		expect(searchResultsHref('/doctors', defaultSearchDoctorsCriteria)).toBe('/doctors');
		const href = searchResultsHref('/en/doctors', {
			...defaultSearchDoctorsCriteria,
			where: 'Αθήνα',
			whereSelection: { kind: 'location', label: 'Αθήνα', slug: 'athina' }
		});
		const url = new URL(href, 'http://localhost');
		expect(url.pathname).toBe('/en/doctors');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			where: 'Αθήνα',
			whereKind: 'location',
			whereLabel: 'Αθήνα',
			whereSlug: 'athina'
		});
	});

	it('U-21 (app = web): building the address and reading it back is the identity, for every selection kind', () => {
		const cases: SearchDoctorsCriteria[] = [
			defaultSearchDoctorsCriteria,
			{
				availability: 'next3Days',
				what: 'Καρδιολόγος',
				where: 'Πειραιάς',
				whatSelection: {
					kind: 'professional',
					label: 'Καρδιολόγος',
					id: 'prof-11',
					slug: 'kardiologos'
				},
				whereSelection: { kind: 'location', label: 'Πειραιάς', slug: 'peiraias-dimos-peiraia' }
			},
			{
				availability: 'all',
				what: 'Βιντεοκλήση',
				where: 'Κοντά μου',
				whatSelection: { kind: 'service', label: 'Βιντεοκλήση', slug: 'video-consultation' },
				whereSelection: {
					kind: 'current-location',
					label: 'Κοντά μου',
					latitude: 37.943,
					longitude: 23.647
				}
			},
			{
				availability: 'today',
				what: 'πόνος στο γόνατο',
				where: 'Αθήνα',
				whatSelection: { kind: 'text', label: 'πόνος στο γόνατο' },
				whereSelection: { kind: 'text', label: 'Αθήνα' }
			}
		];
		// S-07.3 rule 11 (web): the one thing the address does not carry is the device's position; the rest is identity.
		const withoutPosition = (criteria: SearchDoctorsCriteria): SearchDoctorsCriteria =>
			criteria.whereSelection?.kind === 'current-location'
				? {
						...criteria,
						whereSelection: { kind: 'current-location', label: criteria.whereSelection.label }
					}
				: criteria;
		for (const criteria of cases) {
			const url = new URL(searchResultsHref('/doctors', criteria), 'http://localhost');
			expect(readSearchDoctorsCriteria(url.searchParams)).toEqual(withoutPosition(criteria));
		}
	});

	it('S-07.3 (κανόνας 11, web): the results URL never carries coordinates', () => {
		const nearMe: SearchDoctorsCriteria = {
			availability: 'next3Days',
			what: 'Καρδιολόγος',
			where: 'current-location',
			whatSelection: { kind: 'text', label: 'Καρδιολόγος' },
			whereSelection: {
				kind: 'current-location',
				label: 'Κοντά μου',
				latitude: 37.943,
				longitude: 23.647
			}
		};
		const href = searchResultsHref('/doctors', nearMe);
		const params = new URL(href, 'http://localhost').searchParams;
		expect(params.has('whereLat')).toBe(false);
		expect(params.has('whereLng')).toBe(false);
		expect(href).not.toMatch(/37\.943|23\.647/u);
		expect(params.get('whereKind')).toBe('current-location');
		expect(params.get('whereLabel')).toBe('Κοντά μου');
		expect(searchResultsParamKeys).toEqual(
			APP_PARAM_NAMES.filter((name) => name !== 'whereLat' && name !== 'whereLng')
		);
		// The application's projection stays the application's (its route params are not a link).
		expect(buildSearchDoctorsQueryParams(nearMe)).toMatchObject({
			whereLat: '37.943',
			whereLng: '23.647'
		});
	});

	it('S-07.3 (κανόνας 11, web): a link with whereLat/whereLng is read without them', () => {
		const url = new URL(
			'/doctors?where=current-location&whereKind=current-location&whereLabel=Κοντά μου&whereLat=37.943&whereLng=23.647',
			'http://localhost'
		);
		expect(readSearchDoctorsCriteria(url.searchParams)).toEqual({
			availability: '',
			what: '',
			where: 'current-location',
			whatSelection: null,
			// «Κοντά μου» without a position: the results page takes this visit's or asks the device (the receiver's).
			whereSelection: { kind: 'current-location', label: 'Κοντά μου' }
		});
	});

	it('U-21 (negative): reading an address takes only the application’s names, never another parameter', () => {
		const url = new URL(
			'/doctors?what=Καρδιολόγος&utm_source=x&whatKind=professional&whatId=prof-1&whereKind=current-location&whereLat=abc&whereLng=23&where=Κοντά μου',
			'http://localhost'
		);
		expect(readSearchDoctorsCriteria(url.searchParams)).toEqual({
			availability: '',
			what: 'Καρδιολόγος',
			where: 'Κοντά μου',
			whatSelection: { kind: 'professional', label: 'Καρδιολόγος', id: 'prof-1' },
			// Rewritten for S-07.3 rule 11 (web, 29/10): the address's coordinates are never read, so «Κοντά μου» stays a
			// device search without a position (it was a search by name while the address could carry one).
			whereSelection: { kind: 'current-location', label: 'Κοντά μου' }
		});
	});

	// The application's own cases (`lib/search-criteria/index.unit.spec.ts`), the same inputs and results.
	it('keeps optional criteria empty by default', () => {
		expect(defaultSearchDoctorsCriteria).toEqual({
			availability: '',
			what: '',
			where: '',
			whatSelection: null,
			whereSelection: null
		});
	});

	it('resolves missing route params with empty optional defaults', () => {
		expect(resolveSearchDoctorsCriteria({})).toEqual(defaultSearchDoctorsCriteria);
	});

	it('derives text-kind what/where selections from the display-string route params', () => {
		expect(resolveSearchDoctorsCriteria({ what: ' cardio ', where: ' athens ' })).toEqual({
			availability: '',
			what: 'cardio',
			where: 'athens',
			whatSelection: { kind: 'text', label: 'cardio' },
			whereSelection: { kind: 'text', label: 'athens' }
		});
	});

	it('keeps selected values when building route params', () => {
		expect(
			buildSearchDoctorsQueryParams({
				availability: 'next3Days',
				what: '',
				where: 'piraeus',
				whatSelection: null,
				whereSelection: null
			})
		).toEqual({ availability: 'next3Days', where: 'piraeus' });
	});

	it('serializes a location where-selection and a current-location fix into route params', () => {
		expect(
			buildSearchDoctorsQueryParams({
				availability: '',
				what: '',
				where: 'Municipality of Piraeus',
				whatSelection: null,
				whereSelection: {
					kind: 'location',
					label: 'Municipality of Piraeus',
					slug: 'dimos-peiraia',
					locationType: 'MUNICIPALITY'
				}
			})
		).toEqual({
			where: 'Municipality of Piraeus',
			whereKind: 'location',
			whereSlug: 'dimos-peiraia',
			whereLabel: 'Municipality of Piraeus'
		});
		expect(
			buildSearchDoctorsQueryParams({
				availability: '',
				what: '',
				where: 'Current location',
				whatSelection: null,
				whereSelection: {
					kind: 'current-location',
					label: 'Current location',
					latitude: 37.98,
					longitude: 23.72
				}
			})
		).toEqual({
			where: 'Current location',
			whereKind: 'current-location',
			whereLabel: 'Current location',
			whereLat: '37.98',
			whereLng: '23.72'
		});
	});

	it('reconstructs structured what/where selections from route params', () => {
		expect(
			resolveSearchDoctorsCriteria({
				what: 'Cardiology',
				whatKind: 'professional',
				whatId: 'prof-cardiology',
				whatLabel: 'Cardiology',
				where: 'Municipality of Piraeus',
				whereKind: 'location',
				whereSlug: 'dimos-peiraia',
				whereLabel: 'Municipality of Piraeus'
			})
		).toEqual({
			availability: '',
			what: 'Cardiology',
			where: 'Municipality of Piraeus',
			whatSelection: { kind: 'professional', label: 'Cardiology', id: 'prof-cardiology' },
			whereSelection: { kind: 'location', label: 'Municipality of Piraeus', slug: 'dimos-peiraia' }
		});
	});

	it('round-trips a professional selection carrying both id and slug', () => {
		const params = buildSearchDoctorsQueryParams({
			availability: 'next3Days',
			what: 'Cardiology',
			where: '',
			whatSelection: {
				kind: 'professional',
				label: 'Cardiology',
				id: 'prof-cardiology',
				slug: 'cardiology'
			},
			whereSelection: null
		});
		expect(params).toMatchObject({
			whatKind: 'professional',
			whatId: 'prof-cardiology',
			whatSlug: 'cardiology',
			whatLabel: 'Cardiology'
		});
		expect(resolveSearchDoctorsCriteria(params).whatSelection).toEqual({
			kind: 'professional',
			label: 'Cardiology',
			id: 'prof-cardiology',
			slug: 'cardiology'
		});
	});

	it('reconstructs a professional selection with only an id when no slug param is present', () => {
		expect(
			resolveSearchDoctorsCriteria({
				what: 'Cardiology',
				whatKind: 'professional',
				whatId: 'prof-cardiology'
			}).whatSelection
		).toEqual({ kind: 'professional', label: 'Cardiology', id: 'prof-cardiology' });
	});

	// The application's route params do carry the coordinates; on the web only this function of the application's
	// reads them — a results ADDRESS never does (S-07.3 rule 11, `readSearchDoctorsCriteria`).
	it('reconstructs a current-location selection with parsed coordinates', () => {
		expect(
			resolveSearchDoctorsCriteria({
				where: 'Current location',
				whereKind: 'current-location',
				whereLabel: 'Current location',
				whereLat: '37.98',
				whereLng: '23.72'
			}).whereSelection
		).toEqual({
			kind: 'current-location',
			label: 'Current location',
			latitude: 37.98,
			longitude: 23.72
		});
	});

	it('round-trips every structured selection kind through build then resolve', () => {
		const cases = [
			{ kind: 'professional', label: 'Cardiology', id: 'prof-cardiology' },
			{ kind: 'service', label: 'Video consultation', slug: 'video-consultation' },
			{ kind: 'text', label: 'knee pain' }
		] as const;
		for (const whatSelection of cases) {
			const resolved = resolveSearchDoctorsCriteria(
				buildSearchDoctorsQueryParams({
					availability: 'next7Days',
					what: whatSelection.label,
					where: 'Attica',
					whatSelection,
					whereSelection: { kind: 'text', label: 'Attica' }
				})
			);
			expect(resolved.whatSelection).toEqual(whatSelection);
			expect(resolved.availability).toBe('next7Days');
		}
	});

	it('falls back to a text selection when a param kind lacks its structured identity', () => {
		expect(
			resolveSearchDoctorsCriteria({ what: 'Cardiology', whatKind: 'professional' }).whatSelection
		).toEqual({ kind: 'text', label: 'Cardiology' });
	});

	it('filters the static options accent- and case-insensitively, by greek and english keywords', () => {
		expect(getSearchCriteriaOptions('what', 'παθ')[0]?.value).toBe('internal-medicine');
		expect(getSearchCriteriaOptions('what', 'ΠΑΘ')[0]?.value).toBe('internal-medicine');
		expect(getSearchCriteriaOptions('what', 'dentist')[0]?.value).toBe('dentistry');
		expect(getSearchCriteriaOptions('what', 'οδον')[0]?.value).toBe('dentistry');
		expect(getSearchCriteriaOptions('where', 'ΑΤΤΙΚΗ')[0]?.value).toBe('attiki');
	});

	it('exposes the canonical backend availability tokens in picklist order', () => {
		expect(getSearchCriteriaOptions('availability', '').map((option) => option.value)).toEqual([
			'today',
			'next3Days',
			'next7Days',
			'all'
		]);
	});

	it('filters availability options by greek and english keywords', () => {
		expect(getSearchCriteriaOptions('availability', 'σήμερα')[0]?.value).toBe('today');
		expect(getSearchCriteriaOptions('availability', '3')[0]?.value).toBe('next3Days');
		expect(getSearchCriteriaOptions('availability', 'week')[0]?.value).toBe('next7Days');
		expect(getSearchCriteriaOptions('availability', 'anytime')[0]?.value).toBe('all');
	});

	it('labels a selected availability token from the canonical value, and free words as they are', () => {
		expect(getSearchCriteriaOptionLabel('availability', 'next7Days', (key) => key)).toBe(
			'criteria_option_availability_next7_days'
		);
		expect(getSearchCriteriaOptionLabel('where', 'Αθήνα', (key) => key)).toBe('Αθήνα');
		expect(getSearchCriteriaOptionLabel('where', '', (key) => key)).toBe('');
	});
});
