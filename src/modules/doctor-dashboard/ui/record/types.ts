import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** «Στοιχεία ασθενή»'s one address, in the page's language and resolved by the screen: the card it belongs to. */
export type DoctorRecordLinks = { card: string };

/** 🔴 D-W51-76 (screen 73 «Στοιχεία ασθενή»): the page's language, the doctor's record the address names, its card. */
export type DoctorRecordProps = {
	locale: SupportedLocale;
	recordId: string;
	links: DoctorRecordLinks;
};

/**
 * What the screen draws: its wait, the form, a record not the doctor's (the one 404), a read that failed, or a record
 * that no longer changes (joined to an account: its card answers the account's, D-W51-67).
 */
export type DoctorRecordState = 'loading' | 'form' | 'missing' | 'failed' | 'closed';
