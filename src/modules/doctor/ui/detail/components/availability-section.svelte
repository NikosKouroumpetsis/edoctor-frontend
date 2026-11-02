<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ResponsiveGrid } from '$shared/ui/molecules/responsive-grid';
	import { Button } from '$shared/ui/primitives/button';
	import { DateCard } from '$shared/ui/primitives/date-card';
	import type {
		DoctorAvailabilityDateCard,
		DoctorAvailabilitySectionContent
	} from '$modules/doctor/lib/detail';
	import Elsewhere from './elsewhere.svelte';
	import OfficeTabs from './office-tabs.svelte';
	import ProfileSection from './profile-section.svelte';

	let {
		content,
		locale,
		showAllHref,
		onOpen,
		onSelectOffice
	}: {
		content: DoctorAvailabilitySectionContent;
		locale: SupportedLocale;
		/** The window «Διαθεσιμότητα» on the first bookable day (a link: it opens in place with JavaScript). */
		showAllHref: ResolvedPathname;
		/** `date` absent: the window on the first bookable day (the section's «Εμφάνιση όλων»). */
		onOpen: (date: string | undefined, event?: MouseEvent) => void;
		onSelectOffice: (officeId: string) => void;
	} = $props();
</script>

<!-- 🔴 U-39 (app = web, the application's `AvailabilitySection`): «Διαθεσιμότητα» of the page's active office — its
     pills (the one way to switch, synced everywhere), its address, the next free days (3 a row, at most 6) that open
     the window on that day; an office with no hour points to the nearest one that has (U-37 case 3). -->
<ProfileSection id="availability" title={content.title}>
	<div class="flex flex-col gap-5">
		<OfficeTabs
			tabs={content.tabs}
			value={content.activeOfficeId}
			onChange={onSelectOffice}
			label={m.doctor_offices_label({}, { locale })}
			testId="doctor-detail-availability-tabs"
		/>
		{#if content.addressLine}
			<p data-testid="doctor-detail-availability-address" class="text-body-md text-foreground">
				{content.addressLine}
			</p>
		{/if}
		<p class="flex flex-row items-center gap-2 text-body-md font-semibold text-foreground">
			<Ionicon name="calendar-outline" class="icon-md shrink-0" />
			{content.nextTitle}
		</p>
		{#if content.cards.length === 0}
			{#if content.elsewhere}
				<Elsewhere
					content={content.elsewhere}
					{onSelectOffice}
					placement="section"
					testId="doctor-detail-availability-elsewhere"
				/>
			{:else}
				<p
					data-testid="doctor-detail-availability-section-empty"
					class="text-body-sm text-muted-foreground"
				>
					{m.doctor_booking_no_slots({}, { locale })}
				</p>
			{/if}
		{:else}
			<ResponsiveGrid
				items={content.cards}
				columns={3}
				gap="rail"
				keyExtractor={(card) => card.date}
				data-testid="doctor-detail-availability-cards"
			>
				{#snippet renderItem(card: DoctorAvailabilityDateCard)}
					<DateCard
						title={card.dateLabel}
						subtitle={card.fromLabel}
						onclick={() => onOpen(card.date)}
						testId={`doctor-detail-availability-card-${card.date}`}
					/>
				{/snippet}
			</ResponsiveGrid>
			<Button
				tone="muted"
				bordered={false}
				label={content.showAllLabel}
				href={showAllHref}
				onclick={(event: MouseEvent) => onOpen(undefined, event)}
				data-testid="doctor-detail-availability-show-all"
				class="w-full tablet:w-auto tablet:self-start"
			/>
		{/if}
	</div>
</ProfileSection>
