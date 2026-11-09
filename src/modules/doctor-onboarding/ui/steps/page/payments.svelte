<script lang="ts">
	import CashIcon from '~icons/lucide/banknote';
	import CardIcon from '~icons/lucide/credit-card';
	import IrisIcon from '~icons/lucide/smartphone';
	import StudentIcon from '~icons/lucide/graduation-cap';
	import UnemploymentIcon from '~icons/lucide/id-card';
	import type { Snippet } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { SelectableCards } from '$shared/ui/molecules/selectable-cards';
	import { DOCTOR_ONBOARDING_PAYMENT_OPTIONS } from '$modules/doctor-onboarding/config';
	import { toDoctorPaymentOptionsInput } from '$modules/doctor-onboarding/lib/payload';
	import { readDoctorPaymentOptions } from '$modules/doctor-onboarding/lib/values';
	import type { DoctorOnboardingPaymentOption } from '$modules/doctor-onboarding/types';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'payments');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const chosen = $derived(readDoctorPaymentOptions(draft.edits, controller.progress));
	const complete = $derived(chosen.length > 0);
	const groupHeading = $props.id();

	/** Each way's words (the profile's `doctor.detail.office.payment.*`), its line (the two cards have none) and glyph. */
	const WAYS: Record<
		DoctorOnboardingPaymentOption,
		{ title: () => string; description?: () => string; icon: Snippet }
	> = {
		CASH: {
			title: () => m.doctor_detail_office_payment_cash({}, options),
			description: () => m.doctor_onboarding_payments_cash_hint({}, options),
			icon: cashIcon
		},
		CARD: {
			title: () => m.doctor_detail_office_payment_card({}, options),
			description: () => m.doctor_onboarding_payments_card_hint({}, options),
			icon: cardIcon
		},
		IRIS: {
			title: () => m.doctor_detail_office_payment_iris({}, options),
			description: () => m.doctor_onboarding_payments_iris_hint({}, options),
			icon: irisIcon
		},
		STUDENT_CARD: {
			title: () => m.doctor_detail_office_payment_student_card({}, options),
			icon: studentIcon
		},
		UNEMPLOYMENT_CARD: {
			title: () => m.doctor_detail_office_payment_unemployment_card({}, options),
			icon: unemploymentIcon
		}
	};

	/** «Επόμενο» (record §6.8): the office's `paymentOptions` group, only the five offered; then its edit goes. */
	async function commit(): Promise<boolean> {
		if (!complete) return false;
		const answer = await controller.save([
			{ kind: 'office', input: { paymentOptions: toDoctorPaymentOptionsInput(chosen) } }
		]);
		if (answer) draft.clear('office', ['paymentOptions']);
		return Boolean(answer);
	}

	async function next() {
		if (await commit()) controller.goNext();
	}
</script>

{#snippet cashIcon()}<CashIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet cardIcon()}<CardIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet irisIcon()}<IrisIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet studentIcon()}<StudentIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet unemploymentIcon()}<UnemploymentIcon
		aria-hidden="true"
		class="icon-xl shrink-0"
	/>{/snippet}

<!-- 38 · «Πώς μπορούν να πληρώσουν οι ασθενείς;» (record §6.8, U-111.2): the five ways as cards one under the other
     (U-110.2 / U-112.1), never an online one; with none chosen «Επόμενο» stays locked. No colour under the pointer. -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_payments_title({}, options)}
	subtitle={m.doctor_onboarding_payments_subtitle({}, options)}
	next={{ disabled: !complete, onClick: () => void next() }}
	commit={complete ? commit : undefined}
	testId="doctor-onboarding-payments"
>
	<h2 id={groupHeading} class="sr-only">{m.doctor_detail_office_payment_methods({}, options)}</h2>
	<SelectableCards
		type="multiple"
		labelledBy={groupHeading}
		hover={false}
		value={chosen}
		onChange={(next) =>
			draft.update('office', {
				paymentOptions: toDoctorPaymentOptionsInput(Array.isArray(next) ? next : [])
			})}
		options={DOCTOR_ONBOARDING_PAYMENT_OPTIONS.map((way) => ({
			value: way,
			title: WAYS[way].title(),
			description: WAYS[way].description?.(),
			icon: WAYS[way].icon
		}))}
		testId="doctor-onboarding-payment"
	/>
</Frame>
