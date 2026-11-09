import type { LocalizedTerm } from '$modules/search-doctors/api/marketplace/sections';

/**
 * The footer's popular searches (U-16.9, Airbnb's «Δημοφιλείς αναζητήσεις»): the words a link searches, per
 * language. Sources, nothing invented: the specialties are the catalogue's names or their first words (Κ-1,
 * `backend/src/shared/config/professionals/languages/{el,en}.json`, the seed's too), the areas the
 * backend's demo municipalities (`backend/__seeds__/src/datasets/locations.ts`, `DEMO_LOCATION_CLUSTERS`) with the
 * English transliteration the location matcher accepts (as `homeSectionConfigs`: `Athina`). No professional id is
 * known without the database, so every link searches by words (the application's `text` selection). U-89.1: no video
 * consultation in the product, so no «Online» column.
 */
export type PopularArea =
	| 'athens'
	| 'piraeus'
	| 'thessaloniki'
	| 'marousi'
	| 'glyfada'
	| 'patra'
	| 'heraklion'
	| 'larisa';

export type PopularSpecialty =
	| 'cardiology'
	| 'pediatrics'
	| 'dermatology'
	| 'psychology'
	| 'gynecology'
	| 'orthopedics'
	| 'ophthalmology'
	| 'internal-medicine'
	| 'endocrinology'
	| 'neurology'
	| 'psychiatry'
	| 'urology'
	| 'allergy'
	| 'general-practice'
	| 'nutrition';

export const popularAreaTerms: Record<PopularArea, LocalizedTerm> = {
	athens: { el: 'Αθήνα', en: 'Athina' },
	piraeus: { el: 'Πειραιάς', en: 'Peiraias' },
	thessaloniki: { el: 'Θεσσαλονίκη', en: 'Thessaloniki' },
	marousi: { el: 'Μαρούσι', en: 'Marousi' },
	glyfada: { el: 'Γλυφάδα', en: 'Glyfada' },
	patra: { el: 'Πάτρα', en: 'Patra' },
	heraklion: { el: 'Ηράκλειο', en: 'Irakleio' },
	larisa: { el: 'Λάρισα', en: 'Larisa' }
};

export const popularSpecialtyTerms: Record<PopularSpecialty, LocalizedTerm> = {
	cardiology: { el: 'Καρδιολόγος', en: 'Cardiologist' },
	pediatrics: { el: 'Παιδίατρος', en: 'Pediatrician' },
	dermatology: { el: 'Δερματολόγος', en: 'Dermatologist' },
	psychology: { el: 'Ψυχολόγος', en: 'Psychologist' },
	gynecology: { el: 'Γυναικολόγος', en: 'Gynecologist' },
	orthopedics: { el: 'Ορθοπαιδικός', en: 'Orthopedist' },
	ophthalmology: { el: 'Οφθαλμίατρος', en: 'Ophthalmologist' },
	'internal-medicine': { el: 'Παθολόγος', en: 'Internist' },
	endocrinology: { el: 'Ενδοκρινολόγος', en: 'Endocrinologist' },
	neurology: { el: 'Νευρολόγος', en: 'Neurologist' },
	psychiatry: { el: 'Ψυχίατρος', en: 'Psychiatrist' },
	urology: { el: 'Ουρολόγος', en: 'Urologist' },
	allergy: { el: 'Αλλεργιολόγος', en: 'Allergist' },
	'general-practice': { el: 'Γενικός Γιατρός', en: 'General practitioner' },
	nutrition: { el: 'Διαιτολόγος - Διατροφολόγος', en: 'Dietitian - Nutritionist' }
};

/** «Ειδικότητες»: a specialty in an area each («Καρδιολόγοι / Αθήνα»), the order the footer shows them. */
export const popularSpecialtySearches: { specialty: PopularSpecialty; area: PopularArea }[] = [
	{ specialty: 'cardiology', area: 'athens' },
	{ specialty: 'pediatrics', area: 'thessaloniki' },
	{ specialty: 'dermatology', area: 'piraeus' },
	{ specialty: 'psychology', area: 'marousi' },
	{ specialty: 'gynecology', area: 'heraklion' },
	{ specialty: 'orthopedics', area: 'larisa' },
	{ specialty: 'ophthalmology', area: 'patra' },
	{ specialty: 'internal-medicine', area: 'glyfada' },
	{ specialty: 'endocrinology', area: 'thessaloniki' },
	{ specialty: 'neurology', area: 'athens' },
	{ specialty: 'psychiatry', area: 'piraeus' },
	{ specialty: 'urology', area: 'patra' },
	{ specialty: 'allergy', area: 'heraklion' },
	{ specialty: 'general-practice', area: 'larisa' },
	{ specialty: 'nutrition', area: 'athens' }
];

/** «Περιοχές»: every specialty in an area. */
export const popularAreaSearches: PopularArea[] = [
	'athens',
	'piraeus',
	'thessaloniki',
	'marousi',
	'glyfada',
	'patra',
	'heraklion',
	'larisa'
];

/** The links shown per tab before «Εμφάνιση περισσότερων» (Airbnb's two rows of six, less the button's place). */
export const POPULAR_INITIAL_COUNT = 11;
