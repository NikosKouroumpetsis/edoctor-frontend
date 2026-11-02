import type { ResolvedPathname } from '$app/types';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorDetailSection,
	DoctorSimilarArea,
	DoctorSimilarSearch
} from '$modules/doctor/lib/detail';

/** The read that turns the active office's city into the catalogue's area (the search module's, the screen's). */
export type DoctorSimilarAreaQuery = (city: string) => {
	queryKey: readonly unknown[];
	queryFn: () => Promise<DoctorSimilarArea | null>;
	staleTime?: number;
};

/**
 * The profile page's props (the screen composes them: the route's load, the page's language, the site's addresses).
 * Two pages share the slice: the profile (`routeSection: null`) and a window's own address (`details/<section>`).
 */
export type DoctorDetailPageProps = {
	/** The route's load: the profile's facts (a missing profile or a failed read is the route's error page). */
	load: { state: 'ready'; profile: DoctorProfile; serverNow: number };
	locale: SupportedLocale;
	/** `details/<section>` when the page is a window's own address (it opens on it). */
	routeSection: DoctorDetailSection | null;
	/** A path of the site in the page's language (`localizeHref`), not yet resolved. */
	localize: (path: string) => string;
	/**
	 * 🔴 U-37.2: «Δείτε παρόμοιους γιατρούς» — the search's address (the search module's, composed by the screen): the
	 * specialty, and the area only as the catalogue's location (`area`), never as words.
	 */
	similarHref: (search: DoctorSimilarSearch, area: DoctorSimilarArea | null) => ResolvedPathname;
	similarAreaQuery: DoctorSimilarAreaQuery;
	/** The profile's absolute address on the site's public origin (canonical, Open Graph, the shared link). */
	canonicalUrl: string;
	/** The profile's absolute address in each language (`hreflang`). */
	alternateUrls: Record<SupportedLocale, string>;
	/** Where «‹» leads without a page of the site behind it (the results). */
	backHref: ResolvedPathname;
	/** The web has no session yet (U-20): every reader is a guest. */
	signedIn: boolean;
	/** The guest's sign-in (U-27.4, the cards' own). */
	onSignIn: () => void;
};

/** The profile's error page (the route's 404 or 503): its status and the ways on. */
export type DoctorDetailErrorProps = {
	status: number;
	locale: SupportedLocale;
	backHref: ResolvedPathname;
	/** A path of the site in the page's language (the 404's useful links, U-61.1); as it is by default. */
	href?: (path: string) => string;
	/** «Δοκιμάστε ξανά» of a failed read: the route's load again. */
	onRetry: () => void;
};
