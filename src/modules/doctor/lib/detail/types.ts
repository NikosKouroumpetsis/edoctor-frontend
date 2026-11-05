import type { DoctorWeeklyHoursRow } from './weekly-hours';
import type {
	DoctorOfficePaymentOptionId,
	DoctorReviewChipId,
	DoctorServiceKind,
	DoctorSocialLinkId
} from '$modules/doctor/api/profile';
import type { DoctorReviewTopic } from '$modules/doctor/config/review-topics';

/**
 * The profile's view model (the application's `lib/detail/types`, S-01.6, with the owner's U-34…U-42): every word,
 * number and date is finished here; the UI only lays it out. Type-only.
 */

/**
 * The fee's three states (the application's `DoctorDetailFee`): the amount, the guest's sign-in (U-34.4), or «on
 * request». A doctor without services has no fee at all (U-38.1): the builders answer `null` then.
 */
export type DoctorDetailFee =
	| { kind: 'amount'; label: string }
	| { kind: 'login'; label: string }
	| { kind: 'on-request'; label: string };

/** One photo as the gallery, the tour and the viewer draw it. */
export type DoctorPhoto = {
	id: string;
	url: string;
	largeUrl: string;
	thumbUrl: string;
	/** The photo's description, or «Φωτογραφία 3 από 25» when the backend gives none. */
	alt: string;
};

/** A social link the page opens in a new tab (U-35.3): the network's glyph and name, the checked address. */
export type DoctorDetailProfessionalLink = {
	id: DoctorSocialLinkId;
	label: string;
	url: string;
};

/** The identity under the photos: name, «Ειδικότητα · Περιοχή», the rating line, the links. */
export type DoctorDetailIdentity = {
	name: string;
	/** «Παθολόγος · Αθήνα · Αττική». */
	subtitle: string;
	specialtyLabel: string;
	addressLabel: string;
	/**
	 * «★ 4,90 · 184 κριτικές»: only for a doctor with reviews (the application's top stats); 🔴 U-45.2: the laurels
	 * «Επιλογή ασθενών» (`badgeLabel`) only when the backend says `isPatientsChoice`.
	 */
	rating: {
		scoreLabel: string;
		countLabel: string;
		badgeLabel?: string;
		/** The stars' name for assistive tech («Βαθμολογία 4,90 από 5»). */
		accessibleLabel: string;
	} | null;
	socialLinks: DoctorDetailProfessionalLink[];
	/** The initial of the summary's round mark. */
	initial: string;
};

/** One row of the summary «Επαγγελματίας υγείας» (U-35.1): the glyph's id, the line and its explanation. */
export type DoctorSummaryRowId = 'languages' | 'response-time' | 'response-rate';
export type DoctorSummaryRow = { id: DoctorSummaryRowId; title: string; description: string };

/** The summary block (U-35.1): the title, the licence, «X χρόνια εμπειρίας μέσω του edoctor», rows, intro. */
export type DoctorDetailSummary = {
	initial: string;
	title: string;
	licenseLabel?: string;
	platformExperienceLabel?: string;
	rows: DoctorSummaryRow[];
	/** U-42.1: the first paragraph of the server's description. */
	intro?: string;
};

/** One icon row of «Γνωρίστε…»: «Μέλος από» + «2015» (two weights, so two strings). */
export type DoctorDetailProfessionalInfoRowId = 'member-since' | 'languages' | 'license';
export type DoctorDetailProfessionalInfoRow = {
	id: DoctorDetailProfessionalInfoRowId;
	label: string;
	value: string;
};

/** One figure of the line «184 κριτικές · 4,90 ★ · 13 χρόνια εμπειρίας» (U-40.4): its value in bold, then words. */
export type DoctorDetailProfessionalStatId = 'reviews' | 'rating' | 'experience';
export type DoctorDetailProfessionalStat = {
	id: DoctorDetailProfessionalStatId;
	value: string;
	/** The words after the value (none for the rating: its star follows it). */
	label: string;
};

/**
 * The description (the application's `DoctorDetailProfessionalAbout`): the first paragraph is the lead under its
 * title; the rest, absent for a single paragraph, the body the section cuts at two lines and the window shows whole.
 */
export type DoctorDetailProfessionalAbout = { leadTitle: string; leadBody: string; body?: string };

/** «Γνωρίστε τον επαγγελματία υγείας» (U-40.4): no card, a line of figures, icon rows, links, description. */
export type DoctorDetailProfessionalSection = {
	title: string;
	stats: DoctorDetailProfessionalStat[];
	infoRows: DoctorDetailProfessionalInfoRow[];
	socialLinks: DoctorDetailProfessionalLink[];
	about?: DoctorDetailProfessionalAbout;
};

/**
 * U-70, U-71.2 (screen 14): one service as a row: its short line, its kind (the icon), the fee, «30΄» and the text
 * under «Περιγραφή» (each only with data, U-34.3).
 */
export type DoctorPricedService = {
	id: string;
	title: string;
	subtitle?: string;
	kind: DoctorServiceKind;
	price: DoctorDetailFee;
	/** «30΄», and how a screen reader says it («30 λεπτά»). */
	durationLabel?: string;
	durationAccessibleLabel?: string;
	descriptionBody?: string;
};

/**
 * «Τομείς εξειδίκευσης» of the profile (U-36.2, U-72.3 Π1): the first three as rows and the way to their page; the
 * visits line only once the backend sends it.
 */
export type DoctorDetailSpecializations = {
	title: string;
	/** U-36.1 / U-72.4: «Ολοκληρωμένες επισκέψεις: 523» — `null` until the backend sends the count. */
	completedVisits: string | null;
	items: DoctorPricedService[];
	moreLabel: string;
};

/** «Υπηρεσίες» of the profile (U-70.2 Ε3, Π7): the first three as rows; `moreLabel` only when the page has more to say. */
export type DoctorDetailServiceCost = {
	title: string;
	notice: string;
	services: DoctorPricedService[];
	moreLabel: string | null;
};

/** One group of the page «Υπηρεσίες» (Π4): only with a field of expertise do they have titles. */
export type DoctorServicesGroup = {
	id: 'specializations' | 'other' | 'all';
	title?: string;
	services: DoctorPricedService[];
};

/** 🔴 U-70 (screen 14): the page of every service. */
export type DoctorServicesPage = {
	title: string;
	notice: string;
	descriptionLabel: string;
	readMoreLabel: string;
	bookLabel: string;
	groups: DoctorServicesGroup[];
	/** Π8: a single service is already open, there is no choice to make. */
	soloId?: string;
};

/** One figure of the page's card (U-72.3 Π3): its number, its words, what a screen reader says. */
export type DoctorSpecializationStat = {
	id: 'domains' | 'visits' | 'years';
	value: string;
	label: string;
	accessibleLabel: string;
};

/** A field of expertise (Π4): a service with its years and its visits, each only with a number above zero. */
export type DoctorSpecializationDomain = DoctorPricedService & {
	years?: { value: string; label: string };
	visits?: { value: string; label: string };
};

/** 🔴 U-72 (screen 15): the page of the fields of expertise. */
export type DoctorSpecializationsPage = {
	title: string;
	statsLabel: string;
	/** Never one cell alone: the list already says how many there are. */
	stats: DoctorSpecializationStat[];
	domains: DoctorSpecializationDomain[];
	readMoreLabel: string;
	bookLabel: string;
	backLabel: string;
	footnote?: string;
};

/** One review card (the application's `DoctorDetailReviewCardContent`). */
export type DoctorDetailReviewCardContent = {
	id: string;
	authorName: string;
	authorInitial: string;
	body: string;
	publishedAt: string;
	publishedLabel: string;
	/** The overall as sent (0–5, two decimals): the window's sort reads it. */
	rating: number;
	/**
	 * U-49 (app = web, the application's `stars`): the whole stars the card draws — the overall rounded as the window's
	 * spread counts it (4,28 ⇒ 4), so the card and the spread never disagree.
	 */
	stars: number;
	ratingLabel: string;
	aspectsLabel?: string;
};

/**
 * 🔴 U-66.1 Π7, Π8: a review of the window's list: the day in words («Πριν από 3 ημέρες»), half stars (U-49), the
 * doctor's reply when there is an approved one.
 */
export type DoctorReviewListCard = DoctorDetailReviewCardContent & {
	relativeLabel: string;
	reply?: { lead: string; author: string; dateLabel: string; body: string };
};

export type DoctorDetailReviewChip = { id: DoctorReviewChipId; title: string; score: string };

export type DoctorDetailReviews = {
	title: string;
	scoreLabel: string;
	/** 🔴 U-45.2: «Επιλογή ασθενών» (the laurels) only when the backend says `isPatientsChoice`. */
	badgeTitle?: string;
	countLabel: string;
	chips: DoctorDetailReviewChip[];
	cards: DoctorDetailReviewCardContent[];
	showAllLabel: string;
	moreLabel: string;
};

export type DoctorBioGroup = { id: string; title: string; countLabel: string; items: string[] };

/** U-73.1 Ε2: one entry of the biography's timeline; without a year, the words alone. */
export type DoctorTimelineEntry = {
	id: string;
	title: string;
	organization?: string;
	/** «2014 – 2016», «2016 – σήμερα», «2025», and how a screen reader says it. */
	whenLabel?: string;
	whenAccessibleLabel?: string;
};

/** One group of the timeline (Σπουδές · Εμπειρία · Συνέδρια), the newest first. */
export type DoctorTimelineGroup = {
	id: 'studies' | 'work-experience' | 'conferences';
	title: string;
	entries: DoctorTimelineEntry[];
	moreLabel: string;
	fewerLabel: string;
};

/** One icon row of the page (Π4): its glyph's id, its name and its value. */
export type DoctorAboutRowId =
	| 'specialty'
	| 'member-since'
	| 'languages'
	| 'license'
	| 'response-time'
	| 'instant'
	| 'response-rate';
export type DoctorAboutRow = { id: DoctorAboutRowId; label: string; value: string };

/** 🔴 U-73 (screen 16): the page «Γνωρίστε τον επαγγελματία υγείας»: every part only with data (U-34.3). */
export type DoctorAboutContent = {
	title: string;
	name: string;
	role: string;
	initial: string;
	imageUrl?: string;
	/** 🔴 U-45.2: only when the backend says `isPatientsChoice`. */
	badgeLabel?: string;
	stats: { id: 'reviews' | 'rating' | 'experience'; value: string; label: string }[];
	rows: DoctorAboutRow[];
	socialLinks: DoctorDetailProfessionalLink[];
	/** The whole description (U-42.1), its paragraphs apart. */
	description?: string;
	descriptionMoreLabel: string;
	bio?: { title: string; groups: DoctorTimelineGroup[] };
	reviews?: {
		title: string;
		cards: DoctorDetailReviewCardContent[];
		moreLabel: string;
		showAllLabel: string;
	};
	articlesTitle: string;
};

/** 🔴 U-75 (screen 24): the three blocks of «Τι πρέπει να γνωρίζετε», and the page each opens. */
export type DoctorKnowPageId = 'cancel' | 'booking' | 'before';

export type DoctorKnowBlock = { id: DoctorKnowPageId; title: string; lines: string[] };

/** One row of a page: `id` its glyph (a UI decision), the label and the line under it; `phone` a `tel:` to press. */
export type DoctorKnowRowId =
	| 'cancel-until'
	| 'cancel-after'
	| 'cancel-request'
	| 'cancel-moved'
	| 'change-until'
	| 'doctor-cancels'
	| 'other-office'
	| 'auto'
	| 'manual'
	| 'expiry'
	| 'notice'
	| 'who'
	| 'account'
	| 'free'
	| 'reminder'
	| 'note'
	| 'payment'
	| 'bring-id'
	| 'bring-amka'
	| 'bring-tests'
	| 'bring-medicines'
	| 'bring-referral';
export type DoctorKnowRow = {
	id: DoctorKnowRowId;
	/** A row of the same glyph may appear more than once («Στα άλλα ιατρεία»). */
	key: string;
	label: string;
	sub?: string;
	phone?: { label: string; dialNumber: string };
};
export type DoctorKnowGroup = { heading?: string; intro?: string; rows: DoctorKnowRow[] };

/** Where a page's link leads (the addresses are the screen's). */
export type DoctorKnowLinkId = 'help-cancellation' | 'help-booking' | 'offices';

export type DoctorKnowPage = {
	id: DoctorKnowPageId;
	title: string;
	intro: DoctorTextSegment[];
	groups: DoctorKnowGroup[];
	link: { id: DoctorKnowLinkId; label: string };
};

export type DoctorKnowContent = {
	title: string;
	/** U-75.1 Ε4: only when the offices' rules differ: the pills, and «Ισχύει για το ιατρείο **Χ**.». */
	officeLine?: DoctorTextSegment[];
	blocks: DoctorKnowBlock[];
	pages: Partial<Record<DoctorKnowPageId, DoctorKnowPage>>;
};

/** One office row of the location (glyph id, label, value; the phone's dial number for `tel:`). */
export type DoctorOfficeInfoRowId = 'phone' | 'floor' | 'parking' | 'disability-access';
export type DoctorOfficeInfoRow = {
	id: DoctorOfficeInfoRowId;
	label: string;
	value: string;
	dialNumber?: string;
};

export type DoctorOfficePaymentMethods = {
	title: string;
	options: { id: DoctorOfficePaymentOptionId; label: string }[];
};

/**
 * «Τοποθεσία» of the ACTIVE office (U-39.1): the address in two lines, its map point, its payments, floor, parking,
 * access, description and phone. Shared by the section and its window.
 */
export type DoctorLocation = {
	officeId?: string;
	streetLine: string;
	cityLine: string;
	coordinates?: { latitude: number; longitude: number };
	description?: string;
	paymentMethods?: DoctorOfficePaymentMethods;
	facilityRows: DoctorOfficeInfoRow[];
	contactRows: DoctorOfficeInfoRow[];
	/** The office's phone as `tel:` takes it (U-37: «📞 Κλήση ιατρείου»). */
	dialNumber?: string;
};

/**
 * 🔴 U-68.1 (screen 13): the page «Τα ιατρεία» / «Το ιατρείο» of the active office: the name, the way there (the map's
 * directions and «Πώς θα έρθετε»), the week and the photos, which only the office's own read has.
 */
export type DoctorOfficePage = {
	title: string;
	location: DoctorLocation | undefined;
	directionsUrl: string | null;
	directionsLabel: string;
	gettingThere?: string;
	hours: DoctorWeeklyHoursRow[];
	photos: DoctorPhoto[];
};

/** The page's sections, each present only with data (U-34.3); `soon` only when every one is absent. */
export type DoctorDetailContent = {
	identity: DoctorDetailIdentity;
	photos: DoctorPhoto[];
	summary?: DoctorDetailSummary;
	professional?: DoctorDetailProfessionalSection;
	specializations?: DoctorDetailSpecializations;
	serviceCost?: DoctorDetailServiceCost;
	reviews?: DoctorDetailReviews;
	bio?: { title: string; groups: DoctorBioGroup[]; allLabel: string };
	/** U-34.3: «Το αναλυτικό προφίλ έρχεται σύντομα», alone, when the doctor has nothing at all to show. */
	soonTitle: string | null;
};

/** One office pill (U-39.2): the ONE way to change the page's active office. */
export type DoctorAvailabilityOfficeTab = { id: string; label: string };

/** One «Επόμενη διαθεσιμότητα» card: a day and its first time; `date` opens the window on it. */
export type DoctorAvailabilityDateCard = { date: string; dateLabel: string; fromLabel: string };

/** A run of a sentence, drawn emphasized or not (the application's `DoctorTextSegment`). */
export type DoctorTextSegment = { emphasis: boolean; text: string };

/**
 * U-37 case 3: «Διαθέσιμο στο ιατρείο **Χ** από **…**», a press switches to that office (the application's): `label`
 * the whole sentence (its name), `segments` the same with the office and the time emphasized.
 */
export type DoctorAvailabilityElsewhere = {
	officeId: string;
	label: string;
	segments: DoctorTextSegment[];
};

/** The section «Διαθεσιμότητα» (only for a doctor with services and at least one time, U-37). */
export type DoctorAvailabilitySectionContent = {
	title: string;
	activeOfficeId: string;
	addressLine: string;
	nextTitle: string;
	cards: DoctorAvailabilityDateCard[];
	showAllLabel: string;
	tabs: DoctorAvailabilityOfficeTab[];
	/** The active office has no time while another has (case 3). */
	elsewhere: DoctorAvailabilityElsewhere | null;
};

/** One time of the window: its «HH:MM» and the office-local day and minute (the selection). */
export type DoctorAvailabilityTimeOption = {
	date: string;
	label: string;
	startMinute: number;
	startTime: string;
};

/** One day of the window's strip (S-26.1: every day of the 28, the empty ones dimmed). */
export type DoctorAvailabilityDayOption = {
	date: string;
	weekdayDayLabel: string;
	monthLabel: string;
	accessibleLabel: string;
	isDisabled: boolean;
	slots: DoctorAvailabilityTimeOption[];
};

/** A time the reader chose in the window, office-local (the bar prints the chip's own time). */
export type DoctorSelectedSlot = { officeId: string; date: string; startMinute: number };

/** The window «Διαθεσιμότητα» (the application's `kind: 'availability'`). */
export type DoctorAvailabilityModalContent = {
	title: string;
	officeHeading: string;
	activeOfficeId: string;
	addressLine: string;
	tabs: DoctorAvailabilityOfficeTab[];
	days: DoctorAvailabilityDayOption[];
	emptyText: string;
	cancelText: string;
	confirmText: string;
	daysLabel: string;
	timesLabel: string;
	elsewhere: DoctorAvailabilityElsewhere | null;
};

/** The reviews window: the score, the spread 5…1, the aspects, the sort and every review. */
export type DoctorReviewSortId = 'newest' | 'oldest' | 'rating-high' | 'rating-low';
export type DoctorDetailReviewSortOption = { id: DoctorReviewSortId; label: string };
export type DoctorDetailReviewRatingBucket = { star: number; count: number; share: number };
/**
 * U-66.1 (the window's head, the list is its own read): the score over the badge's explanation; the spread and the
 * aspects only once the server's totals are in (`ratings`).
 */
export type DoctorReviewsModalContent = {
	title: string;
	/** 🔴 U-45.2: the laurels' `badgeTitle` and its `description` only when the backend says `isPatientsChoice`. */
	header?: { scoreLabel: string; badgeTitle?: string; description?: string };
	howLabel: string;
	ratings: {
		title: string;
		categoriesLabel: string;
		buckets: DoctorDetailReviewRatingBucket[];
		chips: DoctorDetailReviewChip[];
	} | null;
	/** U-66.2 «Οι ασθενείς αναφέρουν»: `null` without a topic. */
	mentions: {
		title: string;
		clearLabel: string;
		chips: { id: DoctorReviewTopic; label: string; count: string; ariaLabel: string }[];
	} | null;
	sortLabel: string;
	sortOptions: DoctorDetailReviewSortOption[];
};

/**
 * What the page books with (U-37, U-38.1, U-40.3): `book` (times to choose), `no-slots` (case 1: services, no time
 * in 4 weeks), `by-phone` (case 2 with a phone), `contact` (case 2 without one). A guest is never sent to sign in
 * when there is nothing to book.
 */
export type DoctorBookingMode = 'book' | 'no-slots' | 'by-phone' | 'contact';

/** One action of cases 1 and 2: «Δείτε παρόμοιους γιατρούς» (a link) or «📞 Κλήση ιατρείου» (`tel:`). */
export type DoctorBookingAction = { kind: 'similar' | 'call'; label: string; href: string };

export type DoctorBookingContent = {
	mode: DoctorBookingMode;
	/** `null` without services (U-38.1: no fee line anywhere). */
	fee: DoctorDetailFee | null;
	/** Cases 1, 2: the statement; `null` while booking. */
	statement: string | null;
	/** Cases 1, 2: the main action (a button) and the other one (a button from 744, a link on the phone, U-42.2). */
	primary: DoctorBookingAction | null;
	secondary: DoctorBookingAction | null;
	/** The phone, printed under the card's buttons (case 1, 2). */
	phoneLabel: string | null;
	/** `book`: the service's title (the bar's first line, the card's «ΥΠΗΡΕΣΙΑ»). */
	serviceTitle: string;
	serviceLabel: string;
	dateLabel: string;
	/** `book`: «Δευ 2 Νοε · 09:30» once chosen (U-40.3), else `null`. */
	chosenLabel: string | null;
	/** `book`: «Επόμενη διαθεσιμότητα: Αύριο · 10:00» of the active office, else `null`. */
	nextLabel: string | null;
	/** `book`: the bar's line «Αύριο · 10:00 · Nikis 12» (the chosen time, else the next one), or `null`. */
	whenLine: string | null;
	/** Case 3 (the active office has no time): its suggestion; `null` otherwise. */
	elsewhere: DoctorAvailabilityElsewhere | null;
	ctaLabel: string;
	/** While the windows are read: the card and the bar wait (no claim yet). */
	waiting: boolean;
	/** A window failed: the line «Δοκιμάστε ξανά» that asks again only what failed (lesson 7). */
	failed: { message: string; retryLabel: string } | null;
};

/**
 * «Δείτε παρόμοιους γιατρούς» (U-37.2, the application's `DoctorSimilarSearch`): the specialty's ids and words and the
 * active office's city.
 */
export type DoctorSimilarSearch = {
	city?: string;
	professionalId?: string;
	professionalName?: string;
	professionalSlug?: string;
};

/**
 * The city of the similar search as the search's catalogue knows it (the search module's `SimilarDoctorsArea`, from
 * `resolveSimilarDoctorsArea`): only with a slug, with its own words.
 */
export type DoctorSimilarArea = { label: string; locationType?: string; slug: string };

/** U-39.1: the active office as the page shows it (the application's `DoctorOfficeView`). */
export type DoctorOfficeView = {
	activeOfficeId?: string;
	/** The office's phone as `tel:` takes it. */
	dialNumber?: string;
	/** The office's phone as printed («📞» line of cases 1 and 2). */
	phone?: string;
	location?: DoctorLocation;
	tabs: DoctorAvailabilityOfficeTab[];
};

/** What a share sends (the application's `DoctorShareContent`). */
export type DoctorShareContent = { title: string; message: string; url: string };
