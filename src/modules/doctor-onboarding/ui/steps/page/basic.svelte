<script lang="ts">
	import VenusIcon from '~icons/lucide/venus';
	import MarsIcon from '~icons/lucide/mars';
	import { m } from '$paraglide/messages.js';
	import { DateOfBirthField } from '$shared/ui/molecules/date-of-birth-field';
	import { SelectableCards } from '$shared/ui/molecules/selectable-cards';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { DOCTOR_ONBOARDING_NAME_MAX_LENGTH } from '$modules/doctor-onboarding/config';
	import { toDoctorBasicInfoInput } from '$modules/doctor-onboarding/lib/payload';
	import { isDoctorOfAge, isValidDoctorName } from '$modules/doctor-onboarding/lib/validation';
	import { readDoctorBasicValues } from '$modules/doctor-onboarding/lib/values';
	import type { DoctorOnboardingGender } from '$modules/doctor-onboarding/types';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'basic');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const values = $derived(readDoctorBasicValues(draft.edits, controller.progress));
	const adult = $derived(
		values.dateOfBirth !== '' && isDoctorOfAge(values.dateOfBirth, Date.now())
	);
	const complete = $derived(
		isValidDoctorName(values.firstName) &&
			isValidDoctorName(values.lastName) &&
			adult &&
			values.gender !== null
	);
	let touched = $state({ firstName: false, lastName: false });
	const genderHeading = $props.id();

	/** «Επόμενο» (record §6.10): the step is written; its edits leave the memory once the server holds them. */
	async function commit(): Promise<boolean> {
		const input = complete ? toDoctorBasicInfoInput(values) : null;
		if (!input) return false;
		const answer = await controller.save([{ kind: 'basic-info', input }]);
		if (answer) draft.clear('basicInfo');
		return Boolean(answer);
	}

	async function next() {
		if (await commit()) controller.goNext();
	}
</script>

{#snippet venus()}<VenusIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet mars()}<MarsIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}

<!-- 34 · «Τα στοιχεία σας» (record §6.4, §6.2.1): the names as on the ID (the account's, prefilled), the date of birth
     (at least 18, «Πρέπει να είστε τουλάχιστον 18 ετών.»), the sex as two cards one under the other (U-112.1), none
     taking a colour under the pointer (U-100). 🔴 U-65.6: each name stops at the server's 100 and shows back as text. -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_basic_title({}, options)}
	subtitle={m.doctor_onboarding_basic_subtitle({}, options)}
	next={{ disabled: !complete, onClick: () => void next() }}
	commit={complete ? commit : undefined}
	testId="doctor-onboarding-basic"
>
	<div class="flex flex-col gap-4">
		<div class="grid grid-cols-2 gap-3">
			<TextField
				label={m.auth_register_first_name_label({}, options)}
				value={values.firstName}
				size="lg"
				autocomplete="given-name"
				maxlength={DOCTOR_ONBOARDING_NAME_MAX_LENGTH}
				invalid={touched.firstName && !isValidDoctorName(values.firstName)}
				onChangeText={(firstName) => draft.update('basicInfo', { firstName })}
				onblur={() => (touched.firstName = true)}
				data-testid="doctor-onboarding-first-name"
			/>
			<TextField
				label={m.auth_register_last_name_label({}, options)}
				value={values.lastName}
				size="lg"
				autocomplete="family-name"
				maxlength={DOCTOR_ONBOARDING_NAME_MAX_LENGTH}
				invalid={touched.lastName && !isValidDoctorName(values.lastName)}
				onChangeText={(lastName) => draft.update('basicInfo', { lastName })}
				onblur={() => (touched.lastName = true)}
				data-testid="doctor-onboarding-last-name"
			/>
		</div>
		<!-- 🔴 U-129.1: one date field, as `33-doctor/shots/final/03-basic.png` («12/04/1985», the calendar). -->
		<DateOfBirthField
			variant="single"
			label={m.date_of_birth_field_label({}, options)}
			size="lg"
			bind:value={
				() => values.dateOfBirth,
				(dateOfBirth: string) => draft.update('basicInfo', { dateOfBirth })
			}
			error={values.dateOfBirth && !adult
				? m.doctor_onboarding_basic_under_age({}, options)
				: undefined}
		/>
	</div>
	<section class="mt-section flex flex-col gap-3">
		<h2 id={genderHeading} class="text-body-lg font-semibold text-foreground">
			{m.auth_register_gender_label({}, options)}
		</h2>
		<SelectableCards
			labelledBy={genderHeading}
			hover={false}
			value={values.gender ?? undefined}
			onChange={(gender) => draft.update('basicInfo', { gender: gender as DoctorOnboardingGender })}
			options={[
				{ value: 'FEMALE', title: m.auth_register_gender_female({}, options), icon: venus },
				{ value: 'MALE', title: m.auth_register_gender_male({}, options), icon: mars }
			]}
			testId="doctor-onboarding-gender"
		/>
	</section>
</Frame>
