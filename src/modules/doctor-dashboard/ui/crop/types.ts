import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * «Προσαρμογή» of one photo (screen 78, D-W52-40): the page's language, the photo the address names, where «‹» leads
 * (the photos, resolved by the page that holds it) and what happens when it is saved or left.
 */
export type DoctorPhotoCropProps = {
	locale: SupportedLocale;
	imageId: string;
	photosHref: string;
	onClose: () => void;
};

/**
 * Where the page stands: the photos are on their way, or the picture is; the read failed; the server has no such photo
 * of the doctor; the picture did not load (or its host does not let a canvas read it); it has too few pixels to cut;
 * or it may be cut.
 */
export type DoctorPhotoCropState =
	| 'loading'
	| 'failed'
	| 'missing'
	| 'unreadable'
	| 'small'
	| 'ready';
