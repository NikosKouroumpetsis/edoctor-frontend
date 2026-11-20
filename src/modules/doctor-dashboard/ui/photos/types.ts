import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorPhotoIssue } from '$modules/doctor-dashboard/lib/photos';

/** Every address the photos' page leads to, resolved by the page that holds it in the page's language. */
export type DoctorPhotosLinks = {
	/** «‹» below 950: «Το προφίλ μου», the list. */
	profile: string;
	/** «Προσαρμογή» of one photo, a page of its own (U-102). */
	crop: (imageId: string) => string;
};

/** «Φωτογραφίες» (screen 78): the page's language and its addresses; its facts are the browser's own read. */
export type DoctorPhotosProps = {
	locale: SupportedLocale;
	links: DoctorPhotosLinks;
};

/** Where the page's read stands: on its way, without an answer, or answered. */
export type DoctorPhotosView = 'loading' | 'failed' | 'ready';

/**
 * One picked file on its way to the server (D-W52-38): waiting for its turn, being sent (how much of it has left), or
 * not sent — with the reason when the file itself was refused (`null`: it may be tried again).
 */
export type DoctorPhotoUpload = {
	id: number;
	/** The picked file itself, shown in its tile while it travels (an address of this tab only). */
	preview: string;
	status: 'waiting' | 'sending' | 'failed';
	progress: number;
	issue: DoctorPhotoIssue | null;
};

/** A picked file the device's own check refused: its name and the page's words for the reason. */
export type DoctorPhotoRejection = { id: number; name: string; text: string };
