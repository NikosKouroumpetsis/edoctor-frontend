import { matchesSearch, searchWords } from '$shared/lib/text';
import type { DoctorOnboardingProfession } from '$modules/doctor-onboarding/api/professions';

export type DoctorProfessionOption = { professionalId: string; label: string };

/** The catalogue in the reader's language, else the other one the server keeps, in its own order (the application's). */
export function buildDoctorProfessionOptions(
	professions: readonly DoctorOnboardingProfession[],
	language: 'el' | 'en'
): DoctorProfessionOption[] {
	const other = language === 'el' ? 'en' : 'el';
	return professions.flatMap((profession) => {
		const label = profession.names[language] ?? profession.names[other];
		return label ? [{ professionalId: profession.professionalId, label }] : [];
	});
}

/** The specialties whose name holds every typed word, accents and case aside («καρδ» ⇒ the three cardiologies). */
export function filterDoctorProfessionOptions(
	options: readonly DoctorProfessionOption[],
	query: string
): DoctorProfessionOption[] {
	const words = searchWords(query);
	return words.length === 0
		? [...options]
		: options.filter((option) => matchesSearch(option.label, words));
}

/** The chosen specialty's name, for the field that opens the list; `null` while none is chosen or it is unknown. */
export function readDoctorProfessionLabel(
	options: readonly DoctorProfessionOption[],
	professionalId: string | null
): string | null {
	return options.find((option) => option.professionalId === professionalId)?.label ?? null;
}
