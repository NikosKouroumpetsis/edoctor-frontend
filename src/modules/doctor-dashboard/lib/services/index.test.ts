import { describe, expect, it } from 'vitest';
import type {
	DoctorAllowedServiceFacts,
	DoctorServiceFacts
} from '$modules/doctor-dashboard/api/services';
import {
	buildDoctorServiceCatalogueRows,
	doctorServiceArrowTarget,
	doctorServiceDropTarget,
	doctorServiceError,
	doctorServiceErrorText,
	doctorServiceLine,
	doctorServicesFailureText,
	doctorServiceSuggestion,
	doctorServiceSuggestionOffer,
	doctorServiceYearsLimit,
	keepDoctorServiceDigits,
	moveDoctorService,
	newDoctorServiceValues,
	sameDoctorServiceOrder,
	toDoctorServiceDraft,
	toDoctorServiceValues,
	type DoctorServiceValues
} from '.';

const option = (more: Partial<DoctorAllowedServiceFacts> = {}): DoctorAllowedServiceFacts => ({
	serviceId: '0193d000-0000-7000-8000-000000009005',
	title: 'Holter ρυθμού 24ώρου',
	suggestedSubtitle: 'Καταγραφή του ρυθμού για ένα 24ωρο',
	suggestedDescription: 'Μια μικρή συσκευή που φοράτε για 24 ώρες.',
	durationInMinutes: 20,
	owned: false,
	...more
});
const service = (more: Partial<DoctorServiceFacts> = {}): DoctorServiceFacts => ({
	id: '0193d000-0000-7000-8000-000000005001',
	serviceId: '0193d000-0000-7000-8000-000000009001',
	title: 'Απλή επίσκεψη',
	price: 60,
	durationInMinutes: 30,
	subtitle: null,
	description: 'Δική μου περιγραφή.',
	years: 15,
	...more
});
const values = (more: Partial<DoctorServiceValues> = {}): DoctorServiceValues => ({
	price: '60',
	durationInMinutes: 30,
	subtitle: '',
	description: '',
	years: '',
	...more
});

describe('screen 83 · the list (D-W52-81)', () => {
	it('🔴 D-W52-81 · D-W52-10: a row’s line is «length · price», the length in hours from 60', () => {
		const line = (durationInMinutes: number, price: number, locale: 'el' | 'en' = 'el') =>
			doctorServiceLine({ durationInMinutes, price }, locale).replace(/\u00a0/gu, ' ');
		expect(line(30, 60)).toBe('30′ · 60 €');
		expect(line(90, 80)).toBe('1 ώρα 30′ · 80 €');
		expect(line(120, 35)).toBe('2 ώρες · 35 €');
		expect(line(60, 100, 'en')).toBe('1 hour · €100');
	});

	it('🔴 D-W52-81 (U-212.1): «Νέα υπηρεσία» is the catalogue WITHOUT what the doctor already offers (`owned`), in the server’s order, «Συνήθως …»', () => {
		const rows = buildDoctorServiceCatalogueRows(
			[
				option({ serviceId: 'a', title: 'Απλή επίσκεψη', owned: true }),
				option({ serviceId: 'b', title: 'Holter ρυθμού 24ώρου', durationInMinutes: 20 }),
				option({ serviceId: 'c', title: 'Τεστ κοπώσεως', durationInMinutes: 60 }),
				option({ serviceId: 'd', title: 'Επανεξέταση', owned: true })
			],
			'el'
		);
		expect(rows).toEqual([
			{ serviceId: 'b', title: 'Holter ρυθμού 24ώρου', usually: 'Συνήθως 20′' },
			{ serviceId: 'c', title: 'Τεστ κοπώσεως', usually: 'Συνήθως 1 ώρα' }
		]);
		expect(buildDoctorServiceCatalogueRows([option({ owned: true })], 'el')).toEqual([]);
	});

	it('🔴 D-W52-81: ↑ / ↓ move a service one place, never past either end; a drag’s place is the row under the pointer', () => {
		expect(doctorServiceArrowTarget('ArrowUp', 2, 4)).toBe(1);
		expect(doctorServiceArrowTarget('ArrowDown', 2, 4)).toBe(3);
		expect(doctorServiceArrowTarget('ArrowUp', 0, 4)).toBeNull();
		expect(doctorServiceArrowTarget('ArrowDown', 3, 4)).toBeNull();
		expect(doctorServiceArrowTarget('Enter', 1, 4)).toBeNull();
		const rows = [
			{ id: 'a', top: 0, bottom: 72 },
			{ id: 'b', top: 72, bottom: 144 },
			{ id: 'c', top: 144, bottom: 216 }
		];
		expect(doctorServiceDropTarget(150, rows, 'a')).toBe('c');
		expect(doctorServiceDropTarget(30, rows, 'a')).toBeNull();
		expect(doctorServiceDropTarget(400, rows, 'a')).toBeNull();
		expect(moveDoctorService(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
		expect(sameDoctorServiceOrder(['a', 'b'], ['a', 'b'])).toBe(true);
		expect(sameDoctorServiceOrder(['a', 'b'], ['b', 'a'])).toBe(false);
	});
});

describe('screen 83 · one service (D-W52-82)', () => {
	it('🔴 U-217.3 · U-214.4: a NEW service opens with NO price, the catalogue’s usual length, EMPTY texts (never eDoctor’s) and no years', () => {
		expect(newDoctorServiceValues(option())).toEqual({
			price: '',
			durationInMinutes: 20,
			subtitle: '',
			description: '',
			years: ''
		});
		// A usual length off the list is no pick: the doctor picks one.
		expect(newDoctorServiceValues(option({ durationInMinutes: 25 })).durationInMinutes).toBeNull();
	});

	it('🔴 U-214.1: a stored service opens with what the DOCTOR wrote — an empty text stays empty', () => {
		expect(toDoctorServiceValues(service())).toEqual({
			price: '60',
			durationInMinutes: 30,
			subtitle: '',
			description: 'Δική μου περιγραφή.',
			years: '15'
		});
	});

	it('🔴 U-212.1 · D-W52-71: the price is whole euros from 1 to 9999 — empty, 0, a letter, cents and 10000 are refused, in the page’s words', () => {
		for (const price of ['', '0', '00', 'α', '12.5', '10000', ' ']) {
			expect(doctorServiceError('price', values({ price }), 16), price).toBe('price');
		}
		for (const price of ['1', '60', '9999']) {
			expect(doctorServiceError('price', values({ price }), 16), price).toBeNull();
		}
		expect(doctorServiceErrorText('price', 'el', 16)).toBe('Γράψτε τιμή από 1 έως 9999 €.');
	});

	it('🔴 U-212.1: the years are optional and never past those of the practice licence, in the page’s words', () => {
		expect(doctorServiceError('years', values({ years: '' }), 16)).toBeNull();
		expect(doctorServiceError('years', values({ years: '16' }), 16)).toBeNull();
		expect(doctorServiceError('years', values({ years: '17' }), 16)).toBe('years');
		expect(doctorServiceError('years', values({ years: '1α' }), 16)).toBe('years');
		expect(doctorServiceErrorText('years', 'el', 16)).toBe(
			'Έως 16 χρόνια, όσα έχετε άδεια ασκήσεως.'
		);
	});

	it('🔴 U-212.1 (the server’s `assertYearsWithinLicense`): the whole years since the licence, on the server’s clock; without a day the server’s 70', () => {
		const now = Date.parse('2026-11-18T10:00:00Z');
		expect(doctorServiceYearsLimit('2010-03-12', now)).toBe(16);
		expect(doctorServiceYearsLimit('2010-11-18', now)).toBe(16);
		expect(doctorServiceYearsLimit('2010-11-19', now)).toBe(15);
		expect(doctorServiceYearsLimit('2026-01-01', now)).toBe(0);
		expect(doctorServiceYearsLimit('2030-01-01', now)).toBe(0);
		expect(doctorServiceYearsLimit(null, now)).toBe(70);
		expect(doctorServiceYearsLimit('12/03/2010', now)).toBe(70);
	});

	it('a field of digits keeps its digits alone — four for the price, two for the years', () => {
		expect(keepDoctorServiceDigits('6a0<b>', 'price')).toBe('60');
		expect(keepDoctorServiceDigits('123456', 'price')).toBe('1234');
		expect(keepDoctorServiceDigits('123', 'years')).toBe('12');
	});

	it('🔴 D-W52-82 · U-214.4: what ONE save writes — nothing while a rule is broken; the doctor’s texts trimmed, an empty one `null`; a stored length off the list left as it is', () => {
		expect(toDoctorServiceDraft(values({ price: '' }), 16)).toBeNull();
		expect(toDoctorServiceDraft(values({ years: '30' }), 16)).toBeNull();
		expect(
			toDoctorServiceDraft(
				values({
					price: '45',
					durationInMinutes: 105,
					subtitle: '  Σύντομο ',
					description: '   ',
					years: '3'
				}),
				16
			)
		).toEqual({
			price: 45,
			durationInMinutes: 105,
			subtitle: 'Σύντομο',
			description: null,
			years: 3
		});
		expect(
			toDoctorServiceDraft(values({ durationInMinutes: 25 }), 16)?.durationInMinutes
		).toBeNull();
	});

	it('🔴 U-214.1 / U-214.4: eDoctor’s texts ONLY behind the button — shown while the fields do not hold them, «Αντικαθιστά…» only over a text of the doctor', () => {
		const suggestion = doctorServiceSuggestion(option());
		expect(suggestion).toEqual({
			subtitle: 'Καταγραφή του ρυθμού για ένα 24ωρο',
			description: 'Μια μικρή συσκευή που φοράτε για 24 ώρες.'
		});
		expect(doctorServiceSuggestionOffer(values(), suggestion)).toEqual({ replaces: false });
		expect(doctorServiceSuggestionOffer(values({ description: 'Δικό μου' }), suggestion)).toEqual({
			replaces: true
		});
		expect(
			doctorServiceSuggestionOffer(
				values({ subtitle: suggestion?.subtitle, description: suggestion?.description }),
				suggestion
			)
		).toBeNull();
		// No text of eDoctor, or no catalogue entry: no button at all.
		expect(
			doctorServiceSuggestion(option({ suggestedSubtitle: null, suggestedDescription: null }))
		).toBeNull();
		expect(doctorServiceSuggestion(undefined)).toBeNull();
		expect(doctorServiceSuggestionOffer(values(), null)).toBeNull();
	});

	it('🔴 D-W52-74 · U-140: why a write did not happen, in the page’s words — the last service its own sentence', () => {
		expect(doctorServicesFailureText('last', 'el')).toBe(
			"Είναι η μόνη σας υπηρεσία, γι' αυτό δεν διαγράφεται: χωρίς υπηρεσία δεν σας κλείνουν ραντεβού."
		);
		expect(doctorServicesFailureText('rate-limited', 'el')).toBe(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(doctorServicesFailureText('gone', 'el')).toBe('Αυτή η υπηρεσία δεν υπάρχει πια.');
		expect(doctorServicesFailureText('invalid', 'en')).toBe(
			'The change was not saved. Check the price and the years and try again.'
		);
	});
});
