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
				'Ψυχολόγος - Σύμβουλος Ψυχικής Υγείας',
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
