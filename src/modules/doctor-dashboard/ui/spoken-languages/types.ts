import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * The choice of the languages the doctor speaks (screen 82, D-W52-69): the page's language, where «‹» leads (screen
 * 82, resolved by the page that holds it), and what happens when the choice is saved or left.
 */
export type DoctorSpokenLanguagesProps = {
	locale: SupportedLocale;
	languagesHref: string;
	onClose: () => void;
};

/** Where the page stands: the catalogue or the doctor's languages are on their way; a read failed; or the doctor may choose. */
export type DoctorSpokenLanguagesState = 'loading' | 'failed' | 'ready';
