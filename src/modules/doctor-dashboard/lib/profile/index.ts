import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { formatEuro, zonedDay } from '$shared/lib/format';
import type { IoniconName } from '$shared/ui/icons/ionicon';
import type {
	DoctorMyProfileFacts,
	DoctorProfileMissingCode
} from '$modules/doctor-dashboard/api/profile';
import {
	doctorProfileAboutPath,
	doctorProfileCvPath,
	doctorProfileLanguagesPath,
	doctorProfilePhotosPath,
	doctorProfileServicesPath,
	doctorProfileSpecialtyPath
} from '$modules/doctor-dashboard/lib/paths';

type Locale = 'el' | 'en';

/** The six sections of «Το προφίλ μου» (D-W52-24, `64-switch/sw.js` `PF_ROWS`), screens 78–83 in their order. */
export type DoctorProfileSectionId =
	| 'photos'
	| 'about'
	| 'specialty'
	| 'cv'
	| 'languages'
	| 'services';

export type DoctorProfileSectionSeed = {
	id: DoctorProfileSectionId;
	icon: IoniconName;
	/**
	 * The section's own page (a path of the site, before the language): `null` until its screen is BUILT — the row is
	 * then no link and has no «›» (D-W45-02: no row leads to a void). Each card 78–83 writes its address here.
	 */
	path: string | null;
};

/**
 * 🔴 D-W52-24: the closed register of the sections, in the prototype's order, each with the application's glyph.
 * 🔴 D-W52-41: «Φωτογραφίες» has its page since screen 78, 🔴 D-W52-49: «Όνομα και περιγραφή» since screen 79,
 * 🔴 D-W52-59: «Ειδικότητα και εξειδικεύσεις» since screen 80, 🔴 D-W52-63: «Βιογραφικό» since screen 81, 🔴 D-W52-69 /
 * 70: «Γλώσσες και κοινωνικά δίκτυα» since screen 82, 🔴 D-W52-81: «Υπηρεσίες και τιμές» since screen 83 — every row
 * of 77 is a link now. «Κριτικές» and «Τα άρθρα μου» are rows of the «Μενού», never here.
 */
export const doctorProfileSections: readonly DoctorProfileSectionSeed[] = [
	{ id: 'photos', icon: 'camera-outline', path: doctorProfilePhotosPath },
	{ id: 'about', icon: 'id-card-outline', path: doctorProfileAboutPath },
	{ id: 'specialty', icon: 'stethoscope', path: doctorProfileSpecialtyPath },
	{ id: 'cv', icon: 'school-outline', path: doctorProfileCvPath },
	{ id: 'languages', icon: 'globe-outline', path: doctorProfileLanguagesPath },
	{ id: 'services', icon: 'pricetag-outline', path: doctorProfileServicesPath }
];

/** One row of the page: its name, what the section holds now, what it still lacks, and its page if it has one. */
export type DoctorProfileRow = DoctorProfileSectionSeed & {
	label: string;
	/** «4 φωτογραφίες», «2 σπουδές · 3 θέσεις»: `null` for a section that holds nothing. */
	has: string | null;
	/** «Προσθέστε μια φωτογραφία σας»: the server's open helper for the section, `null` for none. */
	missing: string | null;
};

const SEPARATOR = ' · ';
/** How many languages the row of 77 names before «+N» (`sw.js` `slNow`). */
const LANGUAGES_SHOWN = 3;
const joined = (parts: (string | null | false)[]): string | null =>
	parts.filter((part): part is string => Boolean(part)).join(SEPARATOR) || null;
const has = (missing: readonly DoctorProfileMissingCode[], ...codes: DoctorProfileMissingCode[]) =>
	codes.some((code) => missing.includes(code));

/** A section's name as the list, the rail and its own page write it. */
export function doctorProfileSectionLabel(id: DoctorProfileSectionId, locale: Locale): string {
	const options = { locale };
	switch (id) {
		case 'photos':
			return m.doctor_my_profile_section_photos({}, options);
		case 'about':
			return m.doctor_my_profile_section_about({}, options);
		case 'specialty':
			return m.doctor_my_profile_section_specialty({}, options);
		case 'cv':
			return m.doctor_my_profile_section_cv({}, options);
		case 'languages':
			return m.doctor_my_profile_section_languages({}, options);
		case 'services':
			return m.doctor_my_profile_section_services({}, options);
	}
}

/**
 * 🔴 D-W52-24: what a section holds now, built from the server's facts alone (it sends counts and names, never a
 * sentence) — only what is not zero, each count in its own number («1 φωτογραφία», «2 σπουδές»), «από» only when the
 * prices differ, the amount as the site writes euros. A name is «never red»: without a description it says so in the
 * same muted line (screen 79). 🔴 D-W52-59 (screen 80): the specialty, and after it how many specializations the
 * doctor picked — «μία εξειδίκευση», «2 εξειδικεύσεις» — only for a specialty that has a list (without one the row
 * writes the specialty alone). 🔴 D-W52-69 (screen 82, `sw.js` `slNow`): the languages as the server orders them
 * (Greek first), the first three by name and «+N» for the rest — a doctor may speak ten — and after them how many
 * links the page holds. Nothing held ⇒ `null`.
 */
function hasOf(
	id: DoctorProfileSectionId,
	sections: DoctorMyProfileFacts['sections'],
	locale: Locale
): string | null {
	const options = { locale };
	switch (id) {
		case 'photos': {
			const { count } = sections.photos;
			if (count <= 0) return null;
			return count === 1
				? m.doctor_my_profile_photos_one({}, options)
				: m.doctor_my_profile_photos_other({ count }, options);
		}
		case 'about':
			return joined([
				sections.about.fullName,
				!sections.about.hasDescription && m.doctor_my_profile_no_description({}, options)
			]);
		case 'specialty': {
			const { name, specializationsCount: count, hasCatalogue } = sections.specialty;
			return joined([
				name,
				hasCatalogue && count === 1 && m.doctor_my_profile_specializations_one({}, options),
				hasCatalogue && count > 1 && m.doctor_my_profile_specializations_other({ count }, options)
			]);
		}
		case 'cv': {
			const { studies, positions, conferences } = sections.cv;
			return joined([
				studies === 1 && m.doctor_my_profile_studies_one({}, options),
				studies > 1 && m.doctor_my_profile_studies_other({ count: studies }, options),
				positions === 1 && m.doctor_my_profile_positions_one({}, options),
				positions > 1 && m.doctor_my_profile_positions_other({ count: positions }, options),
				conferences === 1 && m.doctor_my_profile_conferences_one({}, options),
				conferences > 1 && m.doctor_my_profile_conferences_other({ count: conferences }, options)
			]);
		}
		case 'languages': {
			const { names, socialCount } = sections.languages;
			const shown = names.slice(0, LANGUAGES_SHOWN).join(', ');
			const more = names.length - LANGUAGES_SHOWN;
			return joined([
				more > 0 ? `${shown} +${more}` : shown,
				socialCount === 1 && m.doctor_my_profile_networks_one({}, options),
				socialCount > 1 && m.doctor_my_profile_networks_other({ count: socialCount }, options)
			]);
		}
		case 'services': {
			const { count, minPrice, samePrice } = sections.services;
			if (count <= 0) return null;
			const amount = minPrice === null ? null : formatEuro(minPrice, locale);
			return joined([
				count === 1
					? m.doctor_my_profile_services_one({}, options)
					: m.doctor_my_profile_services_other({ count }, options),
				amount !== null &&
					(count > 1 && !samePrice
						? m.doctor_my_profile_price_from({ price: amount }, options)
						: amount)
			]);
		}
	}
}

/**
 * 🔴 D-W52-24 (U-205, U-207, U-213.4): what a section still lacks — only the helpers the server keeps for this page:
 * a photo, studies or experience (one line for either), the languages, and 🔴 D-W52-57 / 59 (screen 80) the
 * specializations of a specialty that has a list and none picked. A name without a description, a specialty or the
 * services are never asked for here.
 */
function missingOf(
	id: DoctorProfileSectionId,
	missing: readonly DoctorProfileMissingCode[],
	locale: Locale
): string | null {
	const options = { locale };
	if (id === 'photos' && has(missing, 'ADD_PROFILE_IMAGE'))
		return m.doctor_my_profile_missing_photo({}, options);
	if (id === 'specialty' && has(missing, 'ADD_SPECIALIZATIONS'))
		return m.doctor_my_profile_missing_specializations({}, options);
	if (id === 'cv' && has(missing, 'ADD_STUDIES', 'ADD_WORK_EXPERIENCE'))
		return m.doctor_my_profile_missing_cv({}, options);
	if (id === 'languages' && has(missing, 'ADD_SPEAK_LANGUAGES'))
		return m.doctor_my_profile_missing_languages({}, options);
	return null;
}

/** 🔴 D-W52-24: the six rows of the page in their order, each with what it holds and what it lacks. */
export function buildDoctorProfileRows(
	facts: DoctorMyProfileFacts,
	locale: Locale
): DoctorProfileRow[] {
	return doctorProfileSections.map((section) => ({
		...section,
		label: doctorProfileSectionLabel(section.id, locale),
		has: hasOf(section.id, facts.sections, locale),
		missing: missingOf(section.id, facts.missing, locale)
	}));
}

/** The page's status note: the green one of a doctor the search shows, else the orange one with its reason. */
export type DoctorProfileStatus = {
	tone: 'done' | 'warm';
	icon: IoniconName;
	title: string;
	lines: string[];
};

/** The licence's last day on the platform's calendar, in the reader's words («15 Νοεμβρίου 2026», the notice's way). */
function dayOf(endedAt: string | null, locale: Locale): string | null {
	const instant = endedAt === null ? Number.NaN : Date.parse(endedAt);
	if (Number.isNaN(instant)) return null;
	return formatCalendarDay(zonedDay(instant, PLATFORM_TIME_ZONE), locale, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/** How many sections still ask for something. */
const missingCount = (rows: readonly DoctorProfileRow[]) =>
	rows.filter((row) => row.missing !== null).length;

/** «Μία ενότητα θέλει κάτι ακόμη.» / «N ενότητες θέλουν κάτι ακόμη.» / «Το προφίλ σας είναι πλήρες.» (`pfStatus`). */
function counterOf(rows: readonly DoctorProfileRow[], locale: Locale): string {
	const options = { locale };
	const count = missingCount(rows);
	if (count === 0) return m.doctor_my_profile_complete({}, options);
	return count === 1
		? m.doctor_my_profile_missing_one({}, options)
		: m.doctor_my_profile_missing_other({ count }, options);
}

/**
 * 🔴 D-W52-25 (`64-switch/sw.js` `pfStatus`): the four states.
 * - the search shows the doctor ⇒ green, «Φαίνεστε στην αναζήτηση», what it means and the counter;
 * - `NOT_VERIFIED` ⇒ orange, «Δεν φαίνεστε ακόμη στην αναζήτηση», the team's check and the counter;
 * - `LICENCE_EXPIRED` ⇒ orange, «Δεν φαίνεστε στην αναζήτηση» and the day the licence ended (no counter; a day that
 *   cannot be read leaves the title alone);
 * - `NO_MARKETPLACE_LICENCE`, `INCOMPLETE` ⇒ orange, the title — no reason was designed and none is made up — and,
 *   🔴 D-W52-25α (the application's same rule), the counter ONLY while a section asks for something: «Το προφίλ σας
 *   είναι πλήρες.» is never written under «Δεν φαίνεστε» for a doctor the search hides for what no row here names.
 */
export function buildDoctorProfileStatus(
	facts: DoctorMyProfileFacts,
	rows: readonly DoctorProfileRow[],
	locale: Locale
): DoctorProfileStatus {
	const options = { locale };
	const { visible, reason, licenceEndedAt } = facts.visibility;
	if (visible) {
		return {
			tone: 'done',
			icon: 'checkmark-circle-outline',
			title: m.doctor_my_profile_visible_title({}, options),
			lines: [m.doctor_my_profile_visible_body({}, options), counterOf(rows, locale)]
		};
	}
	const hidden = { tone: 'warm', icon: 'alert-circle-outline' } as const;
	if (reason === 'LICENCE_EXPIRED') {
		const date = dayOf(licenceEndedAt, locale);
		return {
			...hidden,
			title: m.doctor_my_profile_hidden_title({}, options),
			lines: date ? [m.doctor_my_profile_expired_body({ date }, options)] : []
		};
	}
	return {
		...hidden,
		title: m.doctor_my_profile_hidden_yet_title({}, options),
		lines:
			reason === 'NOT_VERIFIED'
				? [m.doctor_my_profile_review_body({}, options), counterOf(rows, locale)]
				: missingCount(rows) > 0
					? [counterOf(rows, locale)]
					: []
	};
}

/**
 * 🔴 D-W52-26 · D-W52-26α: the line under «Έτσι σας βλέπουν οι ασθενείς» — by whether the search shows the doctor (the
 * same `visibility` of `GET /doctor/me/profile`): the page as a patient opens it; hidden because the licence ended (the
 * prototype's third line, `sw.js` `prevPage`); hidden for any other reason. `null` while that is not known, so the band
 * never guesses.
 */
export function buildDoctorProfilePreviewNote(
	visibility: Pick<DoctorMyProfileFacts['visibility'], 'visible' | 'reason'> | null,
	locale: Locale
): string | null {
	if (visibility === null) return null;
	const options = { locale };
	if (visibility.visible) return m.doctor_my_profile_preview_visible({}, options);
	return visibility.reason === 'LICENCE_EXPIRED'
		? m.doctor_my_profile_preview_expired({}, options)
		: m.doctor_my_profile_preview_hidden({}, options);
}

/** One run of a sentence: its words and whether they are drawn bold. */
export type DoctorProfileTextRun = { text: string; strong: boolean };

/**
 * 🔴 D-W52-27 · D-W52-42 (`77-profile/shots/w-*-1440.png`, `78-photos/shots/w-full-1440.png`): a footnote of «Το προφίλ
 * μου» with «Ρυθμίσεις ιατρείου» in bold — the sentence's own words, unchanged, cut around the name as the catalog
 * writes it (the account deletion's `emphasizeNames` way). Words alone: the web has no such page yet, so it is no link.
 * A sentence that does not hold the name stays whole.
 */
export function emphasizeDoctorOfficeSettings(
	sentence: string,
	locale: Locale
): DoctorProfileTextRun[] {
	const name = m.doctor_my_profile_foot_settings({}, { locale });
	const at = name ? sentence.indexOf(name) : -1;
	if (at < 0) return [{ text: sentence, strong: false }];
	return [
		{ text: sentence.slice(0, at), strong: false },
		{ text: name, strong: true },
		{ text: sentence.slice(at + name.length), strong: false }
	].filter((run) => run.text !== '');
}
