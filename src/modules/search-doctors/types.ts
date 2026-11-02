import type { SearchDoctorsCriteria } from './lib/search-criteria';

export type CategoryId =
	| 'all'
	| 'internal-medicine'
	| 'pediatrics'
	| 'cardiology'
	| 'dermatology'
	| 'online';

/** The application's three home sections (`homeSectionConfigs`, U-20). */
export type SectionId = 'popular-athens' | 'popular-psychologists' | 'internal-medicine-gp';

export type CategorySeed = {
	id: CategoryId;
};

/**
 * What a card says about the price (the application's `SearchDoctorsCardFee`): «Από 60 €», «Συνδεθείτε για
 * κόστος» while pricing is hidden (a guest), or «Επικοινωνία για κόστος» without a simple-visit price.
 */
export type DoctorCardFee = { kind: 'amount' | 'login' | 'on-request'; label: string };

/**
 * The home's doctor card (U-20), every line already in the page's language: built from the backend marketplace
 * card (`card-adapter.ts`). It carries no category `tags`: category scoping is server-side.
 */
export type DoctorCard = {
	id: string;
	doctorSlug: string;
	name: string;
	specialty: string;
	/** The office's area (its city), the second half of «Ειδικότητα · Περιοχή». */
	area: string;
	/** «Σήμερα · 17:30», «Αύριο · 09:00», «Πέμ 30 Οκτ · 10:00» on the Greek clock (S-32.9), or empty. */
	availabilityLabel: string;
	fee: DoctorCardFee;
	/** «4,9», or «Νέο» for a doctor nobody has reviewed yet (S-31.1). */
	ratingLabel: string;
	/** 🔴 U-45.2: «Επιλογή ασθενών» only when the backend marks the doctor (`isPatientsChoice: true`). */
	badgeLabel?: string;
	/** The photo, or `null` for the no-photo silhouette. */
	imageUrl: string | null;
};

/**
 * A results card (U-24.1): the home's card and the application's list facts, every line in the page's language —
 * the description, the full address (with the distance on «Κοντά μου»), the number of reviews — and what the map
 * draws from the SAME card (D-103: no read of its own): the office's point and the pin's price.
 */
export type SearchResultCard = DoctorCard & {
	/** The description excerpt (two lines on the card), or `null`. */
	description: string | null;
	/** «Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι» (+ «· 0,6 χλμ»), or empty. */
	address: string;
	/** «184», or `null` without reviews («★ Νέο»). */
	reviewCountLabel: string | null;
	/** The office's point, or `null`: no pin for a doctor without coordinates (§7.1). */
	point: { latitude: number; longitude: number } | null;
	/** The pin's price, «60 €», or `null`: a dot while the fee needs sign-in or is not stated (§7.1). */
	pinLabel: string | null;
};

/** A home section resolved to display cards, with the criteria its «→» opens (`null`: hidden section). */
export type HomeSection = {
	id: SectionId;
	doctors: DoctorCard[];
	criteria: SearchDoctorsCriteria | null;
};

/**
 * A streamed «Όλοι» row as the page shows it (U-32.1: built on the server from the api's facts, `lib/section-link`):
 * its cards and the criteria its «→» opens, or its failure. The promise never rejects.
 */
export type HomeRowResult =
	| { status: 'ok'; doctors: DoctorCard[]; criteria: SearchDoctorsCriteria | null }
	| { status: 'error' };

export type StreamedHomeRow = {
	id: SectionId;
	/** Streamed promise: pending -> skeleton, resolved -> cards (or the error / empty state). */
	result: Promise<HomeRowResult>;
};

/** Shape returned by the home `+page.server.ts` load and threaded to the discovery screen. */
export type HomePageData = {
	categories: CategorySeed[];
	sections: StreamedHomeRow[];
	/** The server's «now» when it rendered the page (D-118: the category rows' day words follow the server). */
	serverNow: number;
};
