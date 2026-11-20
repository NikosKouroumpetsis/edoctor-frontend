import type { ApiResponseData } from '$shared/lib/api-client';

/** `GET /doctor/profile/images` as the contract writes it (D-W52-36); it stays inside `api/`. */
export type DoctorProfileImagesView = ApiResponseData<'listDoctorProfileImages', 200>;

/** One image of the list, the contract's `DoctorImageViewExt`. */
export type DoctorProfileImageView = DoctorProfileImagesView[number];

/**
 * FACTS of one photo of the doctor's page (screen 78, D-W52-31 / 33): the server's id, the two stored sizes a page draws
 * — each a centre cut in 4:3, `medium` 800 × 600 and `large` 1200 × 900, as addresses the browser can ask for, `null`
 * for one that is no address — and the words the server wrote for a reader, by language. The list's order is the
 * server's: the first is the main one.
 */
export type DoctorProfileImageFacts = {
	id: string;
	mediumUrl: string | null;
	largeUrl: string | null;
	alt: { el: string | null; en: string | null };
};

/**
 * Why the server refused a write of the photos (D-W52-29 / 30 / 31, `w52-b2` §8): the session ended; the 21st photo;
 * fewer than 800 × 600 pixels; heavier than 10 MB; no JPG, PNG or WebP; a photo the server no longer has, or a list that
 * is no longer the doctor's (`gone`: read the list again); too many writes; no licence; else nobody decided.
 */
export type DoctorPhotoFailure =
	| 'session'
	| 'limit'
	| 'small'
	| 'large'
	| 'type'
	| 'gone'
	| 'rate-limited'
	| 'forbidden'
	| 'unknown';

/** What a write of a file tells while it travels. */
export type DoctorPhotoSendOptions = {
	signal?: AbortSignal;
	/** How much of the file has left the browser, `0…1`. */
	onProgress?: (fraction: number) => void;
};
