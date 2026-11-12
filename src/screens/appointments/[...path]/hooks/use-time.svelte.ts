import { untrack } from 'svelte';
import { useQueryClient } from '@tanstack/svelte-query';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	DOCTOR_AVAILABILITY_WINDOW_DAYS,
	doctorAvailabilitySlotsQuery,
	type DoctorOfficeAvailabilityFacts
} from '$modules/doctor/api/availability';
import {
	buildDoctorAvailabilityModalContent,
	type DoctorSelectedSlot
} from '$modules/doctor/lib/detail';
import { useDoctorOfficeSlots } from '$modules/doctor/ui/availability-picker';
import type { AppointmentDetailFacts } from '$modules/appointments/api/appointment';
import { findOfferedSlot } from '$modules/appointments/lib/booking';
import {
	appointmentOfficeDay,
	appointmentRescheduleOffice,
	resolveRescheduleServiceId,
	withoutAppointmentHours
} from '$modules/appointments/lib/change';

/**
 * Screen 52 «Αλλαγή ώρας» (record §8.2, P-W4 §4.3, the booking's `use-time` way): the profile's own picker on the
 * appointment's ONE office (no office to choose) for the service it is computed on (the longest active line), the
 * profile's reads and keys (D-103). Its own hour and any hour the server said was taken are not offered; the window is
 * read only while the screen is open. What the picker chose, as the instant the write sends. Another screen on the right
 * (`paneKey`) starts it again: nothing chosen there is kept.
 */
export function useAppointmentTime(options: {
	appointment: () => AppointmentDetailFacts | null;
	locale: () => SupportedLocale;
	/** Changes whenever the right column shows another thing (the module's `paneKey`). */
	paneKey: () => string | null;
}) {
	const client = useQueryClient();
	let staged = $state<DoctorSelectedSlot | null>(null);
	let gone = $state<string[]>([]);

	const appointment = $derived(options.appointment());
	const serviceId = $derived(
		appointment ? resolveRescheduleServiceId(appointment.serviceLines) : ''
	);
	const slots = useDoctorOfficeSlots({
		doctorId: () => appointment?.doctorId,
		officeIds: () => (appointment ? [appointment.officeId] : []),
		serviceId: () => serviceId || undefined
	});
	const byOffice = $derived.by((): Record<string, DoctorOfficeAvailabilityFacts> => {
		const own = appointment ? slots.byOffice[appointment.officeId] : undefined;
		if (!appointment || !own) return {};
		return {
			[appointment.officeId]: withoutAppointmentHours(own, [appointment.startTime, ...gone])
		};
	});
	const content = $derived.by(() => {
		if (!appointment) return null;
		const built = buildDoctorAvailabilityModalContent({
			offices: [appointmentRescheduleOffice(appointment)],
			availabilityByOffice: byOffice,
			activeOfficeId: appointment.officeId,
			locale: options.locale(),
			now: readServerNow()
		});
		// The address is the box's above (P-W4 §4.3): the picker says none.
		return built ? { ...built, addressLine: '' } : null;
	});
	const picked = $derived(
		staged ? (findOfferedSlot(byOffice[staged.officeId], staged)?.startTime ?? null) : null
	);

	$effect(() => {
		void options.paneKey();
		untrack(() => {
			staged = null;
			gone = [];
		});
	});

	return {
		get content() {
			return content;
		},
		get readState() {
			return slots.state;
		},
		/** The appointment's own day on its office's calendar (`appt.js:323`). */
		get initialDate() {
			return appointment ? appointmentOfficeDay(appointment) : undefined;
		},
		get staged() {
			return staged;
		},
		set staged(value: DoctorSelectedSlot | null) {
			staged = value;
		},
		get picked() {
			return picked;
		},
		retry: () => slots.retry(),
		/** «Άλλη ώρα»: the choice goes. */
		repick: () => {
			staged = null;
		},
		/** The hour was taken (record §8.2): it leaves the grid, and the window is read again. */
		gone: (startTime: string) => {
			gone = [...gone, startTime];
			staged = null;
			if (!appointment || !serviceId) return;
			void client.invalidateQueries({
				queryKey: doctorAvailabilitySlotsQuery({
					doctorId: appointment.doctorId,
					officeId: appointment.officeId,
					doctorServiceId: serviceId,
					days: DOCTOR_AVAILABILITY_WINDOW_DAYS
				}).queryKey
			});
		}
	};
}
