import { untrack } from 'svelte';
import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { m } from '$paraglide/messages.js';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import {
	buildDoctorAvailabilityModalContent,
	doctorProfilePath,
	resolveDoctorActiveOfficeId,
	resolveDoctorAvailabilityServiceId,
	type DoctorSelectedSlot
} from '$modules/doctor/lib/detail';
import { useDoctorOfficeSlots } from '$modules/doctor/ui/availability-picker';
import { findOfferedSlot, hintsOf, withBookingHints } from '$modules/appointments/lib/booking';
import { useBookingEntry, type BookingTimeProps } from '$modules/appointments/ui/booking';
import type { BookingScreenData } from '../types';

/**
 * «Διαθεσιμότητα» of the booking (record §3.3, P-W3 Σ-12): the profile's own picker — every office's window for the
 * chosen service (the profile's reads, same keys, D-103), the pills, the days, the times — on a screen of its own. It
 * opens on the draft's hour; «Αποθήκευση» is offered only for an hour the window offers.
 */
export function useBookingTime(data: () => BookingScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const profile = () => data().load.profile;
	const slug = () => profile().doctorSlug;
	const draft = useBookingEntry(slug);

	let staged = $state<DoctorSelectedSlot | null>(untrack(() => draft.slot));
	let chosenOfficeId = $state<string | null>(untrack(() => draft.slot?.officeId ?? null));
	const serviceId = $derived(
		resolveDoctorAvailabilityServiceId(profile().services, draft.serviceId)
	);
	const slots = useDoctorOfficeSlots({
		doctorId: () => profile().doctorId,
		officeIds: () => (profile().offices ?? []).map((office) => office.officeId),
		serviceId: () => serviceId
	});
	const activeOfficeId = $derived(
		resolveDoctorActiveOfficeId({
			availabilityByOffice: slots.byOffice,
			offices: profile().offices,
			requestedOfficeId: chosenOfficeId
		})
	);
	const content = $derived(
		buildDoctorAvailabilityModalContent({
			offices: profile().offices,
			availabilityByOffice: slots.byOffice,
			activeOfficeId,
			locale,
			now: data().load.serverNow
		})
	);
	const canSave = $derived(
		Boolean(staged && findOfferedSlot(slots.byOffice[staged.officeId], staged))
	);

	return {
		get locale() {
			return locale;
		},
		get content() {
			return content;
		},
		get readState() {
			return slots.state;
		},
		get initialDate() {
			return draft.slot?.date;
		},
		get staged() {
			return staged;
		},
		set staged(value: DoctorSelectedSlot | null) {
			staged = value;
		},
		chooseOffice: (officeId: string) => {
			chosenOfficeId = officeId;
		},
		retry: () => slots.retry(),
		frame(): Omit<BookingTimeProps, 'picker'> {
			return {
				slug: slug(),
				locale,
				href,
				title: m.doctor_section_availability({}, { locale }),
				staged,
				canSave,
				serviceId,
				// Review w3-w2 R1 MINOR-2: with no hour behind it, «Άκυρο» goes back to the doctor (never the 307 again).
				profileHref: href(
					withBookingHints(doctorProfilePath(slug()), hintsOf(draft.slot, serviceId ?? null))
				)
			};
		}
	};
}
