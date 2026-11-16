import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The join's one address, in the page's language and resolved by the screen: the record's card it came from. */
export type DoctorMergeLinks = { card: string };

/** 🔴 U-198.2 · D-W51-67 (screen 73's join): the page's language, the doctor's record the address names, its card. */
export type DoctorMergeProps = {
	locale: SupportedLocale;
	recordId: string;
	links: DoctorMergeLinks;
};

/** What the screen draws: its wait, the question, a record not the doctor's, a read that failed, a join not possible. */
export type DoctorMergeState = 'loading' | 'ready' | 'missing' | 'failed' | 'closed';
