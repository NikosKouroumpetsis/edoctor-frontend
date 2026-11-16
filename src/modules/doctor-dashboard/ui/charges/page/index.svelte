<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { AmountField } from '$shared/ui/molecules/amount-field';
	import { BulletList } from '$shared/ui/molecules/bullet-list';
	import { CheckRows } from '$shared/ui/molecules/check-rows';
	import { ContextCard } from '$shared/ui/molecules/context-card';
	import { DiffBox } from '$shared/ui/molecules/diff-box';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { visitInitials } from '$shared/ui/molecules/visit-card';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import {
		buildDoctorChargeRows,
		DOCTOR_AMOUNT_MAX_LENGTH,
		doctorChargesThenLines,
		doctorChargesTotalsRows
	} from '$modules/doctor-dashboard/lib/charges';
	import { buildDoctorAppointmentContext } from '$modules/doctor-dashboard/lib/reason';
	import { useDoctorCharges } from '../hooks';
	import type { DoctorChargesProps } from '../types';

	let { locale, appointmentId, links }: DoctorChargesProps = $props();

	const options = $derived({ locale });
	const steps = useHistorySteps('doctorAppointment');
	const leave = () => steps.leave(links.appointment);
	const read = useDoctorCharges({
		appointmentId: () => appointmentId,
		locale: () => locale,
		onDone: leave
	});
	const appointment = $derived(read.appointment);
	// `sw.js:539` (`ctxOf(a, 'Το ραντεβού')`): the box says «Το ραντεβού» whatever its state.
	const context = $derived(
		appointment
			? buildDoctorAppointmentContext(
					appointment,
					m.doctor_reason_context_appointment({}, options),
					locale
				)
			: null
	);
	const servicesId = $props.id();
	const priceHelpId = `${servicesId}-price`;

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}

	const frame = $derived({
		title: m.doctor_charges_title({}, options),
		backHref: links.appointment,
		onBack: back,
		backLabel: m.doctor_reason_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'centred' as const,
		onCancel: leave,
		backTestId: 'doctor-charges-back',
		cancelTestId: 'doctor-charges-cancel',
		saveTestId: 'doctor-charges-submit'
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
			testId="doctor-charges-context"
		/>
	{/if}
{/snippet}
{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- 🔴 Wave 5.1 · screen 70 «Υπηρεσίες και κόστος» (D-W51-52; 88 §70; `64-switch/sw.js:524-551` `svcPage`,
     `sw.css:207-217`): 🔴 U-102 a screen of its own, on the shared step screen, placed as «Αλλαγή ώρας». The box, the
     doctor's services as 🔴 U-112 rows with a tick (never tiles), «Διάρκεια» — 🔴 D-W51-52 the LONGEST, as the server
     keeps it — and «Σύνολο υπηρεσιών»; «Δεν χωράει…» from the server; «Τελική τιμή» filled in, a comma or a dot and at
     most two decimals (its own words when it is no amount); what follows; «Άκυρο» / «Αποθήκευση», asleep without a
     service or an amount and while one press is on its way. U-65.6: every word a text node. -->
{#if read.state === 'form' && appointment}
	<StepScreen
		{...frame}
		cancelLabel={m.booking_change_cancel({}, options)}
		saveLabel={m.booking_change_save({}, options)}
		saveDisabled={!read.ready || read.servicesState !== 'ready'}
		saveLoading={read.sending}
		onSave={() => read.send()}
		testId="doctor-charges"
	>
		{@render box()}
		<h3 id={servicesId} class="mt-6 mb-1 text-body-lg font-semibold text-foreground">
			{m.doctor_appointment_services({}, options)}
		</h3>
		<p class="mb-3 text-label-lg font-normal text-muted-foreground">
			{m.doctor_charges_help({}, options)}
		</p>
		{#if read.servicesState === 'ready'}
			<CheckRows
				labelledby={servicesId}
				values={read.choice.map((entry) => entry.doctorServiceId)}
				options={buildDoctorChargeRows(read.services, locale)}
				onToggle={(value) => read.toggle(value)}
				testId="doctor-charges-services"
			/>
			<DiffBox
				rows={doctorChargesTotalsRows(read.totals, locale)}
				class="mt-4"
				testId="doctor-charges-totals"
			/>
		{:else if read.servicesState === 'failed'}
			<InlineNotice
				variant="danger"
				message={m.doctor_appointment_error_body({}, options)}
				actionLabel={m.doctor_today_retry({}, options)}
				onAction={() => read.retryServices()}
				testId="doctor-charges-services-failed"
			/>
		{:else}
			<div data-testid="doctor-charges-services-loading" aria-busy="true" class="grid gap-3">
				<Skeleton class="h-pane-skeleton w-full rounded-md" />
			</div>
		{/if}
		{#if read.clash}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-charges-clash"
			>
				{read.clash}
			</p>
		{/if}
		<h3 class="mt-6 mb-1 text-body-lg font-semibold text-foreground">
			{m.doctor_charges_price_title({}, options)}
		</h3>
		<p id={priceHelpId} class="mb-3 text-label-lg font-normal text-muted-foreground">
			{m.doctor_charges_price_help({}, options)}
		</p>
		<AmountField
			value={read.amount}
			onInput={(value) => read.type(value)}
			label={m.doctor_charges_price_label({}, options)}
			symbol={m.doctor_charges_currency({}, options)}
			error={read.amountError}
			maxLength={DOCTOR_AMOUNT_MAX_LENGTH}
			describedby={priceHelpId}
			testId="doctor-charges-price"
		/>
		<BulletList items={doctorChargesThenLines(locale)} class="mt-4" testId="doctor-charges-then" />
		{#if read.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-charges-failure"
			>
				{read.failure}
			</p>
		{/if}
	</StepScreen>
{:else if read.state === 'closed'}
	<!-- D-W51-52: the services may no longer change (after «Ολοκληρώθηκε», opened late, or the server said so) — its words
	     and ONE way back to the appointment. No form. -->
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_reason_back_to_appointment({}, options)}
		onSave={leave}
		testId="doctor-charges-closed"
	>
		{@render box()}
		<NoticeCard
			tone="warm"
			role="alert"
			title={read.conflict
				? m.doctor_reason_conflict({}, options)
				: m.doctor_charges_closed({}, options)}
			testId="doctor-charges-closed-text"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_reason_back_to_appointment({}, options)}
		onSave={leave}
		bar={false}
		testId="doctor-charges-wait"
	>
		{#if read.state === 'missing'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_appointment_not_found_title({}, options)}
				description={m.doctor_appointment_not_found_body({}, options)}
				icon={calendarGlyph}
				class="pt-section"
				testId="doctor-charges-missing"
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
				testId="doctor-charges-failed"
			/>
		{:else}
			<div
				data-testid="doctor-charges-loading"
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
