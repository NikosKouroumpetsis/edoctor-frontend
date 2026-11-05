import type { Snippet } from 'svelte';
import type { ResolvedPathname } from '$app/types';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { SignInRequest } from '$shared/state/session';
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

/** Where «Πώς λειτουργούν οι κριτικές» leads (U-67.1, U-69.2): pages of other modules, the screen's addresses. */
export type DoctorReviewLinks = { helpHref: string; policyHref: string };

/** U-75 Π3: where the pages of «Τι πρέπει να γνωρίζετε» lead: the Help Centre's, the screen's addresses. */
export type DoctorKnowLinks = { cancellationHref: string; bookingHref: string };

/** 🔴 U-85: the profile's hearts (the search module's one writer, composed by the screen): saved, and the press. */
export type DoctorFavorite = {
	saved: boolean;
	/** The heart has just filled: its «pop» plays. */
	pop: boolean;
	onToggle: () => void;
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
	/** Whether the reader is a member (U-80.1 Ε6: known in the browser, so the server's page is always a guest's). */
	signedIn: boolean;
	/** The sign-in over the page (U-27.4, U-80.1); what asked for it goes on after it (Ε4). */
	onSignIn: (request?: SignInRequest) => void;
	reviewLinks: DoctorReviewLinks;
	knowLinks: DoctorKnowLinks;
	/** 🔴 U-77.1: the doctor's articles, after the biography: the articles module's, composed by the screen. */
	articles?: Snippet;
	/**
	 * 🔴 U-84.6: «Επικοινωνήστε με τον γιατρό», under the summary's rows: the messages module's, composed by the screen. It
	 * asks the server nothing to be drawn (D-103).
	 */
	contact?: Snippet;
	/** Without it (a doctor the read names no id for, a slice alone) a heart only asks for the sign-in. */
	favorite?: DoctorFavorite;
};

/** 🔴 U-73 (screen 16): the doctor's own page: the route's load, the page's language, the site's addresses. */
export type DoctorAboutPageProps = {
	load: DoctorDetailPageProps['load'];
	locale: SupportedLocale;
	canonicalUrl: string;
	alternateUrls: Record<SupportedLocale, string>;
	doctorsHref: ResolvedPathname;
	profileHref: ResolvedPathname;
	reviewsHref: ResolvedPathname;
	/** «Περισσότερα» of a review: the reviews' window, on it (U-66.1 Π11). */
	onOpenReview: (reviewId: string) => void;
	/** The way in names the biography (`#bio`). */
	focusBio: boolean;
	/** 🔴 U-77.1: the doctor's articles, the articles module's, composed by the screen; its title the page's. */
	articles?: Snippet<[string]>;
	/** 🔴 U-84.6: «Επικοινωνήστε με τον γιατρό», under the rows and the links, before the text (Π9). */
	contact?: Snippet;
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
