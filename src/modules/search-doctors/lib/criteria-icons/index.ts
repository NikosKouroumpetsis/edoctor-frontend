import { criteriaIcons, specialtyIcons } from '$modules/search-doctors/config/criteria-icons';
import { foldSearchText } from '$shared/lib/text';
import type { IoniconName } from '$shared/ui/icons/ionicon';

/** The words that make a service a video call (the camera), folded as the labels are. */
const VIDEO_SERVICE_WORDS = ['βιντεο', 'video', 'online'] as const;

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

/** A service's glyph: the camera for a video call (by its slug or its name), else the document. */
export function serviceIcon(label: string, slug?: string): IoniconName {
	const video = slug === 'video-consultation' || startsAWord(label, VIDEO_SERVICE_WORDS);
	return video ? criteriaIcons.videoService : criteriaIcons.service;
}

/** The glyph of a «Τι;» row of each kind. */
export function whatIcon(
	kind: 'professional' | 'service' | 'doctor',
	label: string,
	slug?: string
): IoniconName {
	if (kind === 'doctor') return criteriaIcons.doctor;
	if (kind === 'service') return serviceIcon(label, slug);
	return specialtyIcon(label);
}
