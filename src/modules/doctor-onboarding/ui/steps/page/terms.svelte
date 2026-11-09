<script lang="ts">
	import ShieldCheckIcon from '~icons/lucide/shield-check';
	import ShieldXIcon from '~icons/lucide/shield-x';
	import { m } from '$paraglide/messages.js';
	import { ApiError } from '$shared/lib/http';
	import { DateOfBirthField } from '$shared/ui/molecules/date-of-birth-field';
	import { SelectableCards } from '$shared/ui/molecules/selectable-cards';
	import { TextField } from '$shared/ui/molecules/text-field';
	import type { DoctorOnboardingProgress } from '$modules/doctor-onboarding/api/progress';
	import { doctorTermsVersionQuery } from '$modules/doctor-onboarding/api/terms';
	import {
		DOCTOR_ONBOARDING_LIABILITY_COMPANY_MAX_LENGTH,
		DOCTOR_ONBOARDING_TERMS
	} from '$modules/doctor-onboarding/config';
	import { toDoctorLiabilityInput } from '$modules/doctor-onboarding/lib/payload';
	import {
		isValidLiabilityCompany,
		isValidPolicyExpiry
	} from '$modules/doctor-onboarding/lib/validation';
	import { readDoctorLiabilityValues } from '$modules/doctor-onboarding/lib/values';
	import Frame from '../components/frame.svelte';
	import TermsAccept from '../components/terms-accept.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'terms');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const values = $derived(readDoctorLiabilityValues(draft.edits, controller.progress));
	const insured = $derived(values.liabilityInsurance === true);
	// Whether anything is typed in the expiry's boxes: an empty value with it is a day left half or wrong, never «none»
	// (review w3-w3 R1 MINOR-4). «Επόμενο» then says so under the field and writes nothing.
	let expiryTyped = $state(false);
	let expiryUnfinished = $state(false);
	// The version's read and its writes (a refused version read again, once) are one chain: «Επόμενο» spins and
	// «Αποθήκευση και έξοδος» stays locked through all of it, the gap between the two writes included (w3-w6 R1 NIT-1).
	let committing = $state(false);
	const expiryHalf = $derived(insured && expiryTyped && values.liabilityInsuranceExpiresAt === '');
	const complete = $derived(
		values.liabilityInsurance !== null &&
			values.termsAccepted &&
			(!insured ||
				(isValidLiabilityCompany(values.liabilityCompany) &&
					isValidPolicyExpiry(values.liabilityInsuranceExpiresAt)))
	);
	const insuranceHeading = $props.id();
	const termsHref = $derived(props.href(`/legal/${DOCTOR_ONBOARDING_TERMS.slug}`));

	/**
	 * One write of `liability` at the version `refresh` reads (the terms' page, at submit time); `stale` says the server
	 * refused that version (a `400`) and nothing else was said, so the one retry may read it again.
	 */
	async function saveAt(
		refresh: boolean
	): Promise<{ stale: boolean; answer: DoctorOnboardingProgress | null }> {
		const version = await controller.client
			.fetchQuery(doctorTermsVersionQuery(props.locale, refresh))
			.catch(() => null);
		const input = toDoctorLiabilityInput(values, version);
		if (!input) {
			controller.saveError = m.doctor_onboarding_frame_save_error({}, options);
			return { stale: false, answer: null };
		}
		let stale = false;
		const answer = await controller.save([{ kind: 'liability', input }], (error) => {
			stale = !refresh && error instanceof ApiError && error.status === 400;
			return stale;
		});
		return { stale, answer };
	}

	/**
	 * 🔴 Ε2 (D-W3-01, BLOCKER 2): «Επόμενο» writes the insurance answer AND the acceptance of the doctors' terms — only
	 * those, at the version in force; a version that moved on is read again once. Then the edits go.
	 */
	async function commit(): Promise<boolean> {
		if (!complete || committing) return false;
		if (expiryHalf) {
			expiryUnfinished = true;
			return false;
		}
		committing = true;
		try {
			const first = await saveAt(false);
			const { answer } = first.stale ? await saveAt(true) : first;
			if (answer) {
				draft.clear('liability');
				draft.clear('terms');
			}
			return Boolean(answer);
		} finally {
			committing = false;
		}
	}

	async function next() {
		if (await commit()) controller.goNext();
	}
</script>

{#snippet yesIcon()}<ShieldCheckIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet noIcon()}<ShieldXIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}

<!-- 41 · «Ασφάλιση και όροι» (record §6.4, Ε2, U-102): «Ναι» / «Όχι» as two cards one under the other (U-110.2), the
     company and the expiry only with «Ναι» (both optional), then the doctors' terms — the only ones asked (D-W3-01) —
     whose link opens their page. «Επόμενο» opens for an answer and the accepted terms («Όχι» is allowed). 🔴 U-65.6:
     the company stops at the server's 120 and shows back as text; a day left half says so and locks. -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_terms_title({}, options)}
	next={{ disabled: !complete, loading: committing, onClick: () => void next() }}
	commit={complete ? commit : undefined}
	testId="doctor-onboarding-terms"
>
	<section class="flex flex-col gap-3">
		<h2 id={insuranceHeading} class="text-body-lg font-semibold text-foreground">
			{m.doctor_onboarding_terms_insurance_question({}, options)}
		</h2>
		<SelectableCards
			labelledBy={insuranceHeading}
			hover={false}
			value={values.liabilityInsurance === null ? undefined : insured ? 'yes' : 'no'}
			onChange={(answer) => draft.update('liability', { liabilityInsurance: answer === 'yes' })}
			options={[
				{
					value: 'yes',
					title: m.common_yes({}, options),
					description: m.doctor_onboarding_terms_insurance_yes_hint({}, options),
					icon: yesIcon
				},
				{
					value: 'no',
					title: m.common_no({}, options),
					description: m.doctor_onboarding_terms_insurance_no_hint({}, options),
					icon: noIcon
				}
			]}
			testId="doctor-onboarding-insurance"
		/>
		{#if insured}
			<div class="mt-1 flex flex-col gap-4" data-testid="doctor-onboarding-insurance-details">
				<TextField
					label={m.doctor_onboarding_terms_insurer({}, options)}
					value={values.liabilityCompany}
					size="lg"
					autocomplete="organization"
					maxlength={DOCTOR_ONBOARDING_LIABILITY_COMPANY_MAX_LENGTH}
					invalid={!isValidLiabilityCompany(values.liabilityCompany)}
					onChangeText={(liabilityCompany) => draft.update('liability', { liabilityCompany })}
					data-testid="doctor-onboarding-insurer"
				/>
				<!-- 🔴 U-129.1: one date field, as the prototype's «Λήξη συμβολαίου» (`doctor.js:247`, `type="date"`). -->
				<DateOfBirthField
					variant="single"
					label={m.doctor_onboarding_terms_policy_expiry({}, options)}
					size="lg"
					allowFuture
					bind:typed={expiryTyped}
					error={expiryUnfinished && expiryHalf
						? m.date_of_birth_field_error_invalid({}, options)
						: undefined}
					bind:value={
						() => values.liabilityInsuranceExpiresAt,
						(liabilityInsuranceExpiresAt: string) =>
							draft.update('liability', { liabilityInsuranceExpiresAt })
					}
				/>
			</div>
		{/if}
	</section>
	<section class="mt-section flex flex-col gap-3">
		<div class="flex flex-col gap-1">
			<h2 class="text-body-lg font-semibold text-foreground">
				{m.doctor_onboarding_terms_accept_title({}, options)}
			</h2>
			<p class="text-body-sm text-muted-foreground">
				{m.doctor_onboarding_terms_accept_hint({}, options)}
			</p>
		</div>
		<TermsAccept
			accepted={values.termsAccepted}
			label={m.doctor_onboarding_terms_accept(
				{ terms: m.doctor_onboarding_terms_accept_link({}, options) },
				options
			)}
			lead={m.doctor_onboarding_terms_accept({ terms: '' }, options).trimEnd()}
			linkLabel={m.doctor_onboarding_terms_accept_link({}, options)}
			href={termsHref}
			onChange={(accepted) => draft.update('terms', { accepted })}
		/>
	</section>
</Frame>
