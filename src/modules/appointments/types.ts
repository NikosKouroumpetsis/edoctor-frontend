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
