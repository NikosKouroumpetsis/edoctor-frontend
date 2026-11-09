<script lang="ts">
	import MapPinIcon from '~icons/lucide/map-pin';
	import SearchIcon from '~icons/lucide/search';
	import { m } from '$paraglide/messages.js';
	import { DOCTOR_ONBOARDING_MAP } from '$modules/doctor-onboarding/config';
	import {
		formatDoctorAddress,
		readDoctorAddressValues
	} from '$modules/doctor-onboarding/lib/values';
	import Frame from '../components/frame.svelte';
	import MapBox from '../components/map-box.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'location');
	const options = $derived({ locale: props.locale });
	const values = $derived(readDoctorAddressValues(controller.draft.edits, controller.progress));
	const address = $derived(values.streetLine.trim() ? formatDoctorAddress(values) : null);
	const point = $derived(
		values.latitude !== null && values.longitude !== null
			? { latitude: values.latitude, longitude: values.longitude }
			: null
	);

	function openSearch(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		event.preventDefault();
		controller.open('address-search');
	}
</script>

{#snippet pill()}
	<!-- The search's address, already resolved by the screen. -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		href={controller.hrefOf('address-search')}
		aria-label={address
			? m.doctor_onboarding_location_change_label({ address }, options)
			: undefined}
		data-testid="doctor-onboarding-location-pill"
		class="flex min-h-control-lg w-full flex-row items-center gap-3 rounded-full bg-card px-5 py-2 text-left text-body-md text-foreground shadow-overlay outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		onclick={openSearch}
	>
		{#if address}
			<MapPinIcon aria-hidden="true" class="icon-md shrink-0" />
			<span class="truncate">{address}</span>
		{:else}
			<SearchIcon aria-hidden="true" class="icon-md shrink-0" />
			<span class="truncate text-muted-foreground">
				{m.doctor_onboarding_location_placeholder({}, options)}
			</span>
		{/if}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/snippet}

<!-- 37 · «Πού βρίσκεται το ιατρείο σας;» (record §6.7.1): a still map (Athens at a city's zoom; with an address, the
     address at street level under the pin) and the white capsule that opens the address search as a page of its own
     (U-102). «Επόμενο» writes nothing: it opens «Επιβεβαιώστε τη διεύθυνση». The doctor's address only, never Google's
     list, beside the map (record §6.6, U-109.4). -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_location_title({}, options)}
	subtitle={m.doctor_onboarding_location_subtitle({}, options)}
	next={{ disabled: !address, onClick: () => controller.goNext() }}
	testId="doctor-onboarding-location"
>
	{#key point ? `${point.latitude},${point.longitude}` : 'athens'}
		<MapBox
			center={point ?? DOCTOR_ONBOARDING_MAP.athens}
			zoom={point ? DOCTOR_ONBOARDING_MAP.addressZoom : DOCTOR_ONBOARDING_MAP.cityZoom}
			marker={point !== null && address !== null}
			label={m.doctor_onboarding_pin_map_label({}, options)}
			attributionLabel={m.doctor_onboarding_pin_attribution_toggle({}, options)}
			locale={props.locale}
			{pill}
			testId="doctor-onboarding-location-map"
		/>
	{/key}
</Frame>
