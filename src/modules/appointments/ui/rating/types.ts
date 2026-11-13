import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { InfoDialogBlock, InfoDialogLink } from '$shared/ui/templates/info-dialog';
import type { RatingPreviewCard } from '$modules/appointments/lib/rating';
import type {
	AppointmentDoctorFacts,
	AppointmentsLinks,
	AppointmentsViewer
} from '$modules/appointments/types';
import type { AppointmentDetailRead } from '$modules/appointments/ui/detail';
import type { RatingInvitationRead } from './hooks/use-invitation.svelte';

/**
 * Screen 54 «Κριτική επίσκεψης» (record §10, U-138; P-W4 §4.5): the invitation the address names, the visit it rates,
 * its doctor, and what only the screen may compose — the name the review will carry and its preview (the doctor's
 * profile, D-W4-25 / D-W4-26), «Πώς λειτουργούν οι κριτικές» (D-W4-24) and the review policy.
 */
export type AppointmentRatingProps = {
	locale: SupportedLocale;
	viewer: AppointmentsViewer;
	/** The invitation's read (this slice's `useRatingInvitation`). */
	read: RatingInvitationRead;
	/** Its visit (screen 51's read), once the invitation names it. */
	visit: AppointmentDetailRead;
	/** The visit's doctor (D-W4-29): `undefined` while read, `null` for nobody to show. */
	doctor: AppointmentDoctorFacts | null | undefined;
	links: AppointmentsLinks;
	/** The browser has no network: with nothing read yet, the page says it failed. */
	offline: boolean;
	/**
	 * 🔴 D-W4-26: the name the review will carry («Ελένη Π.»), the server's own (`patientName`, `patientInitial`) written
	 * by the profile's rule — composed by the screen; `null` when the server named none (its line and the preview go).
	 */
	authorName: string | null;
	/**
	 * U-138.4 · D-W4-25: «Έτσι θα φαίνεται στο προφίλ του γιατρού» — the profile's own card of a review written now, by
	 * the screen from the doctor's builder; `null` without the server's name.
	 */
	previewOf: (draft: { stars: number; body: string }) => RatingPreviewCard | null;
	/** D-W4-24: the profile's «Πώς λειτουργούν οι κριτικές», its words and its ways on. */
	how: { blocks: readonly InfoDialogBlock[]; links: readonly InfoDialogLink[] };
	/** «Πολιτική κριτικών» (the legal page). */
	policyHref: string;
	onSignIn: () => void;
	/** The session's read failed: the screen asks it again. */
	onRetrySession: () => void;
};
