import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorCredentialKind } from '$modules/doctor-dashboard/api/credentials';

/**
 * The page of ONE row of the biography (screen 81, D-W52-63): the page's language, the row's group and the server's id
 * (`null`: «Προσθήκη», a row that does not exist yet), where «‹» leads (screen 81, resolved by the page that holds
 * it), and what happens when the row is saved, deleted or left.
 */
export type DoctorCredentialProps = {
	locale: SupportedLocale;
	kind: DoctorCredentialKind;
	id: string | null;
	cvHref: string;
	onClose: () => void;
};

/**
 * Where the page stands: the biography is on its way; the read failed; the row is no longer there (`missing`); the
 * group already holds its twenty (`full`: nothing to add); or the doctor may write.
 */
export type DoctorCredentialState = 'loading' | 'failed' | 'missing' | 'full' | 'ready';
