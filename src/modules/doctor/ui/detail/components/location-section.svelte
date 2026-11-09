<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { BadgeGroup } from '$shared/ui/molecules/badge-group';
	import type { DoctorAvailabilityOfficeTab, DoctorLocation } from '$modules/doctor/lib/detail';
	import { OfficeTabs } from '$modules/doctor/ui/availability-picker';
	import OfficeInfoRows from './office-info-rows.svelte';
	import OfficeMap from './office-map.svelte';
	import ProfileSection from './profile-section.svelte';

	let {
		location,
		tabs,
		activeOfficeId,
		locale,
		openHref,
		onOpen,
		onSelectOffice
	}: {
		location: DoctorLocation;
		tabs: DoctorAvailabilityOfficeTab[];
		activeOfficeId: string | undefined;
		locale: SupportedLocale;
		/** `details/location` of the active office. */
		openHref: ResolvedPathname;
		onOpen: (event?: MouseEvent) => void;
		onSelectOffice: (officeId: string) => void;
	} = $props();

	const description = $derived(location.description?.trim());
</script>

<!-- 🔴 U-39.1 (app = web, the application's `LocationSection`): «Τοποθεσία» IS the page's active office — its pills
     (U-39.2), address, map (that office alone; the phone's press, or the «⤢» from 744, opens the location's window),
     payments, floor, parking, access and description. An office never geocoded has no map. From 744 the payments and
     rows beside the description (the prototype's `.p-loc-grid`). -->
<ProfileSection id="location" title={m.doctor_section_location({}, { locale })}>
	<div class="flex flex-col gap-5">
		{#if activeOfficeId}
			<OfficeTabs
				{tabs}
				value={activeOfficeId}
				onChange={onSelectOffice}
				label={m.doctor_offices_label({}, { locale })}
				tabTestIdPrefix="doctor-detail-location-tab"
				testId="doctor-detail-location-tabs"
			/>
		{/if}
		<div data-testid="doctor-detail-location-address" class="flex flex-col gap-1">
			{#if location.streetLine}
				<p class="text-body-md font-semibold text-foreground">{location.streetLine}</p>
			{/if}
			{#if location.cityLine}
				<p class="text-body-md font-semibold text-foreground">{location.cityLine}</p>
			{/if}
		</div>
		{#if location.coordinates && activeOfficeId}
			<OfficeMap
				officeId={activeOfficeId}
				coordinates={location.coordinates}
				label={[location.streetLine, location.cityLine].filter(Boolean).join(', ')}
				{locale}
				{openHref}
				{onOpen}
				testId="doctor-detail-location-map"
				class="h-office-map tablet:h-office-map-md laptop:h-office-map-lg"
			/>
		{/if}
		<!-- U-68.1 Π8: the way to the office's page, always, also without a map. -->
		<a
			href={openHref}
			onclick={(event) => onOpen(event)}
			data-testid="doctor-detail-location-more"
			class="-my-3 inline-flex min-h-touch w-fit min-w-touch flex-row items-center gap-1 text-body-lg font-semibold text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{m.doctor_expand({}, { locale })}
			<Ionicon name="chevron-forward" class="icon-sm no-underline" />
		</a>
		<div class="flex flex-col gap-5 tablet:grid tablet:grid-cols-2 tablet:gap-x-profile-columns">
			<div class="flex flex-col gap-5">
				{#if location.paymentMethods}
					<BadgeGroup
						title={location.paymentMethods.title}
						items={location.paymentMethods.options}
						testId="doctor-detail-office-payment-methods"
						testIdPrefix="doctor-detail-office-payment"
					/>
				{/if}
				<OfficeInfoRows rows={location.facilityRows} testId="doctor-detail-location-facilities" />
			</div>
			{#if description}
				<p
					data-testid="doctor-detail-location-description"
					class="line-clamp-2 text-body-sm text-foreground/88"
				>
					{description}
				</p>
			{/if}
		</div>
	</div>
</ProfileSection>
