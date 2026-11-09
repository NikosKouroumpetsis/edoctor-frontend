<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import { DateStrip } from '$shared/ui/molecules/date-strip';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { SkeletonLines } from '$shared/ui/molecules/skeleton-lines';
	import { TimeSlotGrid } from '$shared/ui/molecules/time-slot-grid';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import Elsewhere from '../components/elsewhere.svelte';
	import { doctorBookingActionGlyphs } from '../components/icons';
	import OfficeTabs from '../components/office-tabs.svelte';
	import type { AvailabilityPickerProps } from '../types';

	let {
		content,
		readState,
		booking,
		initialDate,
		staged = $bindable(null),
		locale,
		slotVariant = 'solid',
		onSelectOffice,
		onRetry
	}: AvailabilityPickerProps = $props();

	// P-W3 Σ-12: the booking's screen has no ways of its own with no time anywhere: it only says that none is free.
	const statement = $derived(
		booking ? booking.statement : m.doctor_booking_no_slots({}, { locale })
	);
	let chosenDay = $state<{ officeId: string; date: string } | null>(null);
	const days = $derived(content?.days ?? []);
	const selectedDate = $derived.by(() => {
		if (!content) return '';
		if (chosenDay?.officeId === content.activeOfficeId) return chosenDay.date;
		const hinted = days.find((day) => day.date === initialDate && !day.isDisabled);
		return hinted?.date ?? days.find((day) => !day.isDisabled)?.date ?? days[0]?.date ?? '';
	});
	const selectedDay = $derived(days.find((day) => day.date === selectedDate));
	const stagedTime = $derived(
		staged && content && staged.officeId === content.activeOfficeId && staged.date === selectedDate
			? selectedDay?.slots.find((slot) => slot.startMinute === staged?.startMinute)?.startTime
			: undefined
	);
</script>

<!-- `details/availability` and the booking's «Αλλαγή» of the hour (S-26, U-37, U-40.3, P-W3 Σ-12; the application's
     `DoctorAvailabilityModalBody`): «Επιλέξτε ιατρείο»
     and its pills, the address, the 28 days (the empty ones dimmed, S-26.1), the day's times in 4 columns; a press
     only chooses (the footer confirms). An office with no time points to the nearest one that has (case 3). -->
<div data-testid="doctor-detail-modal-availability" class="flex flex-col gap-6">
	{#if content}
		<OfficeTabs
			tabs={content.tabs}
			value={content.activeOfficeId}
			onChange={onSelectOffice}
			heading={content.officeHeading}
			testId="doctor-detail-modal-availability-tabs"
		/>
		{#if content.addressLine}
			<p
				data-testid="doctor-detail-modal-availability-address"
				class="text-body-md text-foreground"
			>
				{content.addressLine}
			</p>
		{/if}
		{#if content.elsewhere && !days.some((day) => !day.isDisabled)}
			<Elsewhere
				content={content.elsewhere}
				{onSelectOffice}
				placement="section"
				testId="doctor-detail-modal-availability-elsewhere"
			/>
		{/if}
		{#key content.activeOfficeId}
			<DateStrip
				days={days.map((day) => ({
					value: day.date,
					label: day.weekdayDayLabel,
					sublabel: day.monthLabel,
					accessibleLabel: day.accessibleLabel,
					disabled: day.isDisabled
				}))}
				value={selectedDate}
				onChange={(date) => {
					if (content) chosenDay = { officeId: content.activeOfficeId, date };
				}}
				icon="calendar-outline"
				testIdPrefix="doctor-detail-availability-day"
				aria-label={content.daysLabel}
			/>
		{/key}
		<TimeSlotGrid
			slots={(selectedDay?.slots ?? []).map((slot) => ({
				label: slot.label,
				value: slot.startTime
			}))}
			value={stagedTime}
			onChange={(startTime) => {
				const slot = selectedDay?.slots.find((entry) => entry.startTime === startTime);
				if (slot && content) {
					staged = {
						officeId: content.activeOfficeId,
						date: slot.date,
						startMinute: slot.startMinute
					};
				}
			}}
			columns={4}
			variant={slotVariant}
			emptyText={content.emptyText}
			testIdPrefix="doctor-detail-availability"
			aria-label={content.timesLabel}
		/>
	{:else if readState === 'failed'}
		<InlineNotice
			variant="danger"
			message={m.doctor_availability_failed({}, { locale })}
			actionLabel={m.doctor_availability_retry({}, { locale })}
			onAction={onRetry}
			testId="doctor-detail-modal-availability-failed"
		/>
	{:else if readState === 'answered' || readState === 'idle'}
		<!-- MINOR-1 of r1 (U-37.2 cases 1, 2): no time in the window — the page's statement and its two ways, the phone
		     under them; never a skeleton that waits for nothing. -->
		<div data-testid="doctor-detail-modal-availability-none" class="flex flex-col gap-4">
			{#if statement}
				<p class="flex flex-row items-start gap-2.5 text-body-lg font-semibold text-foreground">
					<Ionicon name="calendar-outline" class="mt-0.5 icon-md shrink-0 text-muted-foreground" />
					<span>{statement}</span>
				</p>
			{/if}
			<div class="flex flex-col gap-2.5">
				{#each booking ? [booking.primary, booking.secondary] : [] as entry, position (position)}
					{#if entry}
						<Button
							tone={position === 0 ? 'accent' : 'outline'}
							radius="full"
							size="lg"
							label={entry.label}
							href={entry.href}
							data-testid={`doctor-detail-modal-availability-action-${entry.kind}`}
							class="w-full whitespace-normal"
						>
							{#snippet leading()}
								<Ionicon
									name={doctorBookingActionGlyphs[entry.kind]}
									class={cn('icon-md shrink-0', position === 0 && 'text-secondary-foreground')}
								/>
							{/snippet}
						</Button>
					{/if}
				{/each}
			</div>
			{#if booking?.phoneLabel}
				<p class="text-center text-label-lg text-muted-foreground">{booking.phoneLabel}</p>
			{/if}
		</div>
	{:else}
		<div data-testid="doctor-detail-modal-loading" aria-busy="true">
			<SkeletonLines
				lines={[
					{ width: 'w-2/3', height: 'h-control-sm' },
					{ width: 'w-full', height: 'h-hero-skeleton', shape: 'block', startsGroup: true }
				]}
			/>
		</div>
	{/if}
</div>
