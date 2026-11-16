<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { ContextCard } from '$shared/ui/molecules/context-card';
	import { DateStrip } from '$shared/ui/molecules/date-strip';
	import { DiffBox } from '$shared/ui/molecules/diff-box';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { TimeSlotGrid } from '$shared/ui/molecules/time-slot-grid';
	import { visitInitials } from '$shared/ui/molecules/visit-card';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import {
		buildDoctorMoveContext,
		buildDoctorMoveDiff,
		doctorMoveHelp,
		doctorMoveSaveLabel
	} from '$modules/doctor-dashboard/lib/move';
	import { useDoctorMove } from '../hooks';
	import type { DoctorMoveProps } from '../types';

	let { locale, appointmentId, links }: DoctorMoveProps = $props();

	const options = $derived({ locale });
	const steps = useHistorySteps('doctorAppointment');
	const leave = () => steps.leave(links.appointment);
	const read = useDoctorMove({
		appointmentId: () => appointmentId,
		locale: () => locale,
		onDone: leave
	});
	const appointment = $derived(read.appointment);
	const context = $derived(appointment ? buildDoctorMoveContext(appointment, locale) : null);
	const day = $derived(read.day);
	const diff = $derived(
		appointment && read.picked
			? buildDoctorMoveDiff({
					appointment,
					startTime: read.picked,
					timeZone: read.timeZone,
					now: read.now,
					locale
				})
			: null
	);

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}

	const frame = $derived({
		title: m.appointments_change_time_title({}, options),
		backHref: links.appointment,
		onBack: back,
		backLabel: m.doctor_reason_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'centred' as const,
		onCancel: leave,
		backTestId: 'doctor-move-back',
		cancelTestId: 'doctor-move-cancel',
		saveTestId: 'doctor-move-submit'
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
			testId="doctor-move-context"
		/>
	{/if}
{/snippet}
{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- 🔴 Wave 5.1 · screen 70 «Αλλαγή ώρας» (D-W51-51; 88 §70; `64-switch/sw.js:483-522` `movePage`, `sw.css:202-206`):
     🔴 U-102 a screen of its own, never a sheet — the approved 52 from the doctor's side, on the shared step screen.
     Below 744 the application's page over the tabs (its bar at the bottom); 744–1127 the one column of 560 in the
     middle; from 1128 beside the list of 67, in the middle of its column (U-167). The box, «Μόνο οι ώρες που είστε
     πραγματικά ελεύθερος/η…», the days in cards and 🔴 U-189.1 ONLY the doctor's real free hours in a grid (a week at a
     time, «Επόμενες ημέρες»), «Ήταν / Νέα ώρα» with what follows and the patient's rule once an hour is chosen;
     «Άκυρο» and 🔴 U-190.2 «Αλλαγή και επιβεβαίωση» for a request (else «Αποθήκευση»), asleep until an hour is chosen
     and while one press is on its way. U-65.6: every word a text node. -->
{#if read.state === 'form' && appointment}
	<StepScreen
		{...frame}
		cancelLabel={m.booking_change_cancel({}, options)}
		saveLabel={doctorMoveSaveLabel(appointment, locale)}
		saveDisabled={!read.picked}
		saveLoading={read.sending}
		onSave={() => read.send()}
		testId="doctor-move"
	>
		{@render box()}
		<p data-testid="doctor-move-help" class="mb-5 text-label-lg font-normal text-muted-foreground">
			{doctorMoveHelp(locale)}
		</p>
		<h3 class="mb-2.5 text-body-sm font-semibold text-foreground">
			{m.appointments_change_time_pick({}, options)}
		</h3>
		{#if read.slotsState === 'ready'}
			<div class="flex flex-col gap-4">
				<DateStrip
					days={read.days.map((entry) => ({
						value: entry.date,
						label: entry.label,
						sublabel: entry.sublabel,
						accessibleLabel: entry.accessibleLabel,
						disabled: entry.disabled
					}))}
					value={day?.date ?? ''}
					onChange={(date) => read.chooseDay(date)}
					icon="calendar-outline"
					testIdPrefix="doctor-move-day"
					aria-label={m.doctor_availability_days({}, options)}
				/>
				{#if read.hasMoreDays}
					<div class="-mt-2 flex flex-row justify-end">
						<TextButton
							label={m.doctor_move_more_days({}, options)}
							tone="foreground"
							underline
							textClass="text-body-sm font-semibold"
							disabled={read.readingMoreDays}
							onclick={() => read.moreDays()}
							data-testid="doctor-move-more-days"
							class="min-h-touch"
						/>
					</div>
				{/if}
				<TimeSlotGrid
					slots={(day?.slots ?? []).map((slot) => ({ label: slot.label, value: slot.startTime }))}
					value={read.picked ?? undefined}
					onChange={(startTime) => read.pick(startTime)}
					columns={4}
					variant="outline"
					emptyText={m.doctor_availability_empty({}, options)}
					testIdPrefix="doctor-move"
					aria-label={m.doctor_availability_times({}, options)}
				/>
			</div>
		{:else if read.slotsState === 'failed'}
			<InlineNotice
				variant="danger"
				message={m.doctor_availability_failed({}, options)}
				actionLabel={m.doctor_availability_retry({}, options)}
				onAction={() => read.retryHours()}
				testId="doctor-move-hours-failed"
			/>
		{:else}
			<div data-testid="doctor-move-hours-loading" aria-busy="true" class="grid gap-4">
				<Skeleton class="h-control-xl w-full rounded-lg" />
				<Skeleton class="h-placeholder-lg w-full rounded-md" />
			</div>
		{/if}
		{#if read.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-move-failure"
			>
				{read.failure}
			</p>
		{/if}
		{#if diff}
			<DiffBox
				rows={[
					{
						id: 'was',
						label: m.appointments_change_time_was({}, options),
						value: diff.was,
						struck: true
					},
					{ id: 'next', label: m.appointments_change_time_next({}, options), value: diff.next }
				]}
				note={diff.note}
				testId="doctor-move-diff"
			/>
		{/if}
	</StepScreen>
{:else if read.state === 'closed'}
	<!-- D-W51-51 (the 69's «δεν γίνεται πια»): the hour may no longer move — opened late, or the server said so — its
	     words and ONE way back to the appointment, which shows how it stands now. No form. -->
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_reason_back_to_appointment({}, options)}
		onSave={leave}
		testId="doctor-move-closed"
	>
		{@render box()}
		<NoticeCard
			tone="warm"
			role="alert"
			title={read.conflict
				? m.doctor_reason_conflict({}, options)
				: m.doctor_move_closed({}, options)}
			testId="doctor-move-closed-text"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_reason_back_to_appointment({}, options)}
		onSave={leave}
		bar={false}
		testId="doctor-move-wait"
	>
		{#if read.state === 'missing'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_appointment_not_found_title({}, options)}
				description={m.doctor_appointment_not_found_body({}, options)}
				icon={calendarGlyph}
				class="pt-section"
				testId="doctor-move-missing"
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
				testId="doctor-move-failed"
			/>
		{:else}
			<div
				data-testid="doctor-move-loading"
				aria-busy="true"
				aria-label={frame.title}
				class="grid gap-3"
			>
				<Skeleton class="h-placeholder-lg w-full rounded-md" />
				<Skeleton class="h-pane-skeleton w-full rounded-md" />
			</div>
		{/if}
	</StepScreen>
{/if}
