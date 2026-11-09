<script lang="ts">
	import StethoscopeIcon from '~icons/lucide/stethoscope';
	import ChevronIcon from '~icons/lucide/chevron-right';
	import { m } from '$paraglide/messages.js';
	import { DateOfBirthField } from '$shared/ui/molecules/date-of-birth-field';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { DOCTOR_ONBOARDING_LICENSE_NUMBER_MAX_LENGTH } from '$modules/doctor-onboarding/config';
	import { toDoctorLicenseInput } from '$modules/doctor-onboarding/lib/payload';
	import { readDoctorProfessionLabel } from '$modules/doctor-onboarding/lib/professions';
	import {
		isValidLicenseDate,
		isValidLicenseNumber
	} from '$modules/doctor-onboarding/lib/validation';
	import { readDoctorProfessionalValues } from '$modules/doctor-onboarding/lib/values';
	import Frame from '../components/frame.svelte';
	import { useDoctorProfessions } from '../hooks/use-professions.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'specialty');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const professions = useDoctorProfessions(
		() => props.locale,
		() => controller.signedIn
	);
	const values = $derived(readDoctorProfessionalValues(draft.edits, controller.progress));
	const chosen = $derived(readDoctorProfessionLabel(professions.options, values.professionalId));
	const complete = $derived(
		values.professionalId !== null &&
			isValidLicenseNumber(values.licenseNumber) &&
			isValidLicenseDate(values.licenseObtainedDate, Date.now())
	);
	// Review w3-w4 R1 MINOR-1 (U-65.6, the booking's MINOR-4): a day typed half, wrong or ahead empties the value, and
	// an empty value would CLEAR the saved one. Something typed that is no date is never «no date»: «Επόμενο» says so
	// under the field and writes nothing.
	let dateTyped = $state(false);
	let dateUnfinished = $state(false);
	const dateHalf = $derived(dateTyped && values.licenseObtainedDate === '');

	/** «Επόμενο» (record §6.4, Ε5 = Α): the specialty, then the license (a blank one clears it); then the edits go. */
	async function commit(): Promise<boolean> {
		if (!complete || values.professionalId === null) return false;
		if (dateHalf) {
			dateUnfinished = true;
			return false;
		}
		const answer = await controller.save([
			{ kind: 'professional', professionalId: values.professionalId },
			{ kind: 'license', input: toDoctorLicenseInput(values) }
		]);
		if (answer) draft.clear('professional');
		return Boolean(answer);
	}

	async function next() {
		if (await commit()) controller.goNext();
	}

	function openList(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		event.preventDefault();
		controller.open('specialty-list');
	}
</script>

<!-- 35 · «Η ειδικότητά σας» (record §6.2.4, U-108.3): a field that opens the list of every specialty as a page of its own
     (U-102), then the license, both optional («Αν η ειδικότητά σας δεν έχει άδεια, αφήστε τα κενά.»). The field is a
     link, so it opens the list without JavaScript too. 🔴 U-65.6: the number stops at the server's 50. -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_specialty_title({}, options)}
	subtitle={m.doctor_onboarding_specialty_subtitle({}, options)}
	next={{ disabled: !complete, onClick: () => void next() }}
	commit={complete ? commit : undefined}
	testId="doctor-onboarding-specialty"
>
	<div class="flex flex-col gap-4">
		<!-- The list's address, already resolved by the screen. -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={controller.hrefOf('specialty-list')}
			data-testid="doctor-onboarding-specialty-field"
			class="flex min-h-control-xl w-full flex-row items-center gap-3 rounded-md border border-input bg-card px-3.5 py-2 text-left text-foreground outline-none focus-visible:border-ring"
			onclick={openList}
		>
			<StethoscopeIcon aria-hidden="true" class="icon-lg shrink-0" />
			<span class="flex min-w-0 flex-1 flex-col">
				<span class="text-label-md text-muted-foreground">
					{m.doctor_onboarding_specialty_label({}, options)}
				</span>
				<span
					class={chosen
						? 'truncate text-body-lg text-foreground'
						: 'truncate text-body-lg text-muted-foreground'}
				>
					{chosen ?? m.doctor_onboarding_specialty_placeholder({}, options)}
				</span>
			</span>
			<ChevronIcon aria-hidden="true" class="icon-md shrink-0" />
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
		<TextField
			label={m.doctor_onboarding_specialty_license_number({}, options)}
			value={values.licenseNumber}
			size="lg"
			autocomplete="off"
			maxlength={DOCTOR_ONBOARDING_LICENSE_NUMBER_MAX_LENGTH}
			invalid={!isValidLicenseNumber(values.licenseNumber)}
			onChangeText={(licenseNumber) => draft.update('professional', { licenseNumber })}
			data-testid="doctor-onboarding-license-number"
		/>
		<!-- 🔴 U-129.1: one date field, as the prototype's «Ημερομηνία άδειας» (`doctor.js:193`, `type="date"`). -->
		<DateOfBirthField
			variant="single"
			label={m.doctor_onboarding_specialty_license_date({}, options)}
			size="lg"
			bind:typed={dateTyped}
			error={dateUnfinished && dateHalf
				? m.date_of_birth_field_error_invalid({}, options)
				: undefined}
			bind:value={
				() => values.licenseObtainedDate,
				(licenseObtainedDate: string) => draft.update('professional', { licenseObtainedDate })
			}
			helperText={m.doctor_onboarding_specialty_license_helper({}, options)}
		/>
	</div>
</Frame>
