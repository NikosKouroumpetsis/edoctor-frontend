import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorAppointmentOutcome } from '$modules/doctor-dashboard/api/appointments';
import type { DoctorTodayCard, DoctorTodayGroup } from '$modules/doctor-dashboard/lib/today';

/**
 * A one-tap answer (D-W51-25): «Επιβεβαίωση», «Δεν ήρθε», «Ολοκληρώθηκε» — and on screen 68 «Ήρθε, είναι ακόμα στο
 * ιατρείο» (`ARRIVED`, D-W51-61).
 */
export type DoctorCardAnswer = 'confirm' | DoctorAppointmentOutcome;

/** One appointment's card on screens 66 and 67: its words, where it stands, its answers. */
export type DoctorCardProps = {
	card: DoctorTodayCard;
	group: DoctorTodayGroup;
	/** The answer on its way for this card, if any: its button waits, the others too. */
	answering: DoctorCardAnswer | null;
	onAnswer: (answer: DoctorCardAnswer) => void;
	locale: SupportedLocale;
	/** The page's test ids (`<prefix>-card`, `<prefix>-confirm` …): «Σήμερα»'s by default. */
	testIdPrefix?: string;
	/** 🔴 D-W51-36: screen 68's address (resolved by the screen): the whole card opens it. */
	href?: string;
	/** 🔴 D-W51-49: screen 69's «Απόρριψη αιτήματος» of a request (resolved by the screen), drawn with `actions.reject`. */
	rejectHref?: string;
	/** 🔴 D-W51-51: screen 70's «Αλλαγή ώρας» of a request (resolved by the screen), drawn with `actions.move`. */
	moveHref?: string;
	/** The one open beside the list of 67 (from 1128 its border is dark). */
	selected?: boolean;
	/** From 1128 it opens beside the list: the page keeps its scroll and the card its focus. */
	inPlace?: boolean;
};
