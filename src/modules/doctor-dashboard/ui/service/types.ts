import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** Which service the page is: ONE of the doctor's (its server id), or a NEW one of the catalogue (the catalogue's id). */
export type DoctorServiceSubject =
	| { view: 'service'; id: string }
	| { view: 'new'; serviceId: string };

/**
 * The page of ONE service (screen 83, D-W52-82): the page's language, which service it is, where «‹» leads (screen 83,
 * resolved by the page that holds it), and what happens when the service is saved, deleted or left.
 */
export type DoctorServiceProps = {
	locale: SupportedLocale;
	subject: DoctorServiceSubject;
	servicesHref: string;
	onClose: () => void;
};

/**
 * Where the page stands: its reads are on their way; a read failed; the service is no longer there (`missing`); the
 * new one is one the doctor already offers (`owned`); or the doctor may write.
 */
export type DoctorServiceState = 'loading' | 'failed' | 'missing' | 'owned' | 'ready';
