import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorProfilePreviewAnswer } from '$modules/doctor-dashboard/api/profile';

/**
 * «Δείτε πώς σας βλέπουν» (D-W52-26): the band and the read are the dashboard's; the page under the band is the public
 * profile's own, which the screen composes (a module never imports another) — it hands in the reader of the server's
 * answer and the two things to draw with what was read.
 */
export type DoctorProfilePreviewProps<Profile> = {
	locale: SupportedLocale;
	/** The public profile's reader of its answer (the `doctor` module's); `null` for a page that cannot be drawn. */
	read: (answer: DoctorProfilePreviewAnswer) => Profile | null;
	/** The public page with the facts read, and the server's «now» of the read. */
	page: Snippet<[{ profile: Profile; readAt: number }]>;
	/** What the public page shows for a doctor it cannot draw («δεν βρέθηκε»), the `doctor` module's own. */
	missing: Snippet;
};

/** Where the preview's read stands: on its way, without an answer, a page to draw, or none to draw. */
export type DoctorProfilePreviewView = 'loading' | 'failed' | 'ready' | 'missing';
