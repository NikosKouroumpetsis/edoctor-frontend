import { m } from '$paraglide/messages.js';
import type { ImageCropRules, ImageFileIssue, ImageFileRules } from '$shared/lib/image';
import type {
	DoctorPhotoFailure,
	DoctorProfileImageFacts
} from '$modules/doctor-dashboard/api/images';

type Locale = 'el' | 'en';

/** 🔴 U-206 · D-W52-29: a doctor holds at most 20 photos (the server's own limit; the 21st is refused there too). */
export const DOCTOR_PHOTO_LIMIT = 20;

// The least a photo may hold, in ITS OWN pixels (the server's `DOCTOR_PROFILE_IMAGE_MIN_DIMENSIONS`) — a fact of the
// picture, never a size of the page.
const LEAST_PIXELS_ACROSS = 800;
const LEAST_PIXELS_DOWN = 600;

/**
 * 🔴 U-206 · D-W52-30 / 38: what a photo must be before it is sent — a JPG, a PNG or a WebP (the web converts nothing:
 * HEIC is the application's), 10 MB at most, at least 800 × 600 pixels. The server checks all of it again.
 */
export const DOCTOR_PHOTO_FILE_RULES: ImageFileRules = {
	types: ['image/jpeg', 'image/png', 'image/webp'],
	maxBytes: 10 * 1024 * 1024,
	minWidth: LEAST_PIXELS_ACROSS,
	minHeight: LEAST_PIXELS_DOWN
};

/** The file input's `accept`, the same three types. */
export const DOCTOR_PHOTO_ACCEPT = DOCTOR_PHOTO_FILE_RULES.types.join(',');

/**
 * 🔴 D-W52-40: «Προσαρμογή» cuts in 4:3 — the shape the server stores and every page draws — and never under the
 * 800 × 600 the server accepts.
 */
export const DOCTOR_PHOTO_CROP_RULES: ImageCropRules = {
	aspect: 4 / 3,
	minWidth: DOCTOR_PHOTO_FILE_RULES.minWidth,
	minHeight: DOCTOR_PHOTO_FILE_RULES.minHeight
};

/**
 * Why a photo is not on the page: the four reasons the page has words for (U-206, `78-photos.html` «Σφάλματα») and
 * `failed`, a write that may be tried again («Δεν ανέβηκε» · «Ξανά»).
 */
export type DoctorPhotoIssue = 'limit' | 'small' | 'large' | 'type' | 'failed';

/** A file the device's own check refused, in the page's reasons. */
export function doctorPhotoIssueOfFile(issue: ImageFileIssue): DoctorPhotoIssue {
	if (issue === 'size') return 'large';
	return issue === 'dimensions' ? 'small' : 'type';
}

/**
 * 🔴 D-W52-38: the server's refusal in the SAME reasons as the device's check — its codes map to the same words; a
 * refusal it gives no words for (too many writes, a lost request, no answer) is `failed`, the one that offers «Ξανά».
 */
export function doctorPhotoIssueOf(failure: DoctorPhotoFailure): DoctorPhotoIssue {
	return failure === 'limit' || failure === 'small' || failure === 'large' || failure === 'type'
		? failure
		: 'failed';
}

/** Whether trying the same file again can ever pass: only a write nobody refused for what the file IS. */
export function doctorPhotoIssueRetries(issue: DoctorPhotoIssue): boolean {
	return issue === 'failed';
}

/** 🔴 U-140: the page's own words for a reason (`78-photos.html`), `null` for `failed` — the tile says «Δεν ανέβηκε». */
export function doctorPhotoIssueText(issue: DoctorPhotoIssue, locale: Locale): string | null {
	const options = { locale };
	switch (issue) {
		case 'limit':
			return m.doctor_photos_error_limit({}, options);
		case 'small':
			return m.doctor_photos_error_small({}, options);
		case 'large':
			return m.doctor_photos_error_large({}, options);
		case 'type':
			return m.doctor_photos_error_type({}, options);
		case 'failed':
			return null;
	}
}

/**
 * 🔴 D-W52-29: how many more photos fit — 20 less the stored ones and less those already on their way (a failed one
 * still holds its place until it is sent again or taken away); never under zero.
 */
export function doctorPhotoRoom(stored: number, pending: number): number {
	return Math.max(0, DOCTOR_PHOTO_LIMIT - Math.max(0, stored) - Math.max(0, pending));
}

/** The server's words for a photo in the page's language (D-W52-33), else «Φωτογραφία N από M». */
export function doctorPhotoAlt(
	image: DoctorProfileImageFacts,
	position: number,
	count: number,
	locale: Locale
): string {
	return image.alt[locale] ?? m.doctor_photos_position({ position, count }, { locale });
}

/** The keys that move the focused photo (D-W52-39): towards the start, towards the end. */
const EARLIER = ['ArrowLeft', 'ArrowUp'];
const LATER = ['ArrowRight', 'ArrowDown'];

/**
 * 🔴 D-W52-39: where an arrow takes the photo at `index` of `count` — one place towards the start or the end; `null`
 * for another key, and at either end (the first cannot go before itself).
 */
export function doctorPhotoArrowTarget(key: string, index: number, count: number): number | null {
	const step = EARLIER.includes(key) ? -1 : LATER.includes(key) ? 1 : 0;
	const target = index + step;
	return step === 0 || target < 0 || target >= count ? null : target;
}

/** A box on the screen, as `getBoundingClientRect` gives it. */
export type DoctorPhotoBox = { left: number; top: number; right: number; bottom: number };

/**
 * 🔴 D-W52-39: the photo the pointer is over while another is dragged — the first OTHER tile whose box holds the
 * point; `null` over the dragged one's own place, a gap or outside the grid (the order then stays as it is).
 */
export function doctorPhotoDropTarget(
	point: { x: number; y: number },
	tiles: readonly { id: string; box: DoctorPhotoBox }[],
	draggedId: string
): string | null {
	const over = tiles.find(
		({ id, box }) =>
			id !== draggedId &&
			point.x >= box.left &&
			point.x <= box.right &&
			point.y >= box.top &&
			point.y <= box.bottom
	);
	return over?.id ?? null;
}

/** Whether two orders name the same photos in the same places. */
export function sameDoctorPhotoOrder(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((id, index) => id === b[index]);
}
