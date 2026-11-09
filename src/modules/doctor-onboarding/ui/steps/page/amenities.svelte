<script lang="ts">
	import ParkingIcon from '~icons/lucide/square-parking';
	import AccessIcon from '~icons/lucide/accessibility';
	import ElevatorIcon from '~icons/lucide/arrow-up-down';
	import TransitIcon from '~icons/lucide/bus-front';
	import { m } from '$paraglide/messages.js';
	import {
		SelectableCards,
		type SelectableCardsOption
	} from '$shared/ui/molecules/selectable-cards';
	import {
		DOCTOR_AMENITY_FIELDS,
		toDoctorAmenitiesEdits,
		toDoctorAmenitiesInput,
		toggleDoctorParkingKind,
		type DoctorAmenityChoice
	} from '$modules/doctor-onboarding/lib/payload';
	import {
		readDoctorAmenitiesValues,
		readDoctorOfficeDetailsValues
	} from '$modules/doctor-onboarding/lib/values';
	import type { DoctorOnboardingParkingKind } from '$modules/doctor-onboarding/types';
	import AmenityDetails from '../components/amenity-details.svelte';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'amenities');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const floor = $derived(readDoctorOfficeDetailsValues(draft.edits, controller.progress).floor);
	const values = $derived(readDoctorAmenitiesValues(draft.edits, controller.progress, floor));
	const chosen = $derived(
		(['parking', 'disabilityAccess', 'elevator', 'nearPublicTransport'] as const).filter(
			(choice) => values[choice]
		)
	);
	const groupHeading = $props.id();

	const PARKING_KINDS: { kind: DoctorOnboardingParkingKind; label: () => string }[] = [
		{ kind: 'PRIVATE', label: () => m.doctor_onboarding_amenities_parking_private({}, options) },
		{
			kind: 'PUBLIC_NEARBY',
			label: () => m.doctor_onboarding_amenities_parking_public({}, options)
		},
		{ kind: 'STREET', label: () => m.doctor_onboarding_amenities_parking_street({}, options) }
	];

	/** The cards (record §6.8): Parking and step-free access with their details, the elevator only off the ground floor. */
	const cards = $derived.by((): SelectableCardsOption[] => {
		const list: (SelectableCardsOption & { value: DoctorAmenityChoice })[] = [
			{
				value: 'parking',
				title: m.doctor_onboarding_amenities_parking({}, options),
				description: m.doctor_onboarding_amenities_parking_hint({}, options),
				icon: parkingIcon,
				details: parkingDetails
			},
			{
				value: 'disabilityAccess',
				title: m.doctor_onboarding_amenities_access({}, options),
				description: m.doctor_onboarding_amenities_access_hint({}, options),
				icon: accessIcon,
				details: accessDetails
			}
		];
		if (floor !== 0) {
			list.push({
				value: 'elevator',
				title: m.doctor_onboarding_amenities_lift({}, options),
				description:
					floor < 0
						? m.doctor_onboarding_amenities_lift_basement({}, options)
						: m.doctor_onboarding_amenities_lift_floor({ floor }, options),
				icon: elevatorIcon
			});
		}
		list.push({
			value: 'nearPublicTransport',
			title: m.doctor_onboarding_amenities_transit({}, options),
			description: m.doctor_onboarding_amenities_transit_hint({}, options),
			icon: transitIcon
		});
		return list;
	});

	/** The cards chosen: a parent let go takes its details with it (`doctor.js:291`). */
	function choose(next: string[] | string | undefined) {
		const list = Array.isArray(next) ? next : [];
		draft.update('office', toDoctorAmenitiesEdits(values, list, floor));
	}

	/** «Επόμενο» (record §6.8): the office's `amenities` group, every detail with its parent (Ε6); then its edits go. */
	async function commit(): Promise<boolean> {
		const answer = await controller.save([
			{ kind: 'office', input: { amenities: toDoctorAmenitiesInput(values, floor) } }
		]);
		if (answer) draft.clear('office', DOCTOR_AMENITY_FIELDS);
		return Boolean(answer);
	}

	async function next() {
		if (await commit()) controller.goNext();
	}
</script>

{#snippet parkingIcon()}<ParkingIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet accessIcon()}<AccessIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet elevatorIcon()}<ElevatorIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet transitIcon()}<TransitIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}

{#snippet parkingDetails()}
	<AmenityDetails
		title={m.doctor_onboarding_amenities_parking_kind({}, options)}
		testId="doctor-onboarding-parking-kind"
		details={PARKING_KINDS.map(({ kind, label }) => ({
			id: kind,
			label: label(),
			checked: values.parkingKinds.includes(kind),
			onToggle: () =>
				draft.update('office', {
					parkingKinds: toggleDoctorParkingKind(values.parkingKinds, kind)
				})
		}))}
	/>
{/snippet}

{#snippet accessDetails()}
	<AmenityDetails
		title={m.doctor_onboarding_amenities_access_more({}, options)}
		testId="doctor-onboarding-access-detail"
		details={[
			{
				id: 'accessibleToilet',
				label: m.doctor_onboarding_amenities_access_toilet({}, options),
				checked: values.accessibleToilet,
				onToggle: () => draft.update('office', { accessibleToilet: !values.accessibleToilet })
			},
			{
				id: 'accessibleParking',
				label: m.doctor_onboarding_amenities_access_parking({}, options),
				checked: values.accessibleParking,
				onToggle: () => draft.update('office', { accessibleParking: !values.accessibleParking })
			}
		]}
	/>
{/snippet}

<!-- 38 · «Τι θα βρουν οι ασθενείς στο ιατρείο;» (record §6.8, U-110.2 / U-112.1): the choices as cards one under the
     other, never tiles; Parking and «Πρόσβαση ΑμεΑ» open their details under them, 24 in, which go when their card is let
     go (Ε6); the elevator only off the ground floor. All optional. Nothing takes a colour under the pointer (U-100). -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_amenities_title({}, options)}
	subtitle={m.doctor_onboarding_amenities_subtitle({}, options)}
	next={{ onClick: () => void next() }}
	{commit}
	testId="doctor-onboarding-amenities"
>
	<h2 id={groupHeading} class="sr-only">
		{m.doctor_onboarding_amenities_group_label({}, options)}
	</h2>
	<SelectableCards
		type="multiple"
		labelledBy={groupHeading}
		hover={false}
		value={chosen}
		onChange={choose}
		options={cards}
		testId="doctor-onboarding-amenity"
	/>
</Frame>
