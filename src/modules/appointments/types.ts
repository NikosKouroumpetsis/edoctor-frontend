/**
 * What the booking reads of the rest of the site, as FACTS the screen hands over (wave 3 · screens 30, 31): a module never
 * imports another, so these are the shapes the booking needs and nothing more. The doctor's profile facts and its slots
 * fit them as they are (`DoctorProfile`, `DoctorOfficeAvailabilityFacts`): the compiler checks that at the screen, so a
 * renamed field there fails to compile here (the application's `BookingRelativeFacts` rule).
 */

/** 🔴 U-75: an office's booking rules as the server resolves them (the page never assumes one). */
export type BookingPolicyFacts = {
	confirmationMode: 'AUTO' | 'MANUAL';
	cancellationCutoffHours: number;
	minBookingNoticeHours: number;
};

/** One office the visit may take place in: its id, its address parts and its rules. */
export type BookingOfficeFacts = {
	officeId: string;
	street?: string;
	streetNumber?: string;
	city?: string;
	state?: string;
	bookingPolicy?: BookingPolicyFacts;
};

/** One bookable service: its name, its length and its fee (a range; one price is `min === max`). */
export type BookingServiceFacts = {
	id: string;
	title: string;
	priceRange: { min: number; max: number } | null;
	durationInMinutes?: number;
};

/** The doctor the visit is with: what the card shows and what the request names. */
export type BookingDoctorFacts = {
	doctorId?: string;
	doctorSlug: string;
	name?: string;
	professional?: { name: string };
	images: { url: string; thumbUrl: string; alt?: string }[];
	rating: number;
	reviewCount: number;
	/** U-34.4: a guest sees no amount, only «Συνδεθείτε για κόστος». */
	pricingVisible: boolean;
	services?: BookingServiceFacts[];
	/** Every office, the main one first. */
	offices?: BookingOfficeFacts[];
};

/** One offered slot: minutes from the office's midnight, and its instant (its identity, never formatted). */
export type BookingSlotFacts = { startMinute: number; startTime: string };

/** One office's window for one service, as the public slots answer it (the doctor module's read). */
export type BookingAvailabilityFacts = {
	days: { date: string; slots: BookingSlotFacts[] }[];
};

/**
 * Wave 4.0 · the doctor of a patient's appointment as the list and the page show it (screens 50–54): a fit of the
 * doctor module's public profile, read by the screen per different doctor (D-W4-29), handed over as these facts.
 */
export type AppointmentDoctorFacts = Pick<
	BookingDoctorFacts,
	'doctorSlug' | 'name' | 'professional' | 'images' | 'rating' | 'reviewCount'
>;

/**
 * Wave 4.0 · the addresses the patient's pages lead to (screens 50–54), resolved and in the page's language by the screen
 * (a module knows no route): the list's tabs, an appointment and what it opens, the rating's form, and the rest of the
 * site the appointment points at.
 */
export type AppointmentsLinks = {
	/** `/appointments` (Επερχόμενα) or `/appointments?tab=history` (Ιστορικό). */
	list: (tab: 'upcoming' | 'history') => string;
	appointment: (appointmentId: string) => string;
	/** One of the screens an appointment opens (D-W4-20): `time`, `for-whom`, `note`, `cancel` … */
	step: (
		appointmentId: string,
		step: 'time' | 'for-whom' | 'relative' | 'note' | 'cancel'
	) => string;
	/** Screen 54, the email's own address (`/ratings/<invitationId>`). */
	rating: (invitationId: string) => string;
	/** The doctor's profile (the card's block, «Κλείστε ξανά ραντεβού»). */
	doctor: (slug: string) => string;
	/** «Αναζήτηση γιατρών» under an empty «Επερχόμενα». */
	search: string;
	help: string;
};

/** Who reads the patient's pages, as the session tells it (the page's server knows nobody, U-80.1 Ε6). */
export type AppointmentsViewer = 'waiting' | 'guest' | 'member' | 'failed';
