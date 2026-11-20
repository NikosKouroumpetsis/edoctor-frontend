import { m } from '$paraglide/messages.js';
import {
	DOCTOR_LINK_FIELDS,
	type DoctorLinkField,
	type DoctorLinkRefusal,
	type DoctorLinksFacts,
	type DoctorLinksFailure
} from '$modules/doctor-dashboard/api/links';
import {
	DOCTOR_LINK_MAX_LENGTH,
	DOCTOR_LINK_NETWORK_HOSTS
} from '$modules/doctor-dashboard/config';

type Locale = 'el' | 'en';

/** What the page of the four fields holds: each field as it is typed. */
export type DoctorLinkValues = Record<DoctorLinkField, string>;

const HTTPS_PREFIX = /^https:\/\//iu;
/** Any scheme written whole (`http://`, `ftp://`): it is kept as typed, so the rule can name it. */
const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:\/\//iu;
const AUTHORITY_END = /[/?#]/u;
const IPV4_HOST = /^\d{1,3}(\.\d{1,3}){3}$/u;
const DOTTED_HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/u;
/** The server's own hidden characters (`PlainTextPolicy`): control, zero-width, soft hyphen and bidi. */
const HIDDEN_CHARACTER =
	// eslint-disable-next-line no-control-regex
	/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/u;

function parse(link: string): URL | null {
	try {
		return new URL(link);
	} catch {
		return null;
	}
}

/**
 * 🔴 D-W52-70 (`82-langs.html`: «Αν λείπει το https://, το βάζουμε εμείς»; `sw.js` `soNorm`): a field as it is sent —
 * trimmed; `null` for an empty one; `https://` put in front of a link typed without any scheme. A link that names
 * another scheme (`http://`) is left as typed: the rule refuses it in its own words, it is never rewritten.
 */
export function normalizeDoctorLink(typed: string): string | null {
	const link = typed.trim();
	if (!link) return null;
	return SCHEME_PREFIX.test(link) ? link : `https://${link}`;
}

/** Whether `host`, as `new URL()` reads it, is one of the names of the network of `field`. */
function isHostOfNetwork(host: string, field: Exclude<DoctorLinkField, 'website'>): boolean {
	if (!DOTTED_HOST.test(host)) return false;
	return DOCTOR_LINK_NETWORK_HOSTS[field].some(
		(entry) => host === entry.host || (entry.subdomains && host.endsWith(`.${entry.host}`))
	);
}

/** A website lives on a name with a dot: no IP address (v4 or v6), no `localhost`, nothing under `.local`. */
function isPublicHost(host: string): boolean {
	if (!DOTTED_HOST.test(host) || IPV4_HOST.test(host)) return false;
	return !['localhost', 'local'].includes(host.split('.').pop() ?? '');
}

/**
 * 🔴 D-W52-67 / 70 · U-65.6: why the link of a field is refused BEFORE it is sent, else `null` — the server's own rule
 * (`DoctorSocialLinkPolicy.refusalOf`), applied to the field as it would be sent (`normalizeDoctorLink`); the server
 * checks it again. An empty field is no link and no refusal.
 * - at most 2000 characters; no space, backslash or hidden character;
 * - only `https://`; no `@` and no `%` before the path, no name or password inside;
 * - the host is the one `new URL()` reads (lower case, punycode), never a search in the text: a network's field takes
 *   only the names of that network — and the host typed must be that very name — a website a public name with a dot
 *   (no IP address, no `localhost`, nothing under `.local`).
 */
export function doctorLinkRefusal(field: DoctorLinkField, typed: string): DoctorLinkRefusal | null {
	const link = normalizeDoctorLink(typed);
	if (link === null) return null;
	if (link.length > DOCTOR_LINK_MAX_LENGTH) return 'TOO_LONG';
	if (/[\s\\]/u.test(link) || HIDDEN_CHARACTER.test(link)) return 'NOT_A_LINK';

	const url = parse(link);
	if (!HTTPS_PREFIX.test(link)) {
		return url && url.protocol !== 'https:' ? 'NOT_HTTPS' : 'NOT_A_LINK';
	}
	const authority = link.replace(HTTPS_PREFIX, '').split(AUTHORITY_END, 1)[0] ?? '';
	if (authority.includes('@')) return 'HAS_CREDENTIALS';
	if (!url || url.protocol !== 'https:' || !authority || authority.includes('%')) {
		return 'NOT_A_LINK';
	}
	if (url.username || url.password) return 'HAS_CREDENTIALS';

	const host = url.hostname;
	if (field === 'website') return isPublicHost(host) ? null : 'NOT_A_PUBLIC_HOST';
	const typedHost = authority.toLowerCase().replace(/:\d*$/u, '');
	return typedHost === host && isHostOfNetwork(host, field) ? null : 'NOT_OF_NETWORK';
}

/** A field's name: «Ιστοσελίδα», and the three networks by their own names (the same in every language). */
export function doctorLinkLabel(field: DoctorLinkField, locale: Locale): string {
	switch (field) {
		case 'website':
			return m.doctor_links_website({}, { locale });
		case 'facebook':
			return 'Facebook';
		case 'instagram':
			return 'Instagram';
		case 'linkedin':
			return 'LinkedIn';
	}
}

/** What a field shows while it is empty and has the focus (`sw.js` `SO_KEYS`): how a link of it starts. */
export const doctorLinkExamples: Record<DoctorLinkField, string> = {
	website: 'https://…',
	facebook: 'https://www.facebook.com/…',
	instagram: 'https://www.instagram.com/…',
	linkedin: 'https://www.linkedin.com/in/…'
};

/**
 * 🔴 U-140 (`82-langs.html` «Λάθη»): the page's words for a refused link, under its own field — «Αυτός δεν είναι
 * σύνδεσμος Facebook.» for a link of another site, «Χρειάζεται ασφαλής σύνδεσμος (https://).» for another scheme,
 * «Έως 2000 χαρακτήρες.», and «Αυτό δεν είναι σύνδεσμος.» for every other reason.
 */
export function doctorLinkRefusalText(
	field: DoctorLinkField,
	refusal: DoctorLinkRefusal,
	locale: Locale
): string {
	const options = { locale };
	switch (refusal) {
		case 'NOT_OF_NETWORK':
			return m.doctor_links_error_network({ network: doctorLinkLabel(field, locale) }, options);
		case 'NOT_HTTPS':
			return m.doctor_links_error_https({}, options);
		case 'TOO_LONG':
			return m.doctor_links_error_length({ limit: DOCTOR_LINK_MAX_LENGTH }, options);
		case 'NOT_A_LINK':
		case 'HAS_CREDENTIALS':
		case 'NOT_A_PUBLIC_HOST':
			return m.doctor_links_error_link({}, options);
	}
}

const REFUSALS: readonly DoctorLinkRefusal[] = [
	'TOO_LONG',
	'NOT_A_LINK',
	'NOT_HTTPS',
	'HAS_CREDENTIALS',
	'NOT_OF_NETWORK',
	'NOT_A_PUBLIC_HOST'
];

/** Every refusal's words for every field, as the form reads them (`messages` of `createForm`). */
export function doctorLinkMessages(
	locale: Locale
): Record<DoctorLinkField, Record<string, string>> {
	const of = (field: DoctorLinkField) =>
		Object.fromEntries(
			REFUSALS.map((refusal) => [refusal, doctorLinkRefusalText(field, refusal, locale)])
		);
	return {
		website: of('website'),
		facebook: of('facebook'),
		instagram: of('instagram'),
		linkedin: of('linkedin')
	};
}

/** The four fields as the page opens: each link as the server keeps it, an empty field for none. */
export function toDoctorLinkValues(links: DoctorLinksFacts): DoctorLinkValues {
	return {
		website: links.website ?? '',
		facebook: links.facebook ?? '',
		instagram: links.instagram ?? '',
		linkedin: links.linkedin ?? ''
	};
}

export function emptyDoctorLinkValues(): DoctorLinkValues {
	return { website: '', facebook: '', instagram: '', linkedin: '' };
}

/**
 * 🔴 D-W52-70: what «Αποθήκευση» sends — each field as `normalizeDoctorLink` makes it; `null` when ANY field is still
 * refused by the rule (nothing leaves the page then).
 */
export function toDoctorLinks(values: DoctorLinkValues): DoctorLinksFacts | null {
	if (DOCTOR_LINK_FIELDS.some((field) => doctorLinkRefusal(field, values[field]) !== null)) {
		return null;
	}
	return {
		website: normalizeDoctorLink(values.website),
		facebook: normalizeDoctorLink(values.facebook),
		instagram: normalizeDoctorLink(values.instagram),
		linkedin: normalizeDoctorLink(values.linkedin)
	};
}

/**
 * 🔴 D-W52-70 · U-65.6 (`sw.js` `soShort`): a kept link as screen 82 WRITES it — its host without `www.` and its path
 * without the last slash («linkedin.com/in/eleni»), as plain text: only an `https` link is read; anything else is
 * written as it is. It is never an address the page opens.
 */
export function shortDoctorLink(link: string): string {
	const url = HTTPS_PREFIX.test(link) ? parse(link) : null;
	if (!url || url.protocol !== 'https:') return link;
	return `${url.hostname.replace(/^www\./u, '')}${url.pathname.replace(/\/$/u, '')}`;
}

/** One line of the row «Κοινωνικά δίκτυα»: the field's name and its link, short. */
export type DoctorLinkLine = { field: DoctorLinkField; label: string; link: string };

/** 🔴 D-W52-70 (`sw.js` `langsBody`): the fields that hold a link, in the page's order — «Ιστοσελίδα · example.gr». */
export function buildDoctorLinkLines(links: DoctorLinksFacts, locale: Locale): DoctorLinkLine[] {
	return DOCTOR_LINK_FIELDS.flatMap((field) => {
		const link = links[field];
		return link
			? [{ field, label: doctorLinkLabel(field, locale), link: shortDoctorLink(link) }]
			: [];
	});
}

/** «2 από 4»: how many of the four fields hold a link. */
export function doctorLinksCountText(count: number, locale: Locale): string {
	return m.doctor_my_specializations_count({ count, limit: DOCTOR_LINK_FIELDS.length }, { locale });
}

/** «Ιστοσελίδα, Facebook, Instagram, LinkedIn»: what the row says under «Κανένα ακόμη». */
export function doctorLinkNames(locale: Locale): string {
	return DOCTOR_LINK_FIELDS.map((field) => doctorLinkLabel(field, locale)).join(', ');
}

/**
 * 🔴 D-W52-70: the page's words, over its buttons, for a save the server refused WITHOUT naming a field — a body it
 * will not take; too many writes; anything else (a write that met another, one that was not allowed, the connection)
 * that the change was not saved. `session` has no words: the session's own page takes over.
 */
export function doctorLinksFailureText(
	reason: Exclude<DoctorLinksFailure['reason'], 'session'>,
	locale: Locale
): string {
	const options = { locale };
	switch (reason) {
		case 'invalid':
			return m.doctor_links_error_invalid({}, options);
		case 'rate-limited':
			return m.doctor_reason_rate_limited({}, options);
		case 'conflict':
		case 'forbidden':
		case 'unknown':
			return m.doctor_my_specializations_error_failed({}, options);
	}
}
