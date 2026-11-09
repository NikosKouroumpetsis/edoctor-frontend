/**
 * The profile's windows (`details/*`, the application's `details/[section]`): their ids, their addresses and the
 * hints a link carries — the application's `focus` (a review's id; in `photos` a photo's place, from 0), `office`,
 * `date`, `service`, the reviews' `mention`, and (wave 3, P-W3 §3.2.1 γ) the profile's `time` of a chosen hour. Read
 * from untrusted addresses: only plain ids, a `YYYY-MM-DD` day, an `HH:MM` time and a topic of the list survive.
 */

import { isDoctorReviewTopic } from '$modules/doctor/api/reviews';
import type { DoctorReviewTopic } from '$modules/doctor/config/review-topics';

export const DOCTOR_DETAIL_SECTIONS = [
	'services',
	'specializations',
	'know',
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
	/** U-66.2: the reviews' window opens on this topic. */
	mention?: DoctorReviewTopic;
	/** Wave 3: the hour chosen on the profile (`HH:MM`, with `office` and `date`), kept when the booking goes back to it. */
	time?: string;
};

const HINT_ID = /^[A-Za-z0-9_-]{1,80}$/u;
const HINT_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const HINT_TIME = /^([01]\d|2[0-3]):[0-5]\d$/u;
/** The application's `PHOTO_INDEX_PATTERN`: a photo's place in the list, digits only (≤ 3). */
const PHOTO_FOCUS = /^\d{1,3}$/u;

/**
 * 🔴 The application's `focusPhotoIndex` (app = web): the `focus` of `details/photos` as the viewer's photo, from 0 —
 * `undefined` (the tour) for anything but digits; a place past the last photo is the viewer's to clamp.
 */
export function readDoctorPhotoFocus(focus: string | undefined): number | undefined {
	return focus && PHOTO_FOCUS.test(focus) ? Number(focus) : undefined;
}

/** The hints of an address's query: ids by their pattern, the day as `YYYY-MM-DD`, the topic by the list (U-65.6). */
export function readDoctorDetailHints(params: URLSearchParams): DoctorDetailHints {
	const hints: DoctorDetailHints = {};
	for (const key of ['focus', 'office', 'service'] as const) {
		const value = params.get(key);
		if (value && HINT_ID.test(value)) hints[key] = value;
	}
	const date = params.get('date');
	if (date && HINT_DATE.test(date)) hints.date = date;
	const time = params.get('time');
	if (time && HINT_TIME.test(time)) hints.time = time;
	const mention = params.get('mention');
	if (isDoctorReviewTopic(mention)) hints.mention = mention;
	return hints;
}

/**
 * The profile's address, before its language: `/doctors/<slug>`; with a chosen hour (wave 3, P-W3 §3.2.1 ε) its
 * `office`, `date`, `time` and `service`, in that order — the booking's own hints, so «back» finds the hour.
 */
export function doctorProfilePath(
	slug: string,
	hints: Pick<DoctorDetailHints, 'office' | 'date' | 'time' | 'service'> = {}
): string {
	const query = new URLSearchParams();
	for (const key of ['office', 'date', 'time', 'service'] as const) {
		const value = hints[key];
		if (value) query.set(key, value);
	}
	const search = query.toString();
	return `/doctors/${encodeURIComponent(slug)}${search ? `?${search}` : ''}`;
}

/** 🔴 U-73.1 Ε1: the doctor's own page, before its language: `/doctors/<slug>/about` (and its old `details/description`). */
export function doctorAboutPath(slug: string): string {
	return `${doctorProfilePath(slug)}/about`;
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
