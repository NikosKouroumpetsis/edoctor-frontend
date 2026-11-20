import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorLinkValues } from '$modules/doctor-dashboard/lib/links';

/**
 * The page of the four links (screen 82, D-W52-70): the page's language, where «‹» leads (screen 82, resolved by the
 * page that holds it), and what happens when the links are saved or the page is left.
 */
export type DoctorNetworksProps = {
	locale: SupportedLocale;
	languagesHref: string;
	onClose: () => void;
};

/** Where the page stands: the links are on their way; the read failed; or the doctor may write. */
export type DoctorNetworksState = 'loading' | 'failed' | 'ready';

/**
 * The page's memory of the last refused save (D-W52-67), by field: the link as it left and the form's key for its
 * words — said under that field for as long as it holds that very link. The page's own words, never the answer.
 */
export type DoctorNetworksRefused = Partial<
	Record<keyof DoctorLinkValues, { link: string | null; key: string }>
>;
