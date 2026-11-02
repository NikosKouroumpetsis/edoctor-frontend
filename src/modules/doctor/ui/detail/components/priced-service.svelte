<script lang="ts">
	import { OfferingCard, type OfferingBlock } from '$shared/ui/molecules/offering-card';
	import type { DoctorPricedService } from '$modules/doctor/lib/detail';
	import Fee from './fee.svelte';

	let {
		service,
		costLabel,
		includesLabel,
		descriptionLabel,
		onSignIn
	}: {
		service: DoctorPricedService;
		costLabel: string;
		includesLabel: string;
		descriptionLabel: string;
		onSignIn: () => void;
	} = $props();

	const blocks = $derived.by(() => {
		const list: OfferingBlock[] = [];
		const includes = service.includesBody.trim();
		const description = service.descriptionBody?.trim();
		if (includes) {
			list.push({
				id: 'includes',
				label: includesLabel,
				body: includes,
				testId: `doctor-detail-priced-service-includes-${service.id}`
			});
		}
		if (description) {
			list.push({
				id: 'description',
				label: descriptionLabel,
				body: description,
				testId: `doctor-detail-priced-service-description-${service.id}`
			});
		}
		return list;
	});
</script>

<!-- U-34.4 / U-38.1 (app = web, the application's `DoctorPricedServiceCard`): one priced service — the kit's
     `OfferingCard` with its fee in the price box (the amount, or the guest's «🔒 Συνδεθείτε για κόστος»), then
     «includes» and «description» when the service has them. -->
<OfferingCard
	title={service.title}
	priceCaption={costLabel}
	priceTestId={`doctor-detail-priced-service-cost-${service.id}`}
	{blocks}
	testId={`doctor-detail-priced-service-${service.id}`}
>
	{#snippet price()}
		<Fee
			fee={service.price}
			placement="offer"
			{onSignIn}
			testId={service.price.kind === 'login'
				? `doctor-detail-priced-service-sign-in-${service.id}`
				: undefined}
		/>
	{/snippet}
</OfferingCard>
