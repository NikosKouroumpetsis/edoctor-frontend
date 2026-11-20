import type { DoctorMyProfileView, DoctorProfileTextView } from './types';

/** A made-up doctor id (no person's): the samples' and the specs'. */
export const SAMPLE_DOCTOR_ID = '0199a0d0-0000-7000-8000-0000000000d1';

/**
 * Tests only: `GET /doctor/me/profile` as the contract writes it — a made-up doctor the search shows, every section
 * filled and one helper open (the prototype's `pr=full`). Patch what a case changes.
 */
export function sampleMyProfileView(patch: Partial<DoctorMyProfileView> = {}): DoctorMyProfileView {
	return {
		doctorId: SAMPLE_DOCTOR_ID,
		slug: 'eleni-pappa-kardiologos',
		visibility: { visible: true, reason: null, licenceEndedAt: null },
		sections: {
			photos: { count: 4 },
			about: { fullName: 'Ελένη Παππά', hasDescription: true, nameLocked: true },
			specialty: { name: 'Καρδιολόγος', specializationsCount: 2, hasCatalogue: true },
			cv: { studies: 2, positions: 3, conferences: 1 },
			languages: { names: ['Ελληνικά', 'Αγγλικά'], socialCount: 2 },
			services: { count: 4, minPrice: 50, samePrice: false }
		},
		missing: [],
		...patch
	};
}

/** Tests only: the same doctor before anything was added (the prototype's `pr=check`): the team still checks. */
export function sampleEmptyProfileView(): DoctorMyProfileView {
	return sampleMyProfileView({
		visibility: { visible: false, reason: 'NOT_VERIFIED', licenceEndedAt: null },
		sections: {
			photos: { count: 0 },
			about: { fullName: 'Ελένη Παππά', hasDescription: false, nameLocked: true },
			// A specialty without a list here (D-W52-57): the cases of the specializations patch their own.
			specialty: { name: 'Καρδιολόγος', specializationsCount: 0, hasCatalogue: false },
			cv: { studies: 0, positions: 0, conferences: 0 },
			languages: { names: [], socialCount: 0 },
			services: { count: 1, minPrice: 60, samePrice: true }
		},
		missing: ['ADD_PROFILE_IMAGE', 'ADD_STUDIES', 'ADD_WORK_EXPERIENCE', 'ADD_SPEAK_LANGUAGES']
	});
}

/** The prototype's two paragraphs of screen 79 (`64-switch/sw.js` `AB_TEXT`). */
export const SAMPLE_DESCRIPTION = [
	'Καρδιολόγος με 15 χρόνια εμπειρίας στην πρόληψη και στην αρρυθμιολογία. Δέχομαι ενήλικες, στα ιατρεία της Κηφισίας και της Πατησίων.',
	'Στην πρώτη επίσκεψη συζητάμε το ιστορικό σας και κάνουμε ηλεκτροκαρδιογράφημα· αν χρειαστεί, και υπέρηχο καρδιάς. Φέρτε μαζί σας τις τελευταίες εξετάσεις σας και τα φάρμακα που παίρνετε.'
] as const;

/**
 * Tests only: `GET /doctor/profile/translations/el` as the contract writes it — the made-up doctor's Greek text, the
 * description in the server's `{ blocks }` form (`paragraphs`; none ⇒ the `{}` of a page nobody wrote yet).
 */
export function sampleProfileTextView(
	paragraphs: readonly string[] = SAMPLE_DESCRIPTION,
	patch: Partial<NonNullable<DoctorProfileTextView>> = {}
): NonNullable<DoctorProfileTextView> {
	return {
		id: '0199a0d0-0000-7000-8000-0000000000e1',
		doctorId: SAMPLE_DOCTOR_ID,
		language: 'el',
		slug: 'eleni-pappa',
		fullName: 'Ελένη Παππά',
		normalizedFullName: 'ελενη παππα',
		transliteration: 'eleni pappa',
		description:
			paragraphs.length > 0
				? { blocks: paragraphs.map((text) => ({ type: 'paragraph', children: [{ text }] })) }
				: {},
		studies: [],
		workExperience: [],
		conferences: [],
		createdAt: '2026-11-18T14:00:00.000Z',
		updatedAt: '2026-11-18T14:00:00.000Z',
		...patch
	};
}

/**
 * Tests only: the paragraphs of a `{ blocks }` document, the way the public page's reader makes them — a spec of this
 * module hands this in where the screen hands in the `doctor` module's own.
 */
export function sampleDescriptionReader(document: unknown): string[] {
	const blocks = (document as { blocks?: { children?: { text?: unknown }[] }[] } | null)?.blocks;
	return (Array.isArray(blocks) ? blocks : []).flatMap((block) => {
		const text = (block?.children ?? [])
			.map((child) => (typeof child?.text === 'string' ? child.text.trim() : ''))
			.filter(Boolean)
			.join(' ');
		return text ? [text] : [];
	});
}
