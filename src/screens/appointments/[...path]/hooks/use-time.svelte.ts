import { untrack } from 'svelte';
import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { readQueryState } from '$shared/lib/query-state';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorOfficeAvailabilityFacts } from '$modules/doctor/api/availability';
import {
	buildDoctorAvailabilityModalContent,
	type DoctorAvailabilityReadState,
	type DoctorSelectedSlot
} from '$modules/doctor/lib/detail';
import type { AppointmentDetailFacts } from '$modules/appointments/api/appointment';
import { appointmentRescheduleSlotsQuery } from '$modules/appointments/api/reschedule';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import { findOfferedSlot } from '$modules/appointments/lib/booking';
import {
	appointmentOfficeDay,
	appointmentRescheduleOffice,
	withoutAppointmentHours
} from '$modules/appointments/lib/change';

/**
 * Screen 52 «Αλλαγή ώρας» (record §8.2, P-W4 §4.3, the booking's `use-time` way): the profile's own picker on the
 * appointment's ONE office (no office to choose). 🔴 D-W52-75α (`w52-b7` §Γ3.5): its hours are the APPOINTMENT's own
 * (`GET …/reschedule-slots`, the doctor's public rules for the visit's length, the copy of its lines) — never the public
 * hours of one service, which a service the doctor deleted no longer has. Its own hour and any hour the server said was
 * taken are not offered; the window is read only while the screen is open. What the picker chose, as the instant the
 * write sends. Another screen on the right (`paneKey`) starts it again: nothing chosen there is kept.
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
	const appointmentId = $derived(appointment?.id ?? '');
	const slots = createQuery(() => ({
		...appointmentRescheduleSlotsQuery(appointmentId),
		enabled: browser && Boolean(appointmentId)
	}));
	// 🔴 Every field the screen needs is READ every time (a TanStack result tells only the fields read).
	const read = $derived({
		data: slots.data,
		state: readQueryState({
			isPending: slots.isPending,
			isError: slots.isError,
			fetchStatus: slots.fetchStatus
		})
	});
	const readState = $derived.by((): DoctorAvailabilityReadState => {
		if (!appointmentId) return 'idle';
		if (!browser || read.state === 'waiting') return 'waiting';
		return read.state === 'answered' ? 'answered' : 'failed';
	});
	const byOffice = $derived.by((): Record<string, DoctorOfficeAvailabilityFacts> => {
		const own = read.data;
		if (!appointment || !own) return {};
		return {
			[appointment.officeId]: withoutAppointmentHours({ officeId: appointment.officeId, ...own }, [
				appointment.startTime,
				...gone
			])
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
			return readState;
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
		retry: () => void slots.refetch(),
		/** «Άλλη ώρα»: the choice goes. */
		repick: () => {
			staged = null;
		},
		/** The hour was taken (record §8.2): it leaves the grid, and the window is read again. */
		gone: (startTime: string) => {
			gone = [...gone, startTime];
			staged = null;
			if (!appointmentId) return;
			void client.invalidateQueries({
				queryKey: appointmentsQueryKeys.rescheduleSlots(appointmentId)
			});
		}
	};
}
