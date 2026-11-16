<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { createForm } from '$shared/lib/form';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { ActionOffer } from '$shared/ui/molecules/action-offer';
	import { BulletList } from '$shared/ui/molecules/bullet-list';
	import { ContextCard } from '$shared/ui/molecules/context-card';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { NoteField } from '$shared/ui/molecules/note-field';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { RadioRows } from '$shared/ui/molecules/radio-rows';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { visitInitials } from '$shared/ui/molecules/visit-card';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import { DOCTOR_REASON_TEXT_MAX_LENGTH } from '$modules/doctor-dashboard/config';
	import {
		buildDoctorReasonContext,
		clampDoctorReasonText,
		doctorReasonCopy,
		doctorReasonCounter,
		doctorReasonOptions,
		doctorReasonSoon,
		doctorReasonThenLines,
		isDoctorReason,
		toDoctorCancelRequest,
		toDoctorRejectRequest
	} from '$modules/doctor-dashboard/lib/reason';
	import { useDoctorReason } from '../hooks';
	import type { DoctorReasonProps } from '../types';

	let { locale, appointmentId, step, links }: DoctorReasonProps = $props();

	const options = $derived({ locale });
	const steps = useHistorySteps('doctorAppointment');
	const leave = () => steps.leave(links.appointment);
	const read = useDoctorReason({
		appointmentId: () => appointmentId,
		step: () => step,
		locale: () => locale,
		onDone: leave
	});
	const appointment = $derived(read.appointment);
	const copy = $derived(doctorReasonCopy(step, locale));
	const context = $derived(
		appointment ? buildDoctorReasonContext(appointment, step, locale) : null
	);
	const soon = $derived(appointment ? doctorReasonSoon(appointment, step, read.now, locale) : null);
	const reasonsId = $props.id();

	// The reason (required: the button sleeps without one) and the words, in the shared form (the contract's «Form
	// state»): what travels is the lib's body, the words trimmed and left out when blank.
	const form = createForm({
		initialValues: { reason: '', message: '' },
		validators: {
			reason: [(value) => (isDoctorReason(step, value) ? null : { required: true })],
			message: [
				(value) =>
					typeof value === 'string' && value.length > DOCTOR_REASON_TEXT_MAX_LENGTH
						? { maxLength: true }
						: null
			]
		},
		onSubmit: (values) => {
			const body =
				step === 'reject'
					? toDoctorRejectRequest(values.reason, values.message)
					: toDoctorCancelRequest(values.reason, values.message);
			if (body) read.send(body);
		}
	});
	const reason = form.field('reason');
	const message = form.field('message');

	function submit() {
		if (read.sending || !reason.value) return;
		void form.handleSubmit();
	}

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}

	// 🔴 D-W51-47 · D-W51-51 (`sw.js:472`; the 53's way): «Αλλαγή ώρας» opens screen 70 one more step on, so leaving it
	// comes back through here to the 68; only while the server lets the hour move.
	const offerShown = $derived(Boolean(read.appointment?.actions.canReschedule));
	function openTime(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		steps.open(links.time, steps.depth + 1);
	}

	const frame = $derived({
		title: copy.title,
		backHref: links.appointment,
		onBack: back,
		backLabel: m.doctor_reason_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'centred' as const,
		onCancel: leave,
		backTestId: 'doctor-reason-back',
		cancelTestId: 'doctor-reason-keep',
		saveTestId: 'doctor-reason-submit'
	});
</script>

{#snippet initials()}
	<Avatar size="lg" class="size-row" aria-hidden="true">
		<AvatarFallback class="text-body-lg text-foreground"
			>{visitInitials(context?.name ?? '')}</AvatarFallback
		>
	</Avatar>
{/snippet}
{#snippet box()}
	{#if context}
		<ContextCard
			leading={initials}
			label={context.label}
			title={context.title}
			lines={context.lines}
			testId="doctor-reason-context"
		/>
	{/if}
{/snippet}
{#snippet call()}
	{#if soon?.call}
		{m.doctor_reason_soon_call({}, options)}
		<a
			href={`tel:${soon.call.dial}`}
			data-testid="doctor-reason-call"
			class="-my-3 inline-flex min-h-touch min-w-touch items-center font-semibold text-primary-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{soon.call.label}
		</a>
	{/if}
{/snippet}
{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- 🔴 Wave 5.1 · screen 69 «Απόρριψη αιτήματος» / «Ακύρωση ραντεβού» (D-W51-46 … 48; 88 §69; `64-switch/sw.js:446-480`,
     `sw.css:191-199`): 🔴 U-102 a screen of its own, never a sheet — the approved 53 from the doctor's side, on the
     shared step screen (D-W51-50). Below 744 the application's page over the tabs (its bar at the bottom); 744–1127 the
     one column of 560 in the middle; from 1128 beside the list of 67, in the middle of its column (U-167), «‹» there
     too. The box of the appointment, «Το ραντεβού είναι σε …» for a cancellation within a day (a number to call), the
     reasons of the server's list (none chosen) — over them, while the hour may move, «Θέλετε απλώς άλλη ώρα;» to
     screen 70 (D-W51-47 / 51) —, the words to the patient up to 500, what will happen; «Να μείνει» and
     the red button, 🔴 D-W51-47 locked until a reason is chosen and while one press is on its way. U-65.6: every word a
     text node. -->
{#if read.state === 'form'}
	<StepScreen
		{...frame}
		cancelLabel={m.doctor_reason_keep({}, options)}
		saveLabel={copy.title}
		saveDisabled={!reason.value}
		saveLoading={read.sending}
		onSave={submit}
		testId="doctor-reason"
	>
		{@render box()}
		{#if soon}
			<NoticeCard
				tone="warm"
				title={soon.text}
				detail={soon.call ? call : undefined}
				testId="doctor-reason-soon"
				class="mb-4"
			/>
		{/if}
		{#if offerShown}
			<ActionOffer
				title={m.appointments_cancel_offer_title({}, options)}
				body={step === 'reject'
					? m.doctor_reason_offer_reject({}, options)
					: m.doctor_reason_offer_cancel({}, options)}
				action={m.appointments_detail_reschedule({}, options)}
				href={links.time}
				onOpen={openTime}
				testId="doctor-reason-offer"
				actionTestId="doctor-reason-offer-time"
			/>
		{/if}
		<h3 id={reasonsId} class="mt-6 mb-3 text-body-lg font-semibold text-foreground">
			{m.doctor_reason_pick({}, options)}
		</h3>
		<RadioRows
			labelledby={reasonsId}
			value={reason.value || null}
			options={doctorReasonOptions(step, locale)}
			onChange={(value) => {
				reason.setValue(value);
				read.clearFailure();
			}}
			frame="always"
			testId="doctor-reason-reasons"
		/>
		<div class="mt-6">
			<NoteField
				label={m.doctor_reason_message_label({}, options)}
				labelAs="h3"
				placeholder={m.doctor_reason_message_placeholder({}, options)}
				value={message.value}
				counter={doctorReasonCounter(message.value, locale)}
				error={null}
				maxLength={DOCTOR_REASON_TEXT_MAX_LENGTH}
				height="short"
				onInput={(value) => message.setValue(clampDoctorReasonText(value))}
				testId="doctor-reason-message"
			/>
		</div>
		<BulletList items={doctorReasonThenLines(step, locale)} testId="doctor-reason-then" />
		{#if read.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-reason-failure"
			>
				{read.failure}
			</p>
		{/if}
	</StepScreen>
{:else if read.state === 'closed'}
	<!-- D-W51-48 (the 53's `late`): the step is no longer allowed — opened late, or a `409` said it changed meanwhile —
	     its words and ONE way back to the appointment, which shows how it stands now. No form. -->
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_reason_back_to_appointment({}, options)}
		onSave={leave}
		testId="doctor-reason-closed"
	>
		{@render box()}
		<NoticeCard
			tone="warm"
			role="alert"
			title={read.conflict ? m.doctor_reason_conflict({}, options) : copy.closed}
			testId="doctor-reason-closed-text"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_reason_back_to_appointment({}, options)}
		onSave={leave}
		bar={false}
		testId="doctor-reason-wait"
	>
		{#if read.state === 'missing'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_appointment_not_found_title({}, options)}
				description={m.doctor_appointment_not_found_body({}, options)}
				icon={calendarGlyph}
				class="pt-section"
				testId="doctor-reason-missing"
			/>
		{:else if read.state === 'failed'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_appointment_error_title({}, options)}
				description={m.doctor_appointment_error_body({}, options)}
				actionLabel={m.doctor_today_retry({}, options)}
				onActionPress={() => read.retry()}
				actionTone="contrast"
				icon={errorGlyph}
				class="pt-section"
				testId="doctor-reason-failed"
			/>
		{:else}
			<div
				data-testid="doctor-reason-loading"
				aria-busy="true"
				aria-label={copy.title}
				class="grid gap-3"
			>
				<Skeleton class="h-placeholder-lg w-full rounded-md" />
				<Skeleton class="h-pane-skeleton w-full rounded-md" />
			</div>
		{/if}
	</StepScreen>
{/if}
