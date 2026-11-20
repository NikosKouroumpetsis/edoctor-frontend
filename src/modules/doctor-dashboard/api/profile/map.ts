import { isUuid } from '$shared/lib/ids';
import type {
	DoctorDescriptionReader,
	DoctorMyProfileFacts,
	DoctorMyProfileView,
	DoctorPracticeLicenceFacts,
	DoctorProfileBaseView,
	DoctorProfileHiddenReason,
	DoctorProfileMissingCode,
	DoctorProfileTextFacts,
	DoctorProfileTextView
} from './types';

const REASONS: readonly DoctorProfileHiddenReason[] = [
	'LICENCE_EXPIRED',
	'NOT_VERIFIED',
	'NO_MARKETPLACE_LICENCE',
	'INCOMPLETE'
];
const MISSING: readonly DoctorProfileMissingCode[] = [
	'ADD_PROFILE_IMAGE',
	'ADD_SPECIALIZATIONS',
	'ADD_STUDIES',
	'ADD_WORK_EXPERIENCE',
	'ADD_SPEAK_LANGUAGES'
];
// Long enough for any real name or specialty, short enough that a broken answer cannot grow what a page draws.
const MAX_TEXT = 160;
/** The slug the public page takes (`doctor/api/profile/load.ts`): letters, digits and dashes, 160 at most. */
const SLUG = /^[A-Za-z0-9][A-Za-z0-9-]{0,159}$/u;
// The catalogue holds far fewer languages (82: ten for a doctor); a longer list is a broken answer, cut here.
const MAX_LANGUAGES = 30;
const MAX_LANGUAGE_NAME = 60;
// No section holds more: a count beyond it is no fact of a profile.
const MAX_COUNT = 999;
const MAX_PRICE = 100_000;
// The server keeps three specializations at most (D-W52-54); a larger count is a broken answer, cut here.
const MAX_SPECIALIZATIONS = 3;
// The server's own bound of a practice licence's number (D-W52-52).
const MAX_LICENCE_NUMBER = 50;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const oneOf = <T extends string>(list: readonly T[], value: unknown): T | null =>
	list.find((entry) => entry === value) ?? null;
const text = (value: unknown, max = MAX_TEXT): string | null =>
	typeof value === 'string' && value.trim() && value.trim().length <= max ? value.trim() : null;
/** A count the page may write: a whole number from 0, else 0 (a broken count names nothing). */
const count = (value: unknown): number =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_COUNT
		? value
		: 0;
/** An instant the browser can read (`2026-11-15T…`), else nothing. */
const instant = (value: unknown): string | null =>
	typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value))
		? value
		: null;
const part = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

/**
 * U-65.6: the answer read field by field. An answer that is no profile (no record, no server id for the doctor) is
 * `null`, a failed read. Inside it nothing is trusted: an unknown reason or helper is left out, a count that is no whole
 * number from 0 is 0, a name too long or a slug that is no slug is none, the languages are cut at their bound, a price
 * that is no amount is none. `visible` is only the server's own `true`, and never beside a reason; `nameLocked`
 * (D-W52-47) only the server's own `true`. 🔴 D-W52-57 / 59: `hasCatalogue` only the server's own `true`; the count of
 * the specializations is none without a list, and never past the three the server keeps; `ADD_SPECIALIZATIONS` is never
 * kept for a specialty without a list.
 */
export function mapDoctorMyProfile(
	view: DoctorMyProfileView | null | undefined
): DoctorMyProfileFacts | null {
	if (!isRecord(view)) return null;
	const doctorId =
		typeof view.doctorId === 'string' && isUuid(view.doctorId) ? view.doctorId : null;
	if (!doctorId) return null;
	const visibility = part(view.visibility);
	const reason = oneOf(REASONS, visibility.reason);
	const sections = part(view.sections);
	const about = part(sections.about);
	const specialty = part(sections.specialty);
	const hasCatalogue = specialty.hasCatalogue === true;
	const cv = part(sections.cv);
	const languages = part(sections.languages);
	const services = part(sections.services);
	const names = Array.isArray(languages.names) ? languages.names : [];
	const serviceCount = count(services.count);
	const price = services.minPrice;
	const missing = Array.isArray(view.missing) ? view.missing : [];
	return {
		doctorId,
		slug: typeof view.slug === 'string' && SLUG.test(view.slug) ? view.slug : null,
		visibility: {
			visible: visibility.visible === true && reason === null,
			reason,
			licenceEndedAt: reason === 'LICENCE_EXPIRED' ? instant(visibility.licenceEndedAt) : null
		},
		sections: {
			photos: { count: count(part(sections.photos).count) },
			about: {
				fullName: text(about.fullName),
				hasDescription: about.hasDescription === true,
				nameLocked: about.nameLocked === true
			},
			specialty: {
				name: text(specialty.name),
				specializationsCount: hasCatalogue
					? Math.min(count(specialty.specializationsCount), MAX_SPECIALIZATIONS)
					: 0,
				hasCatalogue
			},
			cv: {
				studies: count(cv.studies),
				positions: count(cv.positions),
				conferences: count(cv.conferences)
			},
			languages: {
				names: names.flatMap((name) => text(name, MAX_LANGUAGE_NAME) ?? []).slice(0, MAX_LANGUAGES),
				socialCount: count(languages.socialCount)
			},
			services: {
				count: serviceCount,
				minPrice:
					serviceCount > 0 &&
					typeof price === 'number' &&
					Number.isFinite(price) &&
					price >= 0 &&
					price <= MAX_PRICE
						? price
						: null,
				samePrice: services.samePrice === true
			}
		},
		missing: MISSING.filter(
			(code) => missing.includes(code) && (code !== 'ADD_SPECIALIZATIONS' || hasCatalogue)
		)
	};
}

/** A calendar day the server wrote (`2010-03-12`, or an instant that starts with one), else nothing. */
function calendarDay(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > 40) return null;
	const day = /^\d{4}-\d{2}-\d{2}(?=$|T)/u.exec(value)?.[0];
	if (!day) return null;
	const read = new Date(`${day}T00:00:00.000Z`);
	return !Number.isNaN(read.getTime()) && read.toISOString().slice(0, 10) === day ? day : null;
}

/**
 * 🔴 D-W52-59 · U-65.6: the practice licence of the base profile, read field by field — the number as plain text of one
 * line within the server's own bound, the day as a real calendar day; anything else is none. An answer that is no
 * record is `undefined`, a failed read. Nothing else of the base profile leaves `api/`.
 */
export function mapDoctorPracticeLicence(
	view: DoctorProfileBaseView | null | undefined
): DoctorPracticeLicenceFacts | undefined {
	if (!isRecord(view)) return undefined;
	const number = text(view.licenseNumber, MAX_LICENCE_NUMBER);
	return {
		number: number !== null && !/[\r\n\u2028\u2029]/u.test(number) ? number : null,
		obtainedDay: calendarDay(view.licenseObtainedDate)
	};
}

// A description is a few paragraphs; these bounds only keep a broken answer from growing what the page draws.
const MAX_PARAGRAPHS = 100;
const MAX_PARAGRAPH = 10_000;

/**
 * 🔴 D-W52-48 · U-65.6: the page's own text read field by field. `null` — the page has no text in that language — is an
 * answer: no name, no description. Anything else that is no record is `undefined`, a failed read. The description goes
 * through the public page's own reader (`read`, handed in by the screen) and only its plain paragraphs are kept: what
 * is no text, or blank, is left out; a reader that fails on a broken document leaves no description.
 */
export function mapDoctorProfileText(
	view: DoctorProfileTextView | undefined,
	read: DoctorDescriptionReader
): DoctorProfileTextFacts | undefined {
	if (view === null) return { fullName: null, paragraphs: [] };
	if (!isRecord(view)) return undefined;
	let paragraphs: readonly unknown[] = [];
	try {
		const made: unknown = read(view.description);
		if (Array.isArray(made)) paragraphs = made;
	} catch {
		paragraphs = [];
	}
	return {
		fullName: text(view.fullName),
		paragraphs: paragraphs
			.flatMap((paragraph) =>
				typeof paragraph === 'string' && paragraph.trim() ? paragraph.trim() : []
			)
			.slice(0, MAX_PARAGRAPHS)
			.map((paragraph) => paragraph.slice(0, MAX_PARAGRAPH))
	};
}
