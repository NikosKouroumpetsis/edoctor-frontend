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

/** 🔴 U-75, U-76: an office's booking rules as the server resolves them (the page never assumes one). */
export type DoctorBookingPolicyFacts = {
	confirmationMode: 'AUTO' | 'MANUAL';
	cancellationCutoffHours: number;
	minBookingNoticeHours: number;
};

/** One office as the tabs need it: the id the slots are asked with and the address parts. */
export type DoctorOfficeSummaryFacts = {
	officeId: string;
	city?: string;
	postalCode?: string;
	state?: string;
	street?: string;
	streetNumber?: string;
	/** 🔴 U-75: absent when the server could not read them: the section then says nothing of them. */
	bookingPolicy?: DoctorBookingPolicyFacts;
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
	/** 🔴 P-B §7: the next three come ONLY with the office's own read (`api/office`), never with the profile (D-103). */
	images?: DoctorOfficeImageFacts[];
	weeklyHours?: DoctorOfficeWeeklyHoursFacts;
	/** «Πώς θα έρθετε»: plain text, in the page's language. */
	gettingThere?: string;
	/** 🔴 P-W3 §3.5 (Σ-22, U-110.3): the office's details, with its own read only — the office's page, never the profile. */
	amenities?: DoctorOfficeAmenitiesFacts;
};

/** A kind of parking under «Parking», as the app's id (the wire enum is translated in `api/office/map.ts`). */
export type DoctorOfficeParkingKind = 'private' | 'public-nearby' | 'street';

/**
 * The office's details (Ε6 = Α, the application's `DoctorOfficeAmenitiesFacts`): each only under its parent — the kinds
 * under parking, the accessible toilet and space under step-free access, an elevator off the ground floor.
 */
export type DoctorOfficeAmenitiesFacts = {
	parkingKinds: DoctorOfficeParkingKind[];
	accessibleToilet: boolean;
	accessibleParking: boolean;
	elevator: boolean;
	nearPublicTransport: boolean;
};

/** A photo of the office: its sized addresses (absolute) and its description, if any. */
export type DoctorOfficeImageFacts = {
	id: string;
	url: string;
	largeUrl: string;
	thumbUrl: string;
	alt?: string;
};

export type DoctorWeekday =
	| 'monday'
	| 'tuesday'
	| 'wednesday'
	| 'thursday'
	| 'friday'
	| 'saturday'
	| 'sunday';

/** The doctor's week at an office, as raw facts: minutes of the office's day; the page writes the words. */
export type DoctorOfficeWeeklyHoursFacts = {
	timezone: string;
	days: { day: DoctorWeekday; ranges: { startMinute: number; endMinute: number }[] }[];
};

/** A fee as a range (the profile's one `price` per service is `min === max`). */
export type DoctorFeeFacts = { min: number; max: number };

export type DoctorAvailabilityFacts = {
	hasToday?: boolean;
	hasNext3Days?: boolean;
	nextAvailableAt?: string | null;
};

/** U-71.2, U-89.1: what a service's icon follows, the backend's rule on its name; nobody enters it. */
export type DoctorServiceKind = 'follow-up' | 'check-up' | 'visit' | 'other';

/**
 * One bookable service. `isSpecialized` (U-36.2): the doctor marked it as a field of expertise — the
 * «Τομείς εξειδίκευσης» are these services, as the server already sends them.
 */
export type DoctorServiceFacts = {
	id: string;
	title: string;
	priceRange: DoctorFeeFacts | null;
	kind: DoctorServiceKind;
	/** U-72.3: the years the doctor has given this service, absent when none is entered (never a zero). */
	yearsOfExperience?: number;
	/** U-72.3: this service's completed visits over the server's window, absent with none (never a zero). */
	completedVisits?: number;
	/** The backend's `description`: the service's text, its «Περιγραφή». */
	description?: string;
	/** The backend's `sub`: the short line under its title. */
	subtitle?: string;
	durationInMinutes?: number;
	isSpecialized: boolean;
};

export type DoctorBioFacts = {
	studies?: string[];
	workExperience?: string[];
	conferences?: string[];
};

/** U-73.1: the groups of the biography, as the backend's `DoctorCredential.kind`. */
export type DoctorCredentialKind = 'STUDY' | 'WORK' | 'CONFERENCE';

/** One entry of the biography (U-73.1 Ε2), in the server's order: the newest first, the ones without a year last. */
export type DoctorCredentialFacts = {
	id: string;
	kind: DoctorCredentialKind;
	title: string;
	organization?: string;
	startYear?: number;
	endYear?: number;
	isCurrent: boolean;
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
	/** U-66.3: the doctor's reply: the server sends only an approved one. */
	reply?: { body: string; repliedAt: string | null };
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
 * 🔴 U-36.1 / U-43.1 (app = web): the doctor's response and visits over the server's window (`windowMonths`, U-72.4), the
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
	/** U-72.4: the months the server counts over, for the one sentence that needs them; never a fixed «6». */
	windowMonths?: number;
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
	/** U-73.1: the biography. A read of them that failed leaves `bio`, the plain texts they were moved from. */
	credentials?: DoctorCredentialFacts[];
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
	/** 🔴 U-92.2: the doctor's articles, only counts: the cards are their own read. */
	articlesSummary?: { articlesCount: number; healthAdviceCount: number };
};
