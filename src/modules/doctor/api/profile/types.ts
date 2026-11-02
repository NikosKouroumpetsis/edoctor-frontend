/**
 * The doctor profile's FACTS (the application's `modules/doctor/api/profile/types`, S-01.6): what the backend
 * answers, already checked at the boundary (`map.ts`), with no localized copy and no formatting. Every word the page
 * shows is `lib/detail`'s (U-32.1). The application's demo-only facts (`detail`, `clinicName`, `areaLabel`,
 * `consultationMode`) have no source on the web: the web has no mock profile.
 */

export type DoctorSocialLinkId = 'website' | 'facebook' | 'instagram' | 'linkedin';

/** The five aspects the backend scores, published on the 5 stars (U-49: stored 1–10, answered ÷ 2). */
export type DoctorReviewChipId =
	| 'trust'
	| 'expertise'
	| 'punctuality'
	| 'friendliness'
	| 'in-depth';

/** A payment method an office takes, as the app's id (the wire enum is translated in `map.ts`). */
export type DoctorOfficePaymentOptionId =
	| 'card'
	| 'cash'
	| 'iris'
	| 'online-doctor-pay'
	| 'online-office-pay'
	| 'student-card'
	| 'unemployment-card';

/** One office as the tabs need it: the id the slots are asked with and the address parts. */
export type DoctorOfficeSummaryFacts = {
	officeId: string;
	city?: string;
	postalCode?: string;
	state?: string;
	street?: string;
	streetNumber?: string;
};

/**
 * One office's location facts (the profile's `selectedOffice`, or one office's own answer, U-39.1). Every part is
 * optional: the backend nulls them independently; `floor` 0 is the ground floor; the coordinates travel as a pair.
 */
export type DoctorOfficeFacts = {
	officeId?: string;
	city?: string;
	state?: string;
	street?: string;
	streetNumber?: string;
	postalCode?: string;
	/** Plain text, flattened from the backend's rich text at the boundary. */
	description?: string;
	phone?: string;
	floor?: number;
	parking?: boolean;
	disabilityAccess?: boolean;
	paymentOptions?: DoctorOfficePaymentOptionId[];
	latitude?: number;
	longitude?: number;
};

/** A fee as a range (the profile's one `price` per service is `min === max`). */
export type DoctorFeeFacts = { min: number; max: number };

export type DoctorAvailabilityFacts = {
	hasToday?: boolean;
	hasNext3Days?: boolean;
	nextAvailableAt?: string | null;
};

/**
 * One bookable service. `isSpecialized` (U-36.2): the doctor marked it as a field of expertise — the
 * «Τομείς εξειδίκευσης» are these services, as the server already sends them.
 */
export type DoctorServiceFacts = {
	id: string;
	title: string;
	priceRange: DoctorFeeFacts | null;
	includes?: string;
	note?: string;
	durationInMinutes?: number;
	isSpecialized: boolean;
};

export type DoctorBioFacts = {
	studies?: string[];
	workExperience?: string[];
	conferences?: string[];
};

/** A spoken language: its catalog slug (the app's names are keyed by it) and the backend's own name. */
export type DoctorLanguageFacts = { slug: string; name: string };

/** A published social profile; only `http(s)` reaches the facts (the boundary drops anything else). */
export type DoctorSocialLinkFacts = { id: DoctorSocialLinkId; url: string };

/** The description's paragraphs, in order (U-42.1: the first one is the summary's introduction). */
export type DoctorDescriptionFacts = { paragraphs: string[] };

export type DoctorReviewChipFacts = { id: DoctorReviewChipId; score: number };

/** One public review (the profile's preview and the reviews endpoint share it). */
export type DoctorReviewSnippet = {
	id: string;
	body: string;
	patientName: string;
	patientInitial: string;
	publishedAt: string;
	rating: number;
	aspects?: DoctorReviewChipFacts[];
};

export type DoctorReviewSummaryFacts = { count: number; score: number };

/** One photo of the profile: the sized addresses (absolute) and the backend's description, if any. */
export type DoctorImageFacts = {
	id: string;
	/** The medium photo (the gallery's square). */
	url: string;
	/** The large one (the one-photo viewer). */
	largeUrl: string;
	/** The small one (a thumbnail). */
	thumbUrl: string;
	alt?: string;
};

/** The doctor's specialty as the backend names it, with its ids (the «Δείτε παρόμοιους γιατρούς» search). */
export type DoctorProfessionalFacts = { id: string; name: string; slug: string };

/**
 * 🔴 U-36.1 / U-43.1 (app = web): the doctor's response and visits over the last 6 whole months (Greek time), the
 * application's `DoctorResponseMetricsFacts`, from `doctor.responseMetrics` (`map.ts` `buildResponseMetrics`; each
 * `null` leaves its fact out). The ids are the approved design's (§A.2 / §C.1 of `s5-backend-design.md`):
 * `WITHIN_HOUR` ⇒ `within-hour`, `WITHIN_FEW_HOURS` ⇒ `within-few-hours`, `WITHIN_DAY` ⇒ `within-day`, `FEW_DAYS` ⇒
 * `few-days`. «Άμεση επιβεβαίωση» is no metric: the active office's slots say it (U-43.2).
 */
export type DoctorResponseTimeId = 'within-hour' | 'within-few-hours' | 'within-day' | 'few-days';
export type DoctorResponseMetricsFacts = {
	responseTimeId?: DoctorResponseTimeId;
	responseRatePercent?: number;
	completedVisits?: number;
};

/**
 * The profile's FACTS. `office` is the profile's own office (the backend's `selectedOffice`, the main one);
 * `offices` every office, the main one first.
 */
export type DoctorProfile = {
	doctorId?: string;
	doctorSlug: string;
	name?: string;
	professional?: DoctorProfessionalFacts;
	images: DoctorImageFacts[];
	rating: number;
	reviewCount: number;
	reviewSummary?: DoctorReviewSummaryFacts;
	reviewChips?: DoctorReviewChipFacts[];
	reviewSnippets?: DoctorReviewSnippet[];
	pricingVisible: boolean;
	fee: DoctorFeeFacts | null;
	availability?: DoctorAvailabilityFacts;
	services?: DoctorServiceFacts[];
	office?: DoctorOfficeFacts;
	offices?: DoctorOfficeSummaryFacts[];
	description?: DoctorDescriptionFacts;
	bio?: DoctorBioFacts;
	languages?: DoctorLanguageFacts[];
	socialLinks?: DoctorSocialLinkFacts[];
	licenseNumber?: string;
	licenseObtainedDate?: string;
	memberSince?: string;
	/** U-36.1 / U-43: the six months' metrics, absent when the backend has none yet. */
	responseMetrics?: DoctorResponseMetricsFacts;
	/** 🔴 U-45.2: «Επιλογή ασθενών», the backend's verdict; `false` when it says otherwise or nothing. */
	isPatientsChoice?: boolean;
};
