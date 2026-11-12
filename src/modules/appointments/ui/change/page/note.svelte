<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { createForm } from '$shared/lib/form';
	import {
		bookingNoteCounter,
		bookingNoteRule,
		clampBookingNote
	} from '$modules/appointments/lib/booking';
	import {
		appointmentChangeOpen,
		buildAppointmentContext,
		noteChangeDone,
		toNoteChangeRequest,
		type ChangeOutcome
	} from '$modules/appointments/lib/change';
	import { ChangeContext, ChangeFrame, NoteField } from '$modules/appointments/ui/change-screen';
	import { useAppointmentChange } from '../hooks/use-change.svelte';
	import type { AppointmentChangeProps } from '../types';

	let props: AppointmentChangeProps = $props();

	const change = useAppointmentChange(() => props);
	const options = $derived({ locale: props.locale });
	const appointment = $derived(props.appointment);
	const title = $derived(m.booking_summary_note({}, options));

	let failure = $state<string | null>(null);

	// The note as it is (screen 30's field, 500, D-W4-36.8): an empty one removes it (the server keeps `null`). The
	// shared form holds it (the contract's «Form state»); its bound is the lib's rule.
	const form = createForm({
		initialValues: {
			note: untrack(() => clampBookingNote(props.appointment.patientNote ?? ''))
		},
		validators: { note: [bookingNoteRule] },
		onSubmit: (values) => {
			const request = toNoteChangeRequest(values.note);
			change.send(request, noteChangeDone(request), (outcome: ChangeOutcome) => {
				if (outcome.kind === 'refused' || outcome.kind === 'slot-gone') failure = outcome.message;
			});
		}
	});
	const note = form.field('note');

	$effect(() => {
		if (!appointmentChangeOpen('note', appointment)) untrack(() => change.leave());
	});

	function save() {
		failure = null;
		void form.handleSubmit();
	}
</script>

<!-- Screen 52 «Σημείωση για τον γιατρό» (record §8.2, U-136; `appt.js:362-370`): the appointment's box, the field of
     screen 30 with its «0/500», «Ο γιατρός τη βλέπει όταν ανοίγει το ραντεβού.»; an empty note removes it. 🔴 U-65.6:
     what is written shows back only as text. -->
<ChangeFrame
	{title}
	backHref={change.appointmentHref}
	onBack={change.back}
	saveLoading={change.pending}
	onCancel={() => change.leave()}
	onSave={save}
	locale={props.locale}
	placement="pane"
	testId="appointment-change-note"
>
	<ChangeContext
		context={buildAppointmentContext({ appointment, doctor: props.doctor, locale: props.locale })}
	/>
	<NoteField
		label={title}
		labelAs="hidden"
		placeholder={m.booking_note_placeholder({}, options)}
		value={note.value}
		counter={bookingNoteCounter(note.value, props.locale)}
		error={failure}
		help={m.appointments_change_note_help({}, options)}
		onInput={(value) => note.setValue(clampBookingNote(value))}
		testId="appointment-note-field"
	/>
</ChangeFrame>
