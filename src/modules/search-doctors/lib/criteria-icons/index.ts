import { criteriaIcons, specialtyIcons } from '$modules/search-doctors/config/criteria-icons';
import { foldSearchText } from '$shared/lib/text';
import type { IoniconName } from '$shared/ui/icons/ionicon';

function wordsOf(label: string): string[] {
	return foldSearchText(label)
		.split(/[\s\-–/(),.]+/u)
		.filter(Boolean);
}

function startsAWord(label: string, starts: readonly string[]): boolean {
	const words = wordsOf(label);
	return starts.some((start) => words.some((word) => word.startsWith(foldSearchText(start))));
}

/** A specialty's glyph by its name; `specialty` for one not listed. */
export function specialtyIcon(label: string): IoniconName {
	return (
		specialtyIcons.find((entry) => startsAWord(label, entry.words))?.icon ?? criteriaIcons.specialty
	);
}

/** A service's glyph: the document, whatever its name says (U-89.1: no video call, no camera). */
export function serviceIcon(): IoniconName {
	return criteriaIcons.service;
}

/** The glyph of a «Τι;» row of each kind. */
export function whatIcon(kind: 'professional' | 'service' | 'doctor', label: string): IoniconName {
	if (kind === 'doctor') return criteriaIcons.doctor;
	if (kind === 'service') return serviceIcon();
	return specialtyIcon(label);
}
