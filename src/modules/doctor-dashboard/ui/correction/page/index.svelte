<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { BulletList } from '$shared/ui/molecules/bullet-list';
	import { ContextCard } from '$shared/ui/molecules/context-card';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { RadioRows } from '$shared/ui/molecules/radio-rows';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { TermsBox } from '$shared/ui/molecules/terms-box';
	import { visitInitials } from '$shared/ui/molecules/visit-card';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import {
		buildDoctorCorrectionContext,
		buildDoctorCorrectionNow,
		doctorCorrectionOptions,
		doctorCorrectionTarget,
		doctorCorrectionThenLines
	} from '$modules/doctor-dashboard/lib/correction';
	import {
		doctorSettledVerdict,
		type DoctorAppointmentOutcomeAnswer
	} from '$modules/doctor-dashboard/lib/detail';
	import { useDoctorCorrection } from '../hooks';
	import type { DoctorCorrectionProps } from '../types';

	let { locale, appointmentId, links }: DoctorCorrectionProps = $props();

	const options = $derived({ locale });
	const steps = useHistorySteps('doctorAppointment');
	const leave = () => steps.leave(links.appointment);
	const read = useDoctorCorrection({
		appointmentId: () => appointmentId,
		locale: () => locale,
		onDone: leave
	});
	const appointment = $derived(read.appointment);
	const context = $derived(appointment ? buildDoctorCorrectionContext(appointment, locale) : null);
	const now = $derived(appointment ? buildDoctorCorrectionNow(appointment, locale) : null);
	const current = $derived(appointment ? doctorSettledVerdict(appointment.status) : null);
	const rows = $derived(appointment ? doctorCorrectionOptions(appointment, locale) : []);

	// «Τι έγινε τελικά;»: the verdict it holds is checked until the doctor picks (`sw.js:567`); only the opposite the
	// server opens ever travels (`doctorCorrectionTarget`), so the button sleeps on the current one.
	let chosen = $state<DoctorAppointmentOutcomeAnswer | null>(null);
	const picked = $derived(chosen ?? current);
	const target = $derived(appointment ? doctorCorrectionTarget(appointment, picked) : null);
	const then = $derived(doctorCorrectionThenLines(current, picked, locale));
	const pickId = $props.id();

	function choose(value: string) {
		if (value !== 'NO_SHOW' && value !== 'COMPLETED') return;
		chosen = value;
		read.clearFailure();
	}

	function submit() {
		if (read.sending || !target) return;
		read.send(target);
	}

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}

	const frame = $derived({
		title: m.doctor_correction_title({}, options),
		backHref: links.appointment,
		onBack: back,
		backLabel: m.doctor_reason_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'centred' as const,
		onCancel: leave,
		backTestId: 'doctor-correction-back',
		cancelTestId: 'doctor-correction-cancel',
		saveTestId: 'doctor-correction-submit'
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
			testId="doctor-correction-context"
		/>
	{/if}
{/snippet}
{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- 🔴 Wave 5.1 · screen 71 «Διόρθωση έκβασης» (D-W51-62; 88 §71; `64-switch/sw.js:557-577` `fixPage`, `sw.css:223-225`):
     🔴 U-102 a screen of its own, never a sheet — the 69's frame (the shared step screen). Below 744 the application's
     page over the tabs (its bar at the bottom); 744–1127 the one column of 560 in the middle; from 1128 beside the list
     of 67, in the 68's place, in the middle of its column (U-167). The box of the visit, «Τώρα» (the verdict, who wrote
     it, until when — the server's instants), «Τι έγινε τελικά;» in two rows (the current one «όπως είναι τώρα»), what
     will happen, «Άκυρο» and «Αποθήκευση», which opens only on the other verdict. U-65.6: every word a text node. -->
{#if read.state === 'form'}
	<StepScreen
		{...frame}
		cancelLabel={m.booking_change_cancel({}, options)}
		saveLabel={m.booking_change_save({}, options)}
		saveDisabled={!target}
		saveLoading={read.sending}
		onSave={submit}
		testId="doctor-correction"
	>
		{@render box()}
		{#if now && now.lines.length > 0}
			<TermsBox title={now.title} lines={now.lines} testId="doctor-correction-now" class="mb-6" />
		{/if}
		<h3 id={pickId} class="mb-3 text-body-lg font-semibold text-foreground">
			{m.doctor_correction_pick({}, options)}
		</h3>
		<RadioRows
			labelledby={pickId}
			value={picked}
			options={rows}
			onChange={choose}
			frame="always"
			testId="doctor-correction-verdicts"
		/>
		<BulletList items={then} testId="doctor-correction-then" class="mt-4" />
		{#if read.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-correction-failure"
			>
				{read.failure}
			</p>
		{/if}
	</StepScreen>
{:else if read.state === 'closed'}
	<!-- D-W51-62 (the 69's «δεν γίνεται πια»): the correction is no longer open — opened late, the window passed, another
	     refusal — or the patient already wrote a review (U-196.1): its words and ONE way back to the appointment, which
	     shows how it stands now. No form. -->
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_reason_back_to_appointment({}, options)}
		onSave={leave}
		testId="doctor-correction-closed"
	>
		{@render box()}
		<NoticeCard
			tone="warm"
			role="alert"
			title={read.refusal === 'rated'
				? m.doctor_correction_rated({}, options)
				: m.doctor_correction_closed({}, options)}
			testId="doctor-correction-closed-text"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_reason_back_to_appointment({}, options)}
		onSave={leave}
		bar={false}
		testId="doctor-correction-wait"
	>
		{#if read.state === 'missing'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_appointment_not_found_title({}, options)}
				description={m.doctor_appointment_not_found_body({}, options)}
				icon={calendarGlyph}
				class="pt-section"
				testId="doctor-correction-missing"
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
				testId="doctor-correction-failed"
			/>
		{:else}
			<div
				data-testid="doctor-correction-loading"
				aria-busy="true"
				aria-label={m.doctor_correction_title({}, options)}
				class="grid gap-3"
			>
				<Skeleton class="h-placeholder-lg w-full rounded-md" />
				<Skeleton class="h-pane-skeleton w-full rounded-md" />
			</div>
		{/if}
	</StepScreen>
{/if}
