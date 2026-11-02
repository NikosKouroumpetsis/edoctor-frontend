/**
 * The profile's windows (`details/*`, the application's `details/[section]`): their ids, their addresses and the
 * hints a link carries — the application's `focus` (a review's id; in `photos` a photo's place, from 0), `office`,
 * `date`, `service`. Read from untrusted addresses: only plain ids and a `YYYY-MM-DD` day survive.
 */

export const DOCTOR_DETAIL_SECTIONS = [
	'description',
	'services',
	'location',
	'reviews',
	'availability',
	'photos'
] as const;

export type DoctorDetailSection = (typeof DOCTOR_DETAIL_SECTIONS)[number];

export function isDoctorDetailSection(value: string): value is DoctorDetailSection {
	return (DOCTOR_DETAIL_SECTIONS as readonly string[]).includes(value);
}

/** The hints of a window (each absent unless valid). */
export type DoctorDetailHints = {
	focus?: string;
	office?: string;
	date?: string;
	service?: string;
};

const HINT_ID = /^[A-Za-z0-9_-]{1,80}$/u;
const HINT_DATE = /^\d{4}-\d{2}-\d{2}$/u;
/** The application's `PHOTO_INDEX_PATTERN`: a photo's place in the list, digits only (≤ 3). */
const PHOTO_FOCUS = /^\d{1,3}$/u;

/**
 * 🔴 The application's `focusPhotoIndex` (app = web): the `focus` of `details/photos` as the viewer's photo, from 0 —
 * `undefined` (the tour) for anything but digits; a place past the last photo is the viewer's to clamp.
 */
export function readDoctorPhotoFocus(focus: string | undefined): number | undefined {
	return focus && PHOTO_FOCUS.test(focus) ? Number(focus) : undefined;
}

/** The hints of an address's query: ids by their pattern, the day as `YYYY-MM-DD`. */
export function readDoctorDetailHints(params: URLSearchParams): DoctorDetailHints {
	const hints: DoctorDetailHints = {};
	for (const key of ['focus', 'office', 'service'] as const) {
		const value = params.get(key);
		if (value && HINT_ID.test(value)) hints[key] = value;
	}
	const date = params.get('date');
	if (date && HINT_DATE.test(date)) hints.date = date;
	return hints;
}

/** The profile's address, before its language: `/doctors/<slug>`. */
export function doctorProfilePath(slug: string): string {
	return `/doctors/${encodeURIComponent(slug)}`;
}

/** A window's address, before its language: `/doctors/<slug>/details/<section>?<hints>`. */
export function doctorDetailsPath(
	slug: string,
	section: DoctorDetailSection,
	hints: DoctorDetailHints = {}
): string {
	const query = new URLSearchParams();
	for (const key of ['focus', 'office', 'date', 'service'] as const) {
		const value = hints[key];
		if (value) query.set(key, value);
	}
	const search = query.toString();
	return `${doctorProfilePath(slug)}/details/${section}${search ? `?${search}` : ''}`;
}
