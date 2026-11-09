import type {
	DoctorAvailabilityModalContent,
	DoctorAvailabilityReadState,
	DoctorBookingContent,
	DoctorSelectedSlot
} from '$modules/doctor/lib/detail';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { TimeSlotGridVariant } from '$shared/ui/molecules/time-slot-grid';

/** What the windows of a doctor's offices are asked for: the doctor, the offices, the service (each read live). */
export type DoctorOfficeSlotsOptions = {
	doctorId: () => string | undefined;
	officeIds: () => string[];
	serviceId: () => string | undefined;
};

/**
 * «Διαθεσιμότητα» (S-26, U-37, U-40.3): the profile's window and the booking's «Αλλαγή» screen (P-W3 Σ-12) draw the
 * same picker — the offices, the address, the days, the day's times.
 */
export type AvailabilityPickerProps = {
	content: DoctorAvailabilityModalContent | null;
	readState: DoctorAvailabilityReadState;
	/** With no time anywhere (cases 1, 2), the page's statement and ways; none on the booking's screen. */
	booking?: DoctorBookingContent;
	initialDate: string | undefined;
	staged?: DoctorSelectedSlot | null;
	locale: SupportedLocale;
	/**
	 * 🔴 U-129.2: the chosen time as the screen's own prototype draws it — the profile's filled (`solid`, the default,
	 * wave 1), the booking's outlined (`outline`, `30-booking`).
	 */
	slotVariant?: TimeSlotGridVariant;
	onSelectOffice: (officeId: string) => void;
	onRetry: () => void;
};
