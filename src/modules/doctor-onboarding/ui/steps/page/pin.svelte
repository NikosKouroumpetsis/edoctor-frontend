<script lang="ts">
	import MapPinIcon from '~icons/lucide/map-pin';
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import type { MapViewCenter, MapViewMove } from '$shared/ui/organisms/map-view';
	import { DOCTOR_ONBOARDING_MAP } from '$modules/doctor-onboarding/config';
	import { isDoctorOnboardingBeyondProgress } from '$modules/doctor-onboarding/lib/steps';
	import {
		DOCTOR_ADDRESS_FIELDS,
		toDoctorOfficeAddressInput
	} from '$modules/doctor-onboarding/lib/payload';
	import {
		isValidCity,
		isValidPostalCode,
		isValidStreetLine
	} from '$modules/doctor-onboarding/lib/validation';
	import {
		formatDoctorAddress,
		readDoctorAddressValues
	} from '$modules/doctor-onboarding/lib/values';
	import Frame from '../components/frame.svelte';
	import MapBox from '../components/map-box.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'pin');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const values = $derived(readDoctorAddressValues(draft.edits, controller.progress));
	const complete = $derived(
		isValidStreetLine(values.streetLine) &&
			isValidPostalCode(values.postalCode) &&
			isValidCity(values.city) &&
			values.latitude !== null &&
			values.longitude !== null
	);
	// The map opens where the address is (read once, when the step is ready), Athens without a point.
	const start = $derived(
		values.latitude !== null && values.longitude !== null
			? { latitude: values.latitude, longitude: values.longitude }
			: DOCTOR_ONBOARDING_MAP.athens
	);
	let moved = $state(untrack(() => values.pinMoved));

	// Review w3-w4 R1 MINOR-3 (U-112.2, no silent lock): a reload before the address was saved finds no point here, in
	// the memory or on the server — the step that asks for it takes this page's place, once the progress is here
	// (D-W3-31), as the guard does for a page beyond the progress.
	$effect(() => {
		const known = controller.ready ? controller.progress : undefined;
		if (!known || isDoctorOnboardingBeyondProgress('pin', known)) return;
		if (values.latitude === null || values.longitude === null) {
			untrack(() => controller.replace('location'));
		}
	});

	/** The person's move keeps the map's centre as the office's point, and marks the pin as moved (U-109.4). */
	function onMoveEnd(center: MapViewCenter, move: MapViewMove) {
		if (!move.byUser) return;
		draft.update('office', {
			latitude: center.latitude,
			longitude: center.longitude,
			pinMoved: true
		});
	}

	/** «Επόμενο» (record §6.7.4, §5.2): the office's `address` group, the one write of the location; then its edits go. */
	async function commit(): Promise<boolean> {
		const address = complete ? toDoctorOfficeAddressInput(values) : null;
		if (!address) return false;
		const answer = await controller.save([{ kind: 'office', input: { address } }]);
		if (answer) draft.clear('office', DOCTOR_ADDRESS_FIELDS);
		return Boolean(answer);
	}

	async function next() {
		if (await commit()) controller.goNext();
	}
</script>

{#snippet pill()}
	<p
		class="flex min-h-control-lg w-full flex-row items-center gap-3 rounded-full bg-card px-5 py-2 text-body-md text-foreground shadow-overlay"
		data-testid="doctor-onboarding-pin-address"
	>
		<MapPinIcon aria-hidden="true" class="icon-md shrink-0" />
		<span class="sr-only">{m.doctor_onboarding_pin_address_label({}, options)}:</span>
		<span class="truncate">{formatDoctorAddress(values)}</span>
	</p>
{/snippet}

<!-- 37 · «Είναι η πινέζα στο σωστό σημείο;» (record §6.7.4, Airbnb's 9.30.11): the map at a doorway's zoom, the doctor's own
     address in the capsule (the one confirmed, never Google's text beside a map: record §6.6), the pin fixed in the middle
     while the map moves under it, «Σύρετε τον χάρτη…» until the first move, «+» / «−» at the bottom left. The arrows of
     the keyboard move the map too. 🔴 D-W3-33: the server alone judges whether the point stays Google's. -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_pin_title({}, options)}
	subtitle={m.doctor_onboarding_pin_subtitle({}, options)}
	next={{ disabled: !complete, onClick: () => void next() }}
	commit={complete ? commit : undefined}
	testId="doctor-onboarding-pin"
>
	<MapBox
		center={start}
		zoom={DOCTOR_ONBOARDING_MAP.pinZoom}
		marker
		live
		label={m.doctor_onboarding_pin_map_label({}, options)}
		attributionLabel={m.doctor_onboarding_pin_attribution_toggle({}, options)}
		locale={props.locale}
		zoomControls={{
			zoomInLabel: m.doctor_onboarding_pin_zoom_in({}, options),
			zoomOutLabel: m.doctor_onboarding_pin_zoom_out({}, options)
		}}
		onMoveStart={(move) => {
			if (move.byUser) moved = true;
		}}
		{onMoveEnd}
		{pill}
		tip={moved ? null : m.doctor_onboarding_pin_tip({}, options)}
		testId="doctor-onboarding-pin-map"
	/>
</Frame>
