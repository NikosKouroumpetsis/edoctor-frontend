<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { readServerNow } from '$shared/lib/server-clock';
	import {
		appointmentChangeOpen,
		buildAppointmentContext,
		buildTimeDiff,
		insideCutoffMessage,
		isLastReschedule,
		moveAsksCutoffYes,
		toTimeChangeRequest,
		type ChangeOutcome
	} from '$modules/appointments/lib/change';
	import { ChangeContext, ChangeFrame } from '$modules/appointments/ui/change-screen';
	import TimeDiff from '../components/time-diff.svelte';
	import { useAppointmentChange } from '../hooks/use-change.svelte';
	import type { AppointmentTimeChangeProps } from '../types';

	let props: AppointmentTimeChangeProps = $props();

	const change = useAppointmentChange(() => props);
	const options = $derived({ locale: props.locale });
	const appointment = $derived(props.appointment);

	// U-136.4: the hour the server asked a «yes» for (inside the cutoff, U-91.1); it holds while that hour stays chosen.
	// D-W4-67: the page asks it at the choice already when the appointment's own terms tell (`moveAsksCutoffYes`).
	let asked = $state<string | null>(null);
	// Record §8.2: the hour the server said was taken (it left the grid), and any other refusal's words.
	let gone = $state(false);
	let failure = $state<string | null>(null);
	const isAsked = $derived(
		props.picked !== null &&
			(asked === props.picked ||
				moveAsksCutoffYes(props.appointment, props.picked, readServerNow()))
	);

	// A new hour chosen: what was said of the last one goes.
	$effect(() => {
		if (props.picked !== null)
			untrack(() => {
				gone = false;
				failure = null;
			});
	});

	// P-W4 §4.3: opened by its address while the hour may not move (closed, past the deadline, the moves spent), the
	// screen gives way to the appointment.
	$effect(() => {
		if (!appointmentChangeOpen('time', appointment)) untrack(() => change.leave());
	});

	const context = $derived(
		buildAppointmentContext({ appointment, doctor: props.doctor, locale: props.locale })
	);
	const diff = $derived(
		props.picked ? buildTimeDiff(appointment, props.picked, props.locale) : null
	);
	const last = $derived(Boolean(props.picked) && !isAsked && isLastReschedule(appointment.actions));

	function refused(startTime: string) {
		return (outcome: ChangeOutcome) => {
			if (outcome.kind === 'inside-cutoff') asked = startTime;
			else if (outcome.kind === 'slot-gone') {
				gone = true;
				props.onGone(startTime);
			} else if (outcome.kind === 'refused') failure = outcome.message;
		};
	}

	function save() {
		const startTime = props.picked;
		if (!startTime) return;
		change.send(
			toTimeChangeRequest(startTime, isAsked),
			{ kind: 'time', was: appointment.startTime },
			refused(startTime)
		);
	}

	function cancel() {
		// U-136.4 «Άλλη ώρα»: the choice goes, nothing is written; else «Άκυρο» back to the appointment.
		if (isAsked) {
			asked = null;
			props.onRepick();
			return;
		}
		change.leave();
	}
</script>

<!-- Screen 52 «Αλλαγή ώρας» (record §8.2, U-136; `appt.js:321-338`): the appointment's box, «Η ώρα αλλάζει στο ίδιο ιατρείο
     και για την ίδια υπηρεσία.», the days and the hours of its OWN office (the picker, no office to choose), «Ήταν / Νέα
     ώρα» once an hour is chosen, «Αποθήκευση» locked until then (U-136.3). An hour inside the cutoff asks its «yes» here
     (U-136.4: «Άλλη ώρα» / «Αλλαγή ώρας», never a sheet); a taken hour leaves the grid; the last move is said
     (P-B4 §13.3.3). A page of its own below 950, the right column from it (U-136.2). -->
<ChangeFrame
	title={m.appointments_change_time_title({}, options)}
	backHref={change.appointmentHref}
	onBack={change.back}
	cancelLabel={isAsked ? m.appointments_reschedule_inside_cutoff_other({}, options) : undefined}
	saveLabel={isAsked ? m.appointments_reschedule_inside_cutoff_confirm({}, options) : undefined}
	saveDisabled={!props.picked}
	saveLoading={change.pending}
	onCancel={cancel}
	onSave={save}
	locale={props.locale}
	placement="pane"
	testId="appointment-change-time"
>
	<ChangeContext {context} />
	<p class="mb-5 text-label-lg font-normal text-muted-foreground">
		{m.appointments_change_time_help({}, options)}
	</p>
	<h3 class="mb-2.5 text-body-sm font-semibold text-foreground">
		{m.appointments_change_time_pick({}, options)}
	</h3>
	{@render props.picker()}
	{#if gone}
		<p
			role="alert"
			class="mt-3 text-label-lg font-medium text-danger-text"
			data-testid="appointment-time-gone"
		>
			{m.booking_blocker_slot_unavailable({}, options)}
		</p>
	{/if}
	{#if diff}
		<TimeDiff
			wasLabel={m.appointments_change_time_was({}, options)}
			was={diff.was}
			nextLabel={m.appointments_change_time_next({}, options)}
			next={diff.next}
			stays={diff.stays}
		/>
	{/if}
	{#if isAsked && props.picked}
		<div
			role="alert"
			data-testid="appointment-time-ask"
			class="mt-4 rounded-md border border-warning/40 bg-warning/10 px-3.5 py-3 text-body-sm font-medium text-foreground"
		>
			<p>{insideCutoffMessage(appointment, props.picked, props.locale)}</p>
		</div>
	{/if}
	{#if last}
		<p
			data-testid="appointment-time-last"
			class="mt-3 text-label-lg font-normal text-muted-foreground"
		>
			{m.appointments_change_time_last({}, options)}
		</p>
	{/if}
	{#if failure}
		<p
			role="alert"
			class="mt-3 text-label-lg font-medium text-danger-text"
			data-testid="appointment-change-failure"
		>
			{failure}
		</p>
	{/if}
</ChangeFrame>
