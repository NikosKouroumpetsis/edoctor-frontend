/**
 * Wire types for the public doctor marketplace (`GET /api/v1/doctor/public/*`).
 *
 * The response ("View") types and the availability/sort enums come from the
 * backend's OpenAPI contract via generated types. Modules may not import
 * `$generated/api` directly, so the wire types are re-exported through the shared
 * client layer (`$shared/lib/api-client`) and aliased here to the names the
 * feature already uses. `card-adapter.ts` maps `DoctorPublicMarketplaceCardView`
 * into the card's facts (`SearchDoctorsCardFacts`, below); the card's words are
 * `lib/doctor-card`'s (U-32.1, the application's model).
 *
 * The request/transport types below (`MarketplaceRequestContext`,
 * `MarketplaceSearchParams`, `MarketplaceNearbyParams`) are app-facing input
 * contracts, not server-response mirrors: they intentionally model `lat`/`lng`/
 * `limit` as numbers and slug/id lists as `string[]` (the contract's query
 * params are all strings, a serialization detail owned by `$shared/lib/http`).
 * They stay hand-written and feature-owned.
 */

import type {
	DoctorPublicMarketplaceAvailability,
	DoctorPublicMarketplaceCardView as WireDoctorPublicMarketplaceCardView,
	DoctorPublicMarketplaceFacetOptionView,
	DoctorPublicMarketplaceFacetsResponseView,
	DoctorPublicMarketplaceGender,
	DoctorPublicMarketplaceLocationSuggestionsResponseView,
	DoctorPublicMarketplaceLocationSuggestionView,
	DoctorPublicMarketplacePageInfo,
	DoctorPublicMarketplacePaymentOption,
	DoctorPublicMarketplaceSearchResponseView,
	DoctorPublicMarketplaceSort,
	DoctorPublicMarketplaceSuggestionsResponseView,
	DoctorPublicMarketplaceSuggestionView
} from '$shared/lib/api-client';
import type { SectionId } from '$modules/search-doctors/types';

export type MarketplaceAvailability = DoctorPublicMarketplaceAvailability;

export type MarketplaceSortBy = DoctorPublicMarketplaceSort;

/** The payment methods an office takes (the contract's enum, the application's `MarketplacePaymentOption`). */
export type MarketplacePaymentOption = DoctorPublicMarketplacePaymentOption;

/** The practitioner gender filter; `ANY` is no filter and never sent (the application's `MarketplaceGender`). */
export type MarketplaceGender = DoctorPublicMarketplaceGender;

export type DoctorPublicMarketplaceCardView = WireDoctorPublicMarketplaceCardView;

export type MarketplacePageInfo = DoctorPublicMarketplacePageInfo;

export type MarketplaceSearchData = DoctorPublicMarketplaceSearchResponseView;

export type MarketplaceFacetEntry = DoctorPublicMarketplaceFacetOptionView;

export type MarketplaceFacetsData = DoctorPublicMarketplaceFacetsResponseView;

export type MarketplaceSuggestionItem = DoctorPublicMarketplaceSuggestionView;

export type MarketplaceSuggestionsData = DoctorPublicMarketplaceSuggestionsResponseView;

export type MarketplaceLocationSuggestion = DoctorPublicMarketplaceLocationSuggestionView;

export type MarketplaceLocationSuggestionsData =
	DoctorPublicMarketplaceLocationSuggestionsResponseView;

/**
 * Per-request transport context threaded into every marketplace endpoint. The SSR
 * streaming `load` passes SvelteKit's `fetch`; client-side TanStack Query calls omit it
 * and fall back to the global `fetch`. `signal` carries query cancellation.
 */
export type MarketplaceRequestContext = {
	signal?: AbortSignal;
	fetch?: typeof fetch;
};

/**
 * Full marketplace search parameter set (the application's `MarketplaceSearchParams`). Every field is optional so
 * the same call serves the home sections (`limit`), the results (`cursor` pages) and the filters' live count. The
 * price bounds are set only when the facets say `pricingVisible` (a guest never sends them).
 */
export type MarketplaceSearchParams = {
	text?: string;
	serviceSlugs?: string[];
	professionalIds?: string[];
	/** Specialty slugs, unioned with `professionalIds` by the backend; preferred when known. */
	professionalSlugs?: string[];
	locationSlug?: string;
	lat?: number;
	lng?: number;
	availability?: MarketplaceAvailability;
	sortBy?: MarketplaceSortBy;
	/** MALE / FEMALE only: `ANY` is never sent. */
	gender?: MarketplaceGender;
	paymentOptions?: MarketplacePaymentOption[];
	speakLanguageCodes?: string[];
	priceMin?: number;
	priceMax?: number;
	/** Sent as `true` only when on: a serialized `false` would still filter. */
	disabilityAccess?: boolean;
	parking?: boolean;
	limit?: number;
	cursor?: string;
	lang?: string;
};

/**
 * `GET /doctor/public/doctors/facets` (the application's `MarketplaceFacetsParams`): the search's scope and filters
 * without pages or sort; a bare `{ lang }` serves the resolvers and the popular specialties.
 */
export type MarketplaceFacetsParams = Omit<MarketplaceSearchParams, 'sortBy' | 'limit' | 'cursor'>;

/**
 * Values the suggestions endpoint accepts for its `types` param and a suggestion item's discriminant (the
 * application's `MarketplaceSuggestionType`); `professional` is a specialty.
 */
export type MarketplaceSuggestionType = 'professional' | 'service' | 'doctor';

/**
 * `GET /doctor/public/doctors/suggestions` (the application's `DoctorSuggestionsParams`): `types` goes as a repeated
 * key, `limitPerType` caps each category on the server before the merge.
 */
export type DoctorSuggestionsParams = {
	query: string;
	lang?: string;
	types?: MarketplaceSuggestionType[];
	limitPerType?: number;
	limit?: number;
};

/**
 * `GET /doctor/public/locations/suggestions` (the application's `LocationSuggestionsParams`): `lat`/`lng` only when
 * a device fix is already known, so closer areas rank higher; without them the server ranks by relevance alone.
 */
export type LocationSuggestionsParams = {
	query: string;
	lang?: string;
	lat?: number;
	lng?: number;
};

export type MarketplaceNearbyParams = {
	lat: number;
	lng: number;
	serviceSlugs?: string[];
	professionalIds?: string[];
	availability?: MarketplaceAvailability;
	limit?: number;
	cursor?: string;
	lang?: string;
};

/**
 * The facts of a card's office (the application's `SearchDoctorsCardOfficeFacts`), as the server sends them: the
 * card's area and full address are `lib/doctor-card`'s words. `distanceKm` only on a «Κοντά μου» search (S-31.3).
 */
export type SearchDoctorsCardOfficeFacts = {
	city: string | null;
	street: string | null;
	streetNumber: string | null;
	distanceKm: number | null;
};

/** Where the office stands, in degrees: what the results map pins (U-24.4, §7.1). */
export type SearchDoctorsCardPoint = { latitude: number; longitude: number };

/** 🔴 U-45.2: a card's badge (the application's `SearchDoctorsCardBadgeId`): «Επιλογή ασθενών». */
export type SearchDoctorsCardBadgeId = 'patient-favorite';

/**
 * 🔴 U-32.1: a doctor card as FACTS (the application's `SearchDoctorsCardFacts`), no words and no display format:
 * the home's and the results' cards (`DoctorCard`, `SearchResultCard`) are built from them in `lib/doctor-card`.
 */
export type SearchDoctorsCardFacts = {
	id: string;
	doctorSlug: string;
	name: string;
	/** The specialty's name as the server writes it, empty without one. */
	professionalName: string;
	/** The photo as an absolute address (the medium size, then the small one), or `null`: the silhouette (S-32.8). */
	imageUrl: string | null;
	office: SearchDoctorsCardOfficeFacts | null;
	/** The office's point, or `null` without both coordinates: no pin (§7.1). */
	point: SearchDoctorsCardPoint | null;
	/** The description excerpt as sent (an older backend's missing one is `null`). */
	description: string | null;
	availability: { nextAvailableAt: string | null; hasToday: boolean; hasNext3Days: boolean };
	/** The average score (`0` when the server sends none) and the number of reviews (S-31.1: none ⇒ «Νέο»). */
	rating: number;
	reviewCount: number;
	/** The viewer may see prices (a guest may not: the sign-in words). */
	pricingVisible: boolean;
	/** The simple visit's price in euro when it is a finite number, else `null` («on request»). */
	primaryServicePrice: number | null;
	/** The server's «now» when the card was read (D-118): its day words («Σήμερα», «Αύριο») are told against it. */
	readAt: number;
	/** 🔴 U-45.2: `patient-favorite` only when the backend says `isPatientsChoice: true`; absent otherwise. */
	badgeId?: SearchDoctorsCardBadgeId;
};

/** A row's «Τι» for its «→» (the application's `SearchDoctorsSectionWhat`): one resolved professional, or words. */
export type SearchDoctorsSectionWhat =
	| { kind: 'professional'; label: string; id: string; slug: string }
	| { kind: 'text'; label: string };

/** A row's «Πού» for its «→» (the application's `SearchDoctorsSectionWhere`): the area its location resolved to. */
export type SearchDoctorsSectionWhere = {
	kind: 'location';
	label: string;
	slug: string;
	locationType?: string;
};

/**
 * The FACTS of what a row's «→» opens (U-20, the application's `SearchDoctorsSectionLink`): its «Τι», its «Πού» and its
 * availability, as resolved for its search; `lib/section-link` makes them the results' criteria.
 */
export type SearchDoctorsSectionLink = {
	availability: string;
	what: SearchDoctorsSectionWhat | null;
	where: SearchDoctorsSectionWhere | null;
};

/** One home row as facts (the application's `SearchDoctorsSection`): its cards and its link (`null`: hidden). */
export type SearchDoctorsSection = {
	id: SectionId;
	items: SearchDoctorsCardFacts[];
	link: SearchDoctorsSectionLink | null;
};
