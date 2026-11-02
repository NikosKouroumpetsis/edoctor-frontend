import type { IoniconName } from '$shared/ui/icons/ionicon';

/**
 * 🔴 The ONE place of the search rows' glyphs (U-21 / U-23.2, the wave record §6.2): a specialty has its own
 * (until then they all wore the same heart), a service the document (a video call the camera), a doctor the person,
 * an area the pin, «Κοντά μου» the arrow (drawn blue on a blue tile), a «Πότε;» row the calendar. A specialty is
 * found by the start of a word of its name, in Greek or English (a server label, a popular specialty or a static
 * fallback alike); one not listed wears `specialty`. U-29.1: the static maps only; the lookups are
 * `lib/criteria-icons` (the application's split).
 */
export const criteriaIcons = {
	specialty: 'medical-outline',
	service: 'document-text-outline',
	videoService: 'videocam-outline',
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
	// a smile (Παιδίατρος)
	{ icon: 'happy-outline', words: ['παιδιατρ', 'pediatric', 'paediatric'] },
	// a spark (Δερματολόγος)
	{ icon: 'sparkles-outline', words: ['δερματολογ', 'dermatolog'] },
	// a woman (Γυναικολόγος)
	{ icon: 'woman-outline', words: ['γυναικολογ', 'gynecolog', 'gynaecolog'] },
	// a bone (Ορθοπαιδικός)
	{ icon: 'bone', words: ['ορθοπαιδ', 'orthoped', 'orthopaed'] },
	// a brain (Ψυχολόγος)
	{ icon: 'brain', words: ['ψυχολογ', 'psycholog'] },
	// an eye (Οφθαλμίατρος)
	{ icon: 'eye-outline', words: ['οφθαλμ', 'ophthalm'] },
	// a tooth (Οδοντίατρος)
	{ icon: 'tooth-outline', words: ['οδοντιατρ', 'dentist', 'dental'] }
];
