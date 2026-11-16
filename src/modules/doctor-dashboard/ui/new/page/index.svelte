<script lang="ts">
	import { goto } from '$app/navigation';
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { DateStrip } from '$shared/ui/molecules/date-strip';
	import { DiffBox } from '$shared/ui/molecules/diff-box';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { RadioRows } from '$shared/ui/molecules/radio-rows';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { TimeSlotGrid } from '$shared/ui/molecules/time-slot-grid';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import { buildDoctorChargeRows } from '$modules/doctor-dashboard/lib/charges';
	import {
		buildDoctorNewSummaryRows,
		doctorNewOfficeShown,
		doctorNewSummaryNote,
		doctorNewWhenLabel,
		doctorPatientName
	} from '$modules/doctor-dashboard/lib/new';
	import Patient from '../components/patient.svelte';
	import { useDoctorNew } from '../hooks';
	import type { DoctorNewProps } from '../types';

	let { locale, from, patient, links }: DoctorNewProps = $props();

	const options = $derived({ locale });
	const steps = useHistorySteps('doctorAppointment');
	const leave = () => steps.leave(links.back);
	// 🔴 D-W51-70: once booked, its 68 in this screen's place (a step back from it leads where 72 was opened from).
	const done = (appointmentId: string) =>
		// The screen's address, already resolved (a module knows no route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(links.appointment(appointmentId), { replaceState: true });
	const read = useDoctorNew({
		locale: () => locale,
		patient: () => patient,
		onDone: done
	});
	const ids = $props.id();
	const officeShown = $derived(doctorNewOfficeShown(read.officeChoices));
	const serviceRows = $derived(buildDoctorChargeRows(read.services, locale));
	const day = $derived(read.day);

	const patientName = $derived(
		read.person?.kind === 'patient'
			? doctorPatientName(read.person.patient)
			: read.person
				? [read.person.values.firstName.trim(), read.person.values.lastName.trim()].join(' ')
				: ''
	);
	const summary = $derived(
		read.ready && read.office && read.service && read.slot
			? {
					rows: buildDoctorNewSummaryRows({
						patientName,
						office: read.office,
						service: read.service,
						when: doctorNewWhenLabel(read.slot, read.timeZone, locale),
						channels: read.channels,
						locale
					}),
					note: doctorNewSummaryNote({ channels: read.channels, balance: read.balance, locale })
				}
			: null
	);

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}

	// 🔴 D-W51-69 · D-W51-73: from «Σήμερα» or a patient's card (screen 73) a page alone in the middle
	// (`w-picked-1440.png`); from «Ραντεβού» beside its list from 1128.
	const frame = $derived({
		title: m.doctor_new_title({}, options),
		subtitle: m.doctor_new_subtitle({}, options),
		backHref: links.back,
		onBack: back,
		backLabel: m.doctor_reason_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: from === 'list' ? ('centred' as const) : ('solo' as const),
		onCancel: leave,
		backTestId: 'doctor-new-back',
		cancelTestId: 'doctor-new-cancel',
		saveTestId: 'doctor-new-submit'
	});
	const H3 = 'mt-6 mb-3 text-body-lg font-semibold text-foreground';
</script>

{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- 🔴 Wave 5.1 · screen 72 «Νέο ραντεβού» (D-W51-69 / 70; 88 §72; `64-switch/sw.js:609-659` `newPage`, `sw.css:228-258`):
     🔴 U-102 a screen of its own, never a sheet, on the shared step screen — below 744 over the tabs (its bar at the
     bottom), 744–1127 the one column of 560 in the middle; from 1128 beside the list of 67 (U-167) or, from «Σήμερα», a
     page in the middle. One page from the top down: «Ασθενής» · «Ιατρείο» (only with more than one) · «Υπηρεσία» ·
     «Ημέρα και ώρα» (🔴 U-189.1: ONLY the doctor's real free hours, screen 70's) · the summary with «Ενημέρωση» once all
     is chosen; «Άκυρο» and «Κλείσιμο ραντεβού», asleep until a patient, a service and an hour are chosen and while one
     press is on its way (U-197.2: it books it confirmed). U-65.6: every word a text node. -->
{#if read.state === 'form'}
	<StepScreen
		{...frame}
		cancelLabel={m.booking_change_cancel({}, options)}
		saveLabel={m.doctor_new_submit({}, options)}
		saveDisabled={!read.ready}
		saveLoading={read.sending}
		onSave={() => read.send()}
		testId="doctor-new"
	>
		<h3 class="mb-3 text-body-lg font-semibold text-foreground">
			{m.doctor_appointment_patient({}, options)}
		</h3>
		<Patient {read} {locale} />

		{#if officeShown}
			<h3 id={`${ids}-office`} class={H3}>{m.booking_summary_office({}, options)}</h3>
			<RadioRows
				labelledby={`${ids}-office`}
				value={read.office?.value ?? null}
				options={read.officeChoices}
				onChange={(id) => read.chooseOffice(id)}
				frame="always"
				testId="doctor-new-offices"
			/>
		{/if}

		<h3 id={`${ids}-service`} class={H3}>{m.doctor_new_service({}, options)}</h3>
		<RadioRows
			labelledby={`${ids}-service`}
			value={read.service?.id ?? null}
			options={serviceRows}
			onChange={(id) => read.chooseService(id)}
			frame="always"
			testId="doctor-new-services"
		/>

		<h3 class={`${H3} mb-1`}>{m.doctor_appointment_date_time({}, options)}</h3>
		<p
			data-testid="doctor-new-hours-help"
			class="mb-3 text-label-lg font-normal text-muted-foreground"
		>
			{m.doctor_new_hours_help({}, options)}
		</p>
		{#if !read.service}
			<p data-testid="doctor-new-hours-wait" class="text-body-sm text-muted-foreground">
				{m.doctor_new_hours_after_service({}, options)}
			</p>
		{:else if read.slotsState === 'ready'}
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
					testIdPrefix="doctor-new-day"
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
							data-testid="doctor-new-more-days"
							class="min-h-touch"
						/>
					</div>
				{/if}
				<TimeSlotGrid
					slots={(day?.slots ?? []).map((slot) => ({ label: slot.label, value: slot.startTime }))}
					value={read.slot ?? undefined}
					onChange={(startTime) => read.pick(startTime)}
					columns={4}
					variant="outline"
					emptyText={m.doctor_availability_empty({}, options)}
					testIdPrefix="doctor-new"
					aria-label={m.doctor_availability_times({}, options)}
				/>
			</div>
		{:else if read.slotsState === 'failed'}
			<InlineNotice
				variant="danger"
				message={m.doctor_availability_failed({}, options)}
				actionLabel={m.doctor_availability_retry({}, options)}
				onAction={() => read.retryHours()}
				testId="doctor-new-hours-failed"
			/>
		{:else}
			<div data-testid="doctor-new-hours-loading" aria-busy="true" class="grid gap-4">
				<Skeleton class="h-control-xl w-full rounded-lg" />
				<Skeleton class="h-placeholder-lg w-full rounded-md" />
			</div>
		{/if}

		{#if read.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-new-failure"
			>
				{read.failure}
			</p>
		{/if}
		{#if summary}
			<DiffBox rows={summary.rows} note={summary.note} testId="doctor-new-summary" />
		{/if}
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_reason_back({}, options)}
		onSave={leave}
		bar={false}
		testId="doctor-new-wait"
	>
		{#if read.state === 'failed'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_new_error_title({}, options)}
				description={m.doctor_appointment_error_body({}, options)}
				actionLabel={m.doctor_today_retry({}, options)}
				onActionPress={() => read.retry()}
				actionTone="contrast"
				icon={errorGlyph}
				class="pt-section"
				testId="doctor-new-failed"
			/>
		{:else if read.state === 'empty'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_new_empty_title({}, options)}
				description={m.doctor_new_empty_body({}, options)}
				icon={calendarGlyph}
				class="pt-section"
				testId="doctor-new-empty"
			/>
		{:else}
			<div
				data-testid="doctor-new-loading"
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
