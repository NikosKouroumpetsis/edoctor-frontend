<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { formatVisitLength } from '$shared/lib/visit-length';
	import { ChipGroup } from '$shared/ui/molecules/chip-group';
	import { Chip } from '$shared/ui/primitives/chip';
	import { DOCTOR_ONBOARDING_DURATIONS } from '$modules/doctor-onboarding/config';
	import { toDoctorServicePricingInput } from '$modules/doctor-onboarding/lib/payload';
	import { readDoctorServicePricingValues } from '$modules/doctor-onboarding/lib/values';
	import Frame from '../components/frame.svelte';
	import PriceInput from '../components/price-input.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'price');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const values = $derived(readDoctorServicePricingValues(draft.edits, controller.progress));
	const input = $derived(toDoctorServicePricingInput(values));
	const durationHeading = $props.id();

	/** 🔴 D-W52-83 (D-W52-10): «45 λεπτά», and from one hour in hours — «1 ώρα», «1 ώρα και 30 λεπτά», «2 ώρες». */
	const minutesOf = (minutes: number) => formatVisitLength(minutes, props.locale);

	/** «Επόμενο» (record §6.4): `service-pricing`, whole euros and the visit's length; then its edits go. */
	async function commit(): Promise<boolean> {
		if (!input) return false;
		const answer = await controller.save([{ kind: 'service-pricing', input }]);
		if (answer) draft.clear('servicePricing');
		return Boolean(answer);
	}

	async function next() {
		if (await commit()) controller.goNext();
	}
</script>

<!-- 39 · «Πόσο κοστίζει η απλή επίσκεψη;» (record §6.4): the big «€ __» in the middle, digits only, 1 to 9999, and the
     visit's length as pills that wrap (🔴 D-W52-83: D-W52-10's list, 15 to 2 hours — from one hour in hours — 30 first),
     the chosen one ringed. No colour under the pointer (U-100). -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_price_title({}, options)}
	subtitle={m.doctor_onboarding_price_subtitle({}, options)}
	next={{ disabled: !input, onClick: () => void next() }}
	commit={input ? commit : undefined}
	testId="doctor-onboarding-price"
>
	<PriceInput
		currency={m.doctor_onboarding_price_currency({}, options)}
		label={m.doctor_onboarding_price_label({}, options)}
		placeholder={m.doctor_onboarding_price_placeholder({}, options)}
		hint={m.doctor_onboarding_price_hint({}, options)}
		value={values.price}
		onInput={(price) => draft.update('servicePricing', { price })}
	/>
	<section class="flex flex-col gap-2.5">
		<h2 id={durationHeading} class="text-body-sm font-semibold text-foreground">
			{m.doctor_onboarding_price_duration({}, options)}
		</h2>
		<ChipGroup
			type="single"
			aria-labelledby={durationHeading}
			data-testid="doctor-onboarding-durations"
		>
			{#each DOCTOR_ONBOARDING_DURATIONS as minutes (minutes)}
				<Chip
					label={minutesOf(minutes)}
					variant="outline"
					hover={false}
					selected={values.customDurationInMinutes === minutes}
					onclick={() => draft.update('servicePricing', { customDurationInMinutes: minutes })}
					data-testid={`doctor-onboarding-duration-${minutes}`}
				/>
			{/each}
		</ChipGroup>
	</section>
</Frame>
