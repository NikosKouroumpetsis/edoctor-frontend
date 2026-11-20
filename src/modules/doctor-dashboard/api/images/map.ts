import { resolveMediaUrl } from '$shared/lib/http';
import { isUuid } from '$shared/lib/ids';
import type { DoctorProfileImageFacts } from './types';

// The server keeps 20 at most (D-W52-29); a doctor of before the limit may hold more, which the page still has to show
// so that they can be deleted. Beyond this a list is a broken answer, cut here.
const MAX_IMAGES = 100;
const MAX_URL = 2048;
/** The server's own bound of an image's words (`IMAGE_ALT_MAX_LENGTH`). */
const MAX_ALT = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * U-65.6: a stored picture's address as a page may draw it — a path of the API's own host (`/uploads/…`, never `//…`)
 * or an `http(s)` address of the storage, short enough to be one; anything else (another scheme, script, no text) is
 * no address at all.
 */
function address(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed || trimmed.length > MAX_URL || /\s/u.test(trimmed)) return null;
	const own = trimmed.startsWith('/') && !trimmed.startsWith('//');
	if (!own && !/^https?:\/\/[^/]/iu.test(trimmed)) return null;
	return resolveMediaUrl(trimmed);
}

/** The words of one language, as plain text of the server's own bound; none for anything else. */
function altOf(translations: unknown, language: 'el' | 'en'): string | null {
	if (!Array.isArray(translations)) return null;
	const entry = translations.find((item) => isRecord(item) && item.language === language);
	const alt = isRecord(entry) ? entry.alt : null;
	return typeof alt === 'string' && alt.trim() && alt.trim().length <= MAX_ALT ? alt.trim() : null;
}

/**
 * U-65.6: one image read field by field — without a server id it is no image (`null`); an address that is no address
 * is none (the tile still stands, so the photo can be deleted); the words are plain text or none.
 */
export function mapDoctorProfileImage(view: unknown): DoctorProfileImageFacts | null {
	if (!isRecord(view) || typeof view.id !== 'string' || !isUuid(view.id)) return null;
	return {
		id: view.id,
		mediumUrl: address(view.mediumSizeUrl),
		largeUrl: address(view.lgSizeUrl),
		alt: { el: altOf(view.translations, 'el'), en: altOf(view.translations, 'en') }
	};
}

/**
 * U-65.6: the list in the server's order (the first is the main one). An answer that is no list is `null`, a failed
 * read; an entry that is no image, or an id met twice, is left out; the list is cut at its bound.
 */
export function mapDoctorProfileImages(view: unknown): DoctorProfileImageFacts[] | null {
	if (!Array.isArray(view)) return null;
	const seen = new Set<string>();
	const images: DoctorProfileImageFacts[] = [];
	for (const entry of view.slice(0, MAX_IMAGES)) {
		const image = mapDoctorProfileImage(entry);
		if (!image || seen.has(image.id)) continue;
		seen.add(image.id);
		images.push(image);
	}
	return images;
}
