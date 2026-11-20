import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * The choice of the specializations (screen 80, D-W52-59): the page's language, where «‹» leads (screen 80, resolved by
 * the page that holds it), what happens when the choice is saved or left, and where a specialty without a list goes.
 */
export type DoctorSpecializationsProps = {
	locale: SupportedLocale;
	specialtyHref: string;
	onClose: () => void;
};

/**
 * Where the page stands: the list or the picks are on their way; a read failed; the specialty has no list (nothing to
 * choose: the page leaves); or the doctor may choose.
 */
export type DoctorSpecializationsState = 'loading' | 'failed' | 'none' | 'ready';
