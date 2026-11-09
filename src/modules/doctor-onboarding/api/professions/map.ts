import type { ProfessionalListResponseView, ProfessionalViewExt } from '$shared/lib/api-client';
import type { DoctorOnboardingProfession } from './types';

/** A name the list can show: some text besides blanks, else none. */
const nameOf = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? value.trim() : null;

/**
 * `ProfessionalListResponseView` as FACTS: each specialty with an id and its Greek and English names (a translation of
 * another language is ignored); a row without an id, or without a name in either, is left out. Every name stays text.
 * The contract types the answer; nothing checks it on the way in, so each row is read as it really came.
 */
export function mapDoctorOnboardingProfessions(
	view: ProfessionalListResponseView | null | undefined
): DoctorOnboardingProfession[] {
	if (!Array.isArray(view)) return [];
	return view.flatMap((row: ProfessionalViewExt | null | undefined) => {
		if (typeof row !== 'object' || row === null) return [];
		const { id, translations } = row as Partial<Record<keyof ProfessionalViewExt, unknown>>;
		if (typeof id !== 'string' || !id.trim()) return [];
		const names = { el: null as string | null, en: null as string | null };
		for (const translation of Array.isArray(translations) ? translations : []) {
			const { language, name } = (translation ?? {}) as { language?: unknown; name?: unknown };
			if ((language === 'el' || language === 'en') && names[language] === null) {
				names[language] = nameOf(name);
			}
		}
		return names.el || names.en ? [{ professionalId: id, names }] : [];
	});
}
