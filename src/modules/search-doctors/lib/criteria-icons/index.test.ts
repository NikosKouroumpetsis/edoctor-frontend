import { describe, expect, it } from 'vitest';
import { ioniconNames } from '$shared/ui/icons/ionicon';
import { criteriaIcons, specialtyIcons } from '$modules/search-doctors/config/criteria-icons';
import { serviceIcon, specialtyIcon, whatIcon } from '.';

describe('search-doctors::lib::criteria-icons', () => {
	it('U-21: each listed specialty wears its own glyph — heart with its trace, bag, smile, spark, woman, bone, brain, eye, tooth', () => {
		expect(
			[
				'Καρδιολόγος',
				'Παθολόγος',
				'Παιδίατρος',
				'Δερματολόγος - Αφροδισιολόγος',
				'Γυναικολόγος - Μαιευτήρας',
				'Ορθοπαιδικός - Ορθοπαιδικός Χειρουργός',
				// U-122.1: PR030 is «Ψυχολόγος» alone since the counselor became a specialty of its own.
				'Ψυχολόγος',
				'Οφθαλμίατρος',
				'Οδοντίατρος'
			].map(specialtyIcon)
		).toEqual([
			'fitness-outline',
			'medkit-outline',
			'happy-outline',
			'sparkles-outline',
			'woman-outline',
			'bone',
			'brain',
			'eye-outline',
			'tooth-outline'
		]);
		expect(specialtyIcon('Καρδιοχειρουργός')).toBe('fitness-outline');
	});

	it('U-21: the same glyph for the English names and the static fallbacks, accents and case folded', () => {
		expect(
			['Cardiologist', 'Internal medicine', 'Pediatrics', 'Dentistry', 'ΟΦΘΑΛΜΙΑΤΡΟΣ'].map(
				specialtyIcon
			)
		).toEqual([
			'fitness-outline',
			'medkit-outline',
			'happy-outline',
			'tooth-outline',
			'eye-outline'
		]);
	});

	it('U-122: the mental health counselor (PR091) wears the psychologist’s brain, in both languages; the psychologist keeps it', () => {
		for (const label of [
			'Σύμβουλος Ψυχικής Υγείας',
			'ΣΥΜΒΟΥΛΟΣ ΨΥΧΙΚΗΣ ΥΓΕΙΑΣ',
			'Mental health counselor',
			'Ψυχολόγος',
			'Psychologist'
		]) {
			expect(specialtyIcon(label), label).toBe('brain');
		}
	});

	it('U-122 (negative): the brain goes by «ψυχικ…» / «mental…», never by «σύμβουλος» / «counselor» alone; the psychiatrist (PR029) is not the counselor', () => {
		for (const label of ['Σύμβουλος', 'counselor', 'Ψυχίατρος', 'Psychiatrist']) {
			expect(specialtyIcon(label), label).toBe(criteriaIcons.specialty);
		}
	});

	it('U-122 (W9 Delta 1): Παιδοψυχολόγος (PR058) wears the brain, as «Child psychologist»; the pediatrician keeps the smile in both languages', () => {
		for (const label of ['Παιδοψυχολόγος', 'Child psychologist']) {
			expect(specialtyIcon(label), label).toBe('brain');
		}
		for (const label of ['Παιδίατρος', 'Pediatrician', 'Pediatrics', 'Paediatrician']) {
			expect(specialtyIcon(label), label).toBe('happy-outline');
		}
	});

	it('U-122 (W9 Delta 1, negative): «Pediatric …» is ONE word with what follows, as «Παιδο…» — neither the base specialty nor the pediatrician, and no stem reads across the seam', () => {
		for (const [english, greek] of [
			['Pediatric cardiologist', 'Παιδοκαρδιολόγος'],
			['Pediatric dentist', 'Παιδοδοντίατρος'],
			['Pediatric surgeon', 'Παιδοχειρουργός'],
			['Pediatric orthopedist', 'Παιδοορθοπαιδικός']
		]) {
			expect(specialtyIcon(english), english).toBe(criteriaIcons.specialty);
			expect(specialtyIcon(greek), greek).toBe(specialtyIcon(english));
		}
	});

	it('U-21 (negative): a word that only CONTAINS a stem is not that specialty — it wears the default glyph', () => {
		expect(specialtyIcon('Παιδοκαρδιολόγος')).toBe(criteriaIcons.specialty);
		expect(specialtyIcon('Ενδοκρινολόγος')).toBe(criteriaIcons.specialty);
		expect(specialtyIcon('')).toBe(criteriaIcons.specialty);
	});

	// Rewrites «U-21: a service is the document, a video call the camera»: U-89.1 takes the video call out of the product.
	it('U-89.1: καμία βιντεοκλήση στις αναζητήσεις — every service wears the document, the config carries no camera; a doctor the person', () => {
		expect(serviceIcon()).toBe('document-text-outline');
		for (const label of ['Βιντεοκλήση', 'Online συμβουλευτική', 'Video consultation']) {
			expect(whatIcon('service', label)).toBe('document-text-outline');
		}
		expect(Object.values(criteriaIcons)).not.toContain('videocam-outline');
		expect(Object.keys(criteriaIcons)).not.toContain('videoService');
		expect(whatIcon('doctor', 'Μαρία Καρδαμίτση')).toBe('person-outline');
		expect(whatIcon('professional', 'Καρδιολόγος')).toBe('fitness-outline');
	});

	it('U-21: every glyph of the config is one the kit carries (no missing path)', () => {
		const used = [...Object.values(criteriaIcons), ...specialtyIcons.map((entry) => entry.icon)];
		for (const icon of used) expect(ioniconNames).toContain(icon);
		expect(criteriaIcons).toMatchObject({
			location: 'location-outline',
			currentLocation: 'navigate-outline',
			availability: 'calendar-outline'
		});
	});
});
