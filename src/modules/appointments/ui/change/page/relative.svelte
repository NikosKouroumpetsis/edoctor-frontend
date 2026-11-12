<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { isPlainClick } from '$shared/lib/navigation';
	import { getToastsOptional } from '$shared/ui/molecules/toast';
	import type { BookingRelativeFacts } from '$modules/appointments/api/patient';
	import { appointmentChangeOpen } from '$modules/appointments/lib/change';
	import { relativeSubject } from '$modules/appointments/lib/relatives';
	import { useAppointmentSteps } from '$modules/appointments/ui/change-screen';
	import { getAppointmentsMemoryOptional } from '$modules/appointments/ui/memory';
	import RelativeForm from '$modules/appointments/ui/relative-form';
	import type { AppointmentRelativeAddProps } from '../types';

	let props: AppointmentRelativeAddProps = $props();

	const steps = useAppointmentSteps();
	const memory = getAppointmentsMemoryOptional();
	const toasts = getToastsOptional();
	const options = $derived({ locale: props.locale });
	// «Για ποιον…» of the same appointment: one step back (record §8.2), else in its place.
	const forWhomHref = $derived(props.links.step(props.appointment.id, 'for-whom'));

	// Opened by its address while the visit may no longer change its person, the screen gives way to the appointment.
	$effect(() => {
		if (!appointmentChangeOpen('relative', props.appointment))
			untrack(() => steps.leave(props.links.appointment(props.appointment.id)));
	});

	function back() {
		steps.leave(forWhomHref, 1);
	}

	// Record §8.2 (the booking's precedent, record §3.3): the new relative goes back to «Για ποιον…» CHOSEN, said over the
	// page's bar — «Ο Γιώργος Παππάς προστέθηκε και επιλέχθηκε.» with the article of its gender (U-139.5).
	function saved(relative: BookingRelativeFacts) {
		memory?.choose(props.appointment.id, relative.relativeId);
		toasts?.show({
			message: m.booking_for_whom_relative_added(
				{
					subject: relativeSubject(
						`${relative.firstName} ${relative.lastName}`,
						relative.gender,
						props.locale
					)
				},
				options
			),
			lift: 'page-bar'
		});
		back();
	}
</script>

<!-- Screen 52 «Προσθήκη συγγενή» (record §8.2, §11; U-102): the ONE relative form (P-W4 Σ-27) in the appointment's right
     column from 950, a page of its own below it; «←» and «Άκυρο» back to «Για ποιον…», a saved relative chosen there. -->
<RelativeForm
	locale={props.locale}
	toMobilePhone={props.toMobilePhone}
	backHref={forWhomHref}
	onBack={(event) => {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		back();
	}}
	onCancel={back}
	onSaved={saved}
	placement="pane"
	testId="appointment-relative"
/>
