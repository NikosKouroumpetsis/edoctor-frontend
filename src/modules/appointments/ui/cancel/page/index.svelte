<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import { createForm } from '$shared/lib/form';
	import { isPlainClick } from '$shared/lib/navigation';
	import { getSessionOptional } from '$shared/state/session';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import {
		cancelAppointment,
		readAppointmentChangeFailure,
		storeAppointmentDetail,
		type AppointmentCancelRequest
	} from '$modules/appointments/api/appointment';
	import { APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH } from '$modules/appointments/config';
	import {
		buildCancelTerms,
		cancelCopy,
		cancelEntryOf,
		cancelFormRules,
		cancelMessageCounter,
		cancelReasonOptions,
		cancelThenLines,
		clampCancelMessage,
		readCancelOutcome,
		toCancelRequest
	} from '$modules/appointments/lib/cancel';
	import { buildAppointmentContext } from '$modules/appointments/lib/change';
	import { appointmentPhone } from '$modules/appointments/lib/detail';
	import {
		ChangeContext,
		ChangeFrame,
		NoteField,
		RadioRows,
		useAppointmentSteps
	} from '$modules/appointments/ui/change-screen';
	import { getAppointmentsMemoryOptional } from '$modules/appointments/ui/memory';
	import Offer from '../components/offer.svelte';
	import Terms from '../components/terms.svelte';
	import type { AppointmentCancelProps } from '../types';

	let props: AppointmentCancelProps = $props();

	const client = useQueryClient();
	const session = getSessionOptional();
	const memory = getAppointmentsMemoryOptional();
	const steps = useAppointmentSteps();
	const options = $derived({ locale: props.locale });
	const appointment = $derived(props.appointment);
	const appointmentHref = $derived(props.links.appointment(props.appointment.id));
	const copy = $derived(cancelCopy(appointment, props.locale));
	const reasonsId = $props.id();

	let failure = $state<string | null>(null);
	// The server said the deadline passed while the screen was open (`CANCEL_AFTER_CANCELLATION_CUTOFF`): nothing written.
	let refusedLate = $state(false);
	// Once sent and answered, the screen stays as it was while it goes back (the canceled visit is the 51's to tell).
	let sent = $state(false);

	const entry = $derived(cancelEntryOf(appointment.actions));
	const late = $derived(!sent && (refusedLate || entry === 'deadline'));
	const phone = $derived(appointmentPhone(appointment));
	const context = $derived(
		buildAppointmentContext({
			appointment,
			doctor: props.doctor,
			withVisitor: true,
			locale: props.locale
		})
	);
	const terms = $derived(
		buildCancelTerms({
			appointment,
			actions: appointment.actions,
			phone: phone?.label ?? null,
			locale: props.locale
		})
	);

	const leave = () => steps.leave(appointmentHref);

	// P-W4 §4.4: the opening reads the appointment again; a visit already closed (canceled, refused, expired, begun) is no
	// cancellation — the 51 tells how it ended (review w4-w3 R1 MINOR-1).
	onMount(() => props.onReread());
	$effect(() => {
		if (!sent && entry === 'closed' && !refusedLate) untrack(() => leave());
	});

	const write = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: (request: AppointmentCancelRequest) =>
			cancelAppointment(props.appointment.id, request),
		onSuccess: (answer) => {
			if (!answer) {
				failure = m.appointments_cancel_failed({}, options);
				props.onReread();
				return;
			}
			sent = true;
			// U-137.6: back on the canceled visit, its «Σας στείλαμε email επιβεβαίωσης.» (D-W4-11, D-W4-36.6); the list
			// moves to «Ιστορικό» by itself (the tab is the visit's own, P-W4 §3.2).
			memory?.rememberCanceled(answer.id);
			void storeAppointmentDetail(client, answer);
			leave();
		},
		onError: (error) => {
			const outcome = readCancelOutcome(readAppointmentChangeFailure(error), props.locale);
			if (outcome.kind === 'session') {
				// 🔴 U-84: the session ended under the screen; the reason and the words stay for the same person.
				session?.expire({});
				return;
			}
			// 🔴 D-W4-37: every answer reads the appointment again — the 51 never offers what was just refused, and a visit
			// closed meanwhile gives way to it (`entry`), a deadline passed shows its view; while the cancellation is still
			// allowed the patient STAYS with the reason and the words, and reads why.
			props.onReread();
			if (outcome.kind === 'deadline') {
				refusedLate = true;
				return;
			}
			failure = outcome.message;
		}
	}));

	// The reason (required: the button sleeps without one) and the words, in the shared form (the contract's «Form
	// state»); its rules are the lib's, and what travels is the lib's body.
	const form = createForm({
		initialValues: { reason: '', message: '' },
		validators: cancelFormRules(),
		onSubmit: (values) => {
			const request = toCancelRequest(values.reason, values.message);
			if (!request) return;
			failure = null;
			write.mutate(request);
		}
	});
	const reason = form.field('reason');
	const message = form.field('message');

	function submit() {
		if (write.isPending || !reason.value) return;
		void form.handleSubmit();
	}

	// U-137.3: «Αλλαγή ώρας» one step further; saving there goes back to the appointment (P-W4 §3.6).
	function openTime(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		steps.open(props.links.step(props.appointment.id, 'time'), steps.depth + 1);
	}

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}
</script>

{#snippet phoneGlyph()}
	<Ionicon name="call-outline" class="icon-md" />
{/snippet}

<!-- Screen 53 «Ακύρωση ραντεβού» / «Ακύρωση αιτήματος» (record §9.2, U-137; `appt.js:428-457`): a screen of its own, never
     a sheet (U-137.2) — the appointment's box with «Για: …», «Προθεσμία ακύρωσης» in two lines, «Θέλετε απλώς άλλη ώρα;»
     while the hour may move (U-137.3), the five reasons, the words up to 500, what will happen; «Να μείνει» on the left,
     the cancel in the main colour on the right, locked until a reason is chosen — ONE press cancels (U-137.1). The
     deadline that passed with the screen open is said with the office to call and one way back. 🔴 U-137.5: no word of
     «εκπρόθεσμα», before or after. -->
{#if late}
	<ChangeFrame
		title={copy.title}
		backHref={appointmentHref}
		onBack={back}
		cancelLabel={null}
		saveLabel={m.appointments_cancel_back({}, options)}
		onCancel={leave}
		onSave={leave}
		locale={props.locale}
		placement="pane"
		testId="appointment-cancel-late"
	>
		<ChangeContext {context} />
		<div
			role="alert"
			data-testid="appointment-cancel-deadline"
			class="rounded-md border border-warning/40 bg-warning/10 px-3.5 py-3 text-body-sm text-foreground"
		>
			<p class="font-medium">{m.appointments_detail_deadline_passed({}, options)}</p>
			{#if phone}
				<Button
					tone="outline"
					hover={false}
					href={`tel:${phone.dial}`}
					label={m.appointments_detail_call_office({ phone: phone.label }, options)}
					leading={phoneGlyph}
					textClass="text-body-sm"
					class="mt-3"
					data-testid="appointment-cancel-call"
				/>
			{/if}
		</div>
	</ChangeFrame>
{:else}
	<ChangeFrame
		title={copy.title}
		backHref={appointmentHref}
		onBack={back}
		cancelLabel={copy.keep}
		saveLabel={copy.submit}
		saveDisabled={!reason.value}
		saveLoading={write.isPending}
		onCancel={leave}
		onSave={submit}
		locale={props.locale}
		placement="pane"
		testId="appointment-cancel"
	>
		<ChangeContext {context} />
		{#if terms.lines.length > 0}
			<Terms title={terms.title} lines={terms.lines} />
		{/if}
		{#if appointment.actions.canReschedule}
			<Offer
				title={copy.offerTitle}
				body={copy.offerBody}
				action={m.appointments_detail_reschedule({}, options)}
				href={props.links.step(props.appointment.id, 'time')}
				onOpen={openTime}
			/>
		{/if}
		<h3 id={reasonsId} class="mt-6 mb-3 text-body-lg font-semibold text-foreground">
			{m.appointments_cancel_reason_label({}, options)}
		</h3>
		<RadioRows
			labelledby={reasonsId}
			value={reason.value || null}
			options={cancelReasonOptions(props.locale).map((option) => ({
				value: option.code,
				label: option.label
			}))}
			onChange={(value) => {
				reason.setValue(value);
				failure = null;
			}}
			frame="always"
			testId="appointment-cancel-reasons"
		/>
		<div class="mt-6">
			<NoteField
				label={m.appointments_cancel_text_label({}, options)}
				labelAs="h3"
				placeholder={m.appointments_cancel_text_placeholder({}, options)}
				value={message.value}
				counter={cancelMessageCounter(message.value, props.locale)}
				error={null}
				maxLength={APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH}
				height="short"
				onInput={(value) => message.setValue(clampCancelMessage(value))}
				testId="appointment-cancel-text"
			/>
		</div>
		<ul class="mt-1 grid list-disc gap-1.5 ps-4 text-label-lg font-normal text-muted-foreground">
			{#each cancelThenLines(appointment, props.locale) as line, index (index)}
				<li>{line}</li>
			{/each}
		</ul>
		{#if failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="appointment-cancel-failure"
			>
				{failure}
			</p>
		{/if}
	</ChangeFrame>
{/if}
