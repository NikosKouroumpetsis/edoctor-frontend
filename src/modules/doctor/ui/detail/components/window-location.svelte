<script lang="ts">
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { BadgeGroup } from '$shared/ui/molecules/badge-group';
	import type { DoctorLocation } from '$modules/doctor/lib/detail';
	import OfficeInfoRows from './office-info-rows.svelte';
	import OfficeMap from './office-map.svelte';

	let {
		location,
		officeId,
		locale
	}: { location: DoctorLocation; officeId: string | undefined; locale: SupportedLocale } = $props();

	const description = $derived(location.description?.trim());
</script>

<!-- `details/location` (U-39.1, the application's `DoctorLocationModalBody`): the active office opened — the address,
     the INTERACTIVE map (pans, zooms with the wheel and «+» / «−»), the phone (`tel:`) and floor the section leaves
     out, the facilities, the payments and the whole description; from 950 the map beside the facts. -->
<div
	data-testid="doctor-detail-modal-location"
	class="flex flex-col gap-6 split:grid split:grid-cols-12 split:items-start split:gap-x-section"
>
	{#if location.coordinates && officeId}
		<OfficeMap
			{officeId}
			coordinates={location.coordinates}
			label={[location.streetLine, location.cityLine].filter(Boolean).join(', ')}
			{locale}
			testId="doctor-detail-modal-location-map"
			class="h-office-map tablet:h-office-map-md split:col-span-8 split:h-office-map-lg"
		/>
	{/if}
	<div class="flex flex-col gap-6 split:col-span-4">
		<div data-testid="doctor-detail-modal-location-address" class="flex flex-col gap-1">
			{#if location.streetLine}
				<p class="text-body-md font-semibold text-foreground">{location.streetLine}</p>
			{/if}
			{#if location.cityLine}
				<p class="text-body-md font-semibold text-foreground">{location.cityLine}</p>
			{/if}
		</div>
		<OfficeInfoRows
			rows={[...location.contactRows, ...location.facilityRows]}
			testId="doctor-detail-modal-location-rows"
		/>
		{#if location.paymentMethods}
			<BadgeGroup
				title={location.paymentMethods.title}
				items={location.paymentMethods.options}
				testId="doctor-detail-modal-office-payment-methods"
				testIdPrefix="doctor-detail-office-payment"
			/>
		{/if}
		{#if description}
			<p
				data-testid="doctor-detail-modal-location-description"
				class="text-body-sm text-foreground/88"
			>
				{description}
			</p>
		{/if}
	</div>
</div>
