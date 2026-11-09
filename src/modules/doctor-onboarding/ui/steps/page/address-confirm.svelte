<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { doctorOnboardingTownQuery } from '$modules/doctor-onboarding/api/town';
	import {
		DOCTOR_ONBOARDING_CITY_MAX_LENGTH,
		DOCTOR_ONBOARDING_MAP,
		DOCTOR_ONBOARDING_POSTAL_CODE_MAX_LENGTH,
		DOCTOR_ONBOARDING_STREET_LINE_MAX_LENGTH
	} from '$modules/doctor-onboarding/config';
	import {
		isValidCity,
		isValidPostalCode,
		isValidStreetLine,
		keepPostalCodeInput
	} from '$modules/doctor-onboarding/lib/validation';
	import { readDoctorAddressValues } from '$modules/doctor-onboarding/lib/values';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'address-confirm');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const values = $derived(readDoctorAddressValues(draft.edits, controller.progress));
	const complete = $derived(
		isValidStreetLine(values.streetLine) &&
			isValidPostalCode(values.postalCode) &&
			isValidCity(values.city)
	);
	const postalCodeWrong = $derived(
		values.postalCode.trim() !== '' && !isValidPostalCode(values.postalCode)
	);
	let looking = $state(false);

	/**
	 * «Επόμενο» writes nothing yet (the pin writes the address). A typed address, which has no point, first asks our own
	 * catalogue for its town's centre (B-8, D-W3-12: the public location suggestions, no Google) so the pin starts there —
	 * Athens when the catalogue does not know it or does not answer.
	 */
	async function next() {
		if (!complete || looking) return;
		if (values.latitude === null || values.longitude === null) {
			looking = true;
			const town = await controller.client
				.fetchQuery(doctorOnboardingTownQuery(values.city, props.locale))
				.catch(() => null);
			looking = false;
			draft.update('office', town ?? DOCTOR_ONBOARDING_MAP.athens);
		}
		controller.goNext();
	}

	/** The field shows only what it keeps (digits and a space): a refused key leaves no letter behind (U-65.6). */
	function showKeptPostalCode(event: Event & { currentTarget: HTMLInputElement }) {
		const kept = keepPostalCodeInput(event.currentTarget.value);
		if (kept !== event.currentTarget.value) event.currentTarget.value = kept;
	}

	const joined = 'rounded-none';
	// W8-Δ5: one joined group — no field keeps its own gap below (`pb-1`), so each edge lies on the next one's (`-mt-px`);
	// the field in error comes over its neighbours so its whole edge shows, and the one in focus over that (Delta 2).
	const member = 'pb-0 focus-within:z-20';
</script>

<!-- 37 · «Επιβεβαιώστε τη διεύθυνση» (record §6.7.3, Airbnb's 9.32.11): the joined fields — the country (read only), the
     street and number in one line (D-W3-04: the server splits it), the postal code (digits and a space only, 5 digits:
     «Ο ταχυδρομικός κώδικας έχει 5 ψηφία.»), the town. A chosen suggestion fills them («Τη συμπληρώσαμε για εσάς»);
     otherwise they are typed. One joined group, edge on edge, no gap between (W8-Δ5). 🔴 U-65.6: each stops at the
     server's limit and shows back as text. -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_address_confirm_title({}, options)}
	subtitle={values.source === 'google'
		? m.doctor_onboarding_address_confirm_subtitle({}, options)
		: m.doctor_onboarding_address_confirm_subtitle_manual({}, options)}
	next={{ disabled: !complete, loading: looking, onClick: () => void next() }}
	testId="doctor-onboarding-address-confirm"
>
	<div class="flex flex-col" data-testid="doctor-onboarding-address-fields">
		<TextField
			label={m.doctor_onboarding_address_confirm_country({}, options)}
			value={m.doctor_onboarding_address_confirm_country_greece({}, options)}
			size="lg"
			readonly
			aria-readonly="true"
			tabindex={-1}
			class={member}
			inputClass="rounded-b-none text-muted-foreground"
		/>
		<TextField
			label={m.doctor_onboarding_address_confirm_street({}, options)}
			value={values.streetLine}
			size="lg"
			autocomplete="address-line1"
			maxlength={DOCTOR_ONBOARDING_STREET_LINE_MAX_LENGTH}
			class={member}
			inputClass={`-mt-px ${joined}`}
			onChangeText={(streetLine) => draft.update('office', { streetLine })}
			data-testid="doctor-onboarding-street"
		/>
		<TextField
			label={m.doctor_onboarding_address_confirm_postal_code({}, options)}
			bind:value={
				() => values.postalCode,
				(typed: string) => draft.update('office', { postalCode: keepPostalCodeInput(typed) })
			}
			size="lg"
			inputmode="numeric"
			autocomplete="postal-code"
			maxlength={DOCTOR_ONBOARDING_POSTAL_CODE_MAX_LENGTH}
			invalid={postalCodeWrong}
			class={postalCodeWrong ? `${member} z-10` : member}
			inputClass={`-mt-px ${joined}`}
			oninput={showKeptPostalCode}
			data-testid="doctor-onboarding-postal-code"
		/>
		<TextField
			label={m.doctor_onboarding_address_confirm_city({}, options)}
			value={values.city}
			size="lg"
			autocomplete="address-level2"
			maxlength={DOCTOR_ONBOARDING_CITY_MAX_LENGTH}
			class="focus-within:z-20"
			inputClass="-mt-px rounded-t-none"
			onChangeText={(city) => draft.update('office', { city })}
			data-testid="doctor-onboarding-city"
		/>
		{#if postalCodeWrong}
			<p
				role="alert"
				class="mt-2.5 text-label-lg font-medium text-danger-text"
				data-testid="doctor-onboarding-postal-code-error"
			>
				{m.doctor_onboarding_address_confirm_postal_code_error({}, options)}
			</p>
		{/if}
	</div>
</Frame>
