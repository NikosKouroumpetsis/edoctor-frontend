import type { IoniconName } from '$shared/ui/icons/ionicon';

/**
 * 🔴 The ONE place of the search rows' glyphs (U-21 / U-23.2, the wave record §6.2): a specialty has its own
 * (until then they all wore the same heart), a service the document (U-89.1: no camera), a doctor the person,
 * an area the pin, «Κοντά μου» the arrow (drawn blue on a blue tile), a «Πότε;» row the calendar. A specialty is
 * found by the start of a word of its name, in Greek or English (a server label, a popular specialty or a static
 * fallback alike); one not listed wears `specialty`. U-29.1: the static maps only; the lookups are
 * `lib/criteria-icons` (the application's split).
 */
export const criteriaIcons = {
	specialty: 'medical-outline',
	service: 'document-text-outline',
	doctor: 'person-outline',
	location: 'location-outline',
	currentLocation: 'navigate-outline',
	availability: 'calendar-outline'
} as const satisfies Record<string, IoniconName>;

/** The specialties with a glyph of their own: the glyph and the starts of the words of their names. */
export const specialtyIcons: readonly { icon: IoniconName; words: readonly string[] }[] = [
	// heart with its trace (Καρδιολόγος, Καρδιοχειρουργός)
	{ icon: 'fitness-outline', words: ['καρδιολογ', 'καρδιοχειρουργ', 'cardiolog', 'cardiac'] },
	// the doctor's bag (Παθολόγος)
	{ icon: 'medkit-outline', words: ['παθολογ', 'internal', 'internist'] },
	// a smile (Παιδίατρος); the English words of the pediatrician alone (U-122: «Pediatric …» is a compound, below)
	{
		icon: 'happy-outline',
		words: ['παιδιατρ', 'pediatrician', 'pediatrics', 'paediatrician', 'paediatrics']
	},
	// a spark (Δερματολόγος)
	{ icon: 'sparkles-outline', words: ['δερματολογ', 'dermatolog'] },
	// a woman (Γυναικολόγος)
	{ icon: 'woman-outline', words: ['γυναικολογ', 'gynecolog', 'gynaecolog'] },
	// a bone (Ορθοπαιδικός)
	{ icon: 'bone', words: ['ορθοπαιδ', 'orthoped', 'orthopaed'] },
	// a brain (Ψυχολόγος; U-122: Παιδοψυχολόγος too, as «Child psychologist» in English)
	{ icon: 'brain', words: ['ψυχολογ', 'παιδοψυχολογ', 'psycholog'] },
	// the same brain (Σύμβουλος Ψυχικής Υγείας, U-122.1: its own specialty, PR091, beside the psychologist)
	{ icon: 'brain', words: ['ψυχικ', 'mental'] },
	// an eye (Οφθαλμίατρος)
	{ icon: 'eye-outline', words: ['οφθαλμ', 'ophthalm'] },
	// a tooth (Οδοντίατρος)
	{ icon: 'tooth-outline', words: ['οδοντιατρ', 'dentist', 'dental'] }
];

/**
 * 🔴 U-122 · the English qualifiers that make ONE specialty with the word after them, as Greek writes «Παιδο…» as one
 * word: «Pediatric cardiologist» is Παιδοκαρδιολόγος, not Καρδιολόγος (U-21), so each id wears one glyph in both
 * languages (`tests/architecture/specialty-terms.test.ts`).
 */
export const specialtyIconQualifiers: readonly string[] = ['pediatric', 'paediatric'];
