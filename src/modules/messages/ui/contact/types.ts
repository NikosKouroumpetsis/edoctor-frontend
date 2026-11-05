import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { ToastLift } from '$shared/ui/molecules/toast';
import type { ContactDoctorFacts } from '$modules/messages/types';

/** What «Επικοινωνήστε με τον γιατρό» needs from its screen (U-84.6). */
export type ContactOptions = {
	doctor: () => ContactDoctorFacts | null;
	locale: () => SupportedLocale;
	conversationHref: (conversationId: string) => string;
	/** What its toast clears: the booking bar on a profile. */
	lift?: ToastLift;
};
