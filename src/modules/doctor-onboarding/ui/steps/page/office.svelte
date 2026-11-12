<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { officeFloorValue } from '$shared/lib/office';
	import { Stepper } from '$shared/ui/molecules/stepper';
	import { TextField } from '$shared/ui/molecules/text-field';
	import {
		DOCTOR_ONBOARDING_FLOOR,
		DOCTOR_ONBOARDING_GETTING_THERE_MAX_LENGTH,
		DOCTOR_ONBOARDING_PHONE_MAX_LENGTH
	} from '$modules/doctor-onboarding/config';
	import { isDoctorOnboardingPhoneRefusal } from '$modules/doctor-onboarding/api/progress';
	import {
		DOCTOR_OFFICE_DETAILS_FIELDS,
		toDoctorOfficeDetailsInput
	} from '$modules/doctor-onboarding/lib/payload';
	import { isValidPhone, readGettingThere } from '$modules/doctor-onboarding/lib/validation';
	import { readDoctorOfficeDetailsValues } from '$modules/doctor-onboarding/lib/values';
	import DirectionsField from '../components/directions-field.svelte';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'office');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const values = $derived(
		readDoctorOfficeDetailsValues(draft.edits, controller.progress, props.showPhoneNumber)
	);
	// 🔴 W8-Σ1: what is sent is the number in the server's form (E.164), never the national digits as typed.
	const phoneNumber = $derived(props.toPhoneNumber(values.phone));
	const complete = $derived(isValidPhone(values.phone) && phoneNumber !== null);
	let phoneLeft = $state(false);
	// The server refused this number (W8-Σ1): its field says so until it changes.
	let phoneRefused = $state(false);

	/**
	 * The floor in the profile's words, by the ONE rule of the site (review w4-w0 R1 MINOR-2, the application's
	 * `floorValue` of its office step): «Υπόγειο», «Ισόγειο», «3ος».
	 */
	function floorWords(floor: number): string {
		return officeFloorValue(floor, props.locale) ?? '';
	}

	/** A new floor; the ground floor lets the elevator go, which means nothing there (`doctor.js`, record §6.8). */
	function setFloor(typed: string) {
		const floor = Number(typed);
		if (!Number.isInteger(floor)) return;
		draft.update('office', floor === 0 ? { floor, elevator: false } : { floor });
	}

	/**
	 * «Επόμενο» (record §6.8, D-W3-04): the office's `details` group — and `amenities` with the elevator off when the
	 * office comes down to the ground floor with an elevator on the server, in the same write. Then its edits go. A
	 * refused phone is said under its field, not by the frame (W8-Σ1).
	 */
	async function commit(): Promise<boolean> {
		if (!complete || phoneNumber === null) return false;
		const input = toDoctorOfficeDetailsInput(
			{ ...values, phone: phoneNumber },
			controller.progress?.office ?? null
		);
		const answer = await controller.save([{ kind: 'office', input }], (error) => {
			phoneRefused = isDoctorOnboardingPhoneRefusal(error);
			return phoneRefused;
		});
		if (answer) {
			draft.clear(
				'office',
				input.amenities
					? [...DOCTOR_OFFICE_DETAILS_FIELDS, 'elevator']
					: DOCTOR_OFFICE_DETAILS_FIELDS
			);
		}
		return Boolean(answer);
	}

	async function next() {
		if (await commit()) controller.goNext();
	}
</script>

<!-- 38 · «Πώς θα σας βρουν οι ασθενείς;» (record §6.8, U-110.3): the office's phone (required here, said wrong once the
     field is left or the server refused it, W8-Σ1), the floor as Airbnb's counter — one 64 box, «Όροφος» inside, «−»
     and «+» in 36 circles (W8-Δ4) — in the profile's words, the ground floor first (D-W3-26), −1 to 20; and the
     optional directions with their count. 🔴 U-65.6: the phone stops at 16, the directions at 1000; both show back as
     text. Nothing takes a colour under the pointer (U-100, D-W3-27). -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_office_title({}, options)}
	subtitle={m.doctor_onboarding_office_subtitle({}, options)}
	next={{ disabled: !complete, onClick: () => void next() }}
	commit={complete ? commit : undefined}
	testId="doctor-onboarding-office"
>
	<div class="flex flex-col gap-5">
		<TextField
			label={m.appointments_detail_office_phone({}, options)}
			value={values.phone}
			type="tel"
			size="lg"
			inputmode="tel"
			autocomplete="tel"
			maxlength={DOCTOR_ONBOARDING_PHONE_MAX_LENGTH}
			error={phoneRefused || (phoneLeft && values.phone.trim() !== '' && !complete)
				? m.doctor_onboarding_office_phone_error({}, options)
				: undefined}
			onChangeText={(phone) => {
				phoneRefused = false;
				draft.update('office', { phone });
			}}
			onblur={() => (phoneLeft = true)}
			data-testid="doctor-onboarding-office-phone"
		/>
		<Stepper
			label={m.doctor_detail_office_floor({}, options)}
			bind:value={() => String(values.floor), setFloor}
			min={DOCTOR_ONBOARDING_FLOOR.min}
			max={DOCTOR_ONBOARDING_FLOOR.max}
			decreaseLabel={m.doctor_onboarding_office_floor_down({}, options)}
			increaseLabel={m.doctor_onboarding_office_floor_up({}, options)}
			emptyValueLabel={floorWords(DOCTOR_ONBOARDING_FLOOR.start)}
			valueLabel={floorWords}
			hover={false}
			variant="counter"
		/>
		<DirectionsField
			label={m.doctor_onboarding_office_getting_there({}, options)}
			placeholder={m.doctor_onboarding_office_getting_there_placeholder({}, options)}
			value={values.gettingThere}
			counter={m.doctor_onboarding_office_getting_there_counter(
				{ count: values.gettingThere.length, max: DOCTOR_ONBOARDING_GETTING_THERE_MAX_LENGTH },
				options
			)}
			onInput={(gettingThere) =>
				draft.update('office', { gettingThere: readGettingThere(gettingThere) })}
		/>
	</div>
</Frame>
