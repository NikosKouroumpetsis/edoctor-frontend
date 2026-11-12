<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { m } from '$paraglide/messages.js';
	import { isPlainClick } from '$shared/lib/navigation';
	import { getSessionOptional } from '$shared/state/session';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { bookingPatientQuery } from '$modules/appointments/api/patient';
	import { bookingReadinessQuery } from '$modules/appointments/api/readiness';
	import {
		appointmentChangeOpen,
		asksFirstVisitOnChange,
		buildAppointmentContext,
		buildVisitorOptions,
		currentVisitorId,
		firstVisitCopy,
		pendingLimitBlocks,
		toVisitorChangeRequest,
		type ChangeOutcome
	} from '$modules/appointments/lib/change';
	import {
		ChangeContext,
		ChangeFrame,
		ChoiceList,
		FirstVisit
	} from '$modules/appointments/ui/change-screen';
	import { getAppointmentsMemoryOptional } from '$modules/appointments/ui/memory';
	import { useAppointmentChange } from '../hooks/use-change.svelte';
	import type { AppointmentChangeProps } from '../types';

	let props: AppointmentChangeProps = $props();

	const change = useAppointmentChange(() => props);
	const session = getSessionOptional();
	const memory = getAppointmentsMemoryOptional();
	const options = $derived({ locale: props.locale });
	const appointment = $derived(props.appointment);
	const title = $derived(m.booking_for_whom_title({}, options));

	const patientRead = createQuery(() => ({
		...bookingPatientQuery(),
		enabled: browser && (session?.isMember ?? false)
	}));
	const choices = $derived(buildVisitorOptions(patientRead.data, appointment, props.locale));
	const current = $derived(currentVisitorId(appointment));

	// The relative just added on «Προσθήκη συγγενή» is chosen here until «Αποθήκευση» or «Άκυρο» (the page's memory);
	// else whom the visit is for now (a relative deleted since comes from its snapshot, record §11.4).
	let picked = $state<string>(
		untrack(() => memory?.chosenFor(props.appointment.id) ?? currentVisitorId(props.appointment))
	);
	let firstVisit = $state<'yes' | 'no'>('yes');
	let failure = $state<string | null>(null);
	const option = $derived(choices.find((choice) => choice.id === picked));
	const changed = $derived(Boolean(option) && picked !== current);

	// Review w4-a6 R1 (parity, D-W4-37.4): the person chosen left the list as it was read (a relative deleted meanwhile) —
	// the choice goes back to whom the appointment is for, never a list with nobody chosen.
	$effect(() => {
		if (patientRead.data === undefined || option) return;
		untrack(() => (picked = current));
	});

	// Whose readiness: the person chosen, when it is another (record §8.1: «first visit?» and, for a request, D-70).
	const readiness = createQuery(() => ({
		...bookingReadinessQuery({
			doctorId: props.appointment.doctorId,
			slot: null,
			relativeId: option?.visitor.kind === 'relative' ? option.visitor.relativeId : null
		}),
		enabled: browser && (session?.isMember ?? false) && changed
	}));
	const waiting = $derived(changed && readiness.isPending && !readiness.isError);
	const limited = $derived(pendingLimitBlocks(appointment, changed, readiness.data?.blockers));
	const asksFirst = $derived(!limited && asksFirstVisitOnChange(changed, readiness.data));
	const personName = $derived(
		option ? (option.id === 'self' ? option.description : option.label) : null
	);
	const question = $derived(firstVisitCopy(props.doctor, personName, props.locale));

	$effect(() => {
		if (!appointmentChangeOpen('for-whom', appointment)) untrack(() => leave());
	});

	function choose(id: string) {
		picked = id;
		firstVisit = 'yes';
		failure = null;
	}

	function leave() {
		memory?.choose(props.appointment.id, null);
		change.leave();
	}

	function save() {
		if (!option || !changed || waiting || limited) return;
		failure = null;
		change.send(
			toVisitorChangeRequest(option.visitor, asksFirst ? firstVisit === 'yes' : null),
			{ kind: 'for-whom' },
			(outcome: ChangeOutcome) => {
				if (outcome.kind !== 'refused' && outcome.kind !== 'slot-gone') return;
				failure = outcome.message;
				// 🔴 D-W4-37.4: a relative deleted meanwhile is a refusal of the person, not of the appointment — the
				// patient stays here and the relatives are read again.
				void patientRead.refetch();
			}
		);
	}

	// «Προσθήκη συγγενή» (record §8.2): the relative form one step on; it comes back here with the new one chosen.
	function addRelative(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		change.steps.open(props.links.step(props.appointment.id, 'relative'), change.steps.depth + 1);
	}
</script>

<!-- Screen 52 «Για ποιον είναι το ραντεβού;» (record §8.2, U-136; `appt.js:341-359`): the booking's ONE list (P-W4 Σ-15) —
     «Για μένα» over the holder's name, each relative over its word (U-139.5) —, «Προσθήκη συγγενή» (a screen of its own,
     U-102), and once ANOTHER person is chosen: «Είναι το πρώτο ραντεβού με …;» only when the server knows no visit of
     theirs (D-W3-22), and for a request «Υπάρχει ήδη ένα αίτημα σε αναμονή…» (D-70), which locks «Αποθήκευση». -->
<ChangeFrame
	{title}
	backHref={change.appointmentHref}
	onBack={(event) => {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}}
	saveDisabled={!changed || waiting || limited}
	saveLoading={change.pending}
	onCancel={leave}
	onSave={save}
	locale={props.locale}
	placement="pane"
	testId="appointment-change-for-whom"
>
	<ChangeContext
		context={buildAppointmentContext({ appointment, doctor: props.doctor, locale: props.locale })}
	/>
	{#if patientRead.isError}
		<InlineNotice
			variant="danger"
			message={m.booking_error_body({}, options)}
			actionLabel={m.booking_error_retry({}, options)}
			onAction={() => void patientRead.refetch()}
			testId="appointment-for-whom-failed"
		/>
	{:else if !patientRead.data}
		<div class="flex flex-col gap-3" data-testid="appointment-for-whom-waiting">
			<Skeleton class="h-control-xl w-full rounded-md" />
			<Skeleton class="h-control-xl w-full rounded-md" />
		</div>
	{:else}
		<ChoiceList
			label={title}
			choices={choices.map((choice) => ({
				id: choice.id,
				title: choice.label,
				description: choice.description
			}))}
			value={option ? picked : null}
			onChange={choose}
			testId="appointment-for-whom-options"
		/>
		{#if limited}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="appointment-for-whom-limit"
			>
				{m.booking_blocker_pending_limit({}, options)}
			</p>
		{/if}
		<!-- The screen's address, already resolved (a module knows no route). -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={props.links.step(props.appointment.id, 'relative')}
			data-testid="appointment-for-whom-add-relative"
			class="mt-5 inline-flex min-h-touch min-w-touch items-center text-body-md font-semibold text-foreground underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			onclick={addRelative}
		>
			{m.booking_for_whom_add_relative({}, options)}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{#if asksFirst}
			<div class="mt-4">
				<FirstVisit
					title={question.title}
					about={question.about}
					value={firstVisit}
					options={[
						{ value: 'yes', label: m.common_yes({}, options) },
						{ value: 'no', label: m.common_no({}, options) }
					]}
					onChange={(value) => (firstVisit = value)}
					headingAs="h3"
					frame="always"
				/>
			</div>
		{/if}
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
