<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import type { DoctorDetailServiceCost } from '$modules/doctor/lib/detail';
	import PricedService from './priced-service.svelte';
	import ProfileSection from './profile-section.svelte';

	let {
		content,
		moreLabel,
		moreHref,
		onOpenMore,
		onSignIn
	}: {
		content: DoctorDetailServiceCost;
		moreLabel: string;
		/** `details/services`: every service. */
		moreHref: ResolvedPathname;
		onOpenMore: (event: MouseEvent) => void;
		onSignIn: () => void;
	} = $props();
</script>

<!-- 🔴 U-34.4 / U-38.1 (app = web, the application's `ServiceCostSection`): «Κόστος υπηρεσιών» — the notice and the
     first three services, each with its fee (the amount for a member, the guest's «🔒 Συνδεθείτε για κόστος»), and
     «Εμφάνιση περισσότερα» only past three. The mock's support rows are not drawn (U-30.2: their data stays). -->
<ProfileSection id="service-cost" title={content.title}>
	<div class="flex flex-col gap-6">
		<InlineNotice
			message={content.notice}
			variant="tint"
			testId="doctor-detail-service-cost-notice"
		/>
		<div class="flex flex-col gap-6">
			{#each content.services as service (service.id)}
				<PricedService
					{service}
					costLabel={content.costLabel}
					includesLabel={content.includesLabel}
					descriptionLabel={content.descriptionLabel}
					{onSignIn}
				/>
			{/each}
		</div>
		{#if content.hasMore}
			<Button
				tone="muted"
				bordered={false}
				label={moreLabel}
				href={moreHref}
				onclick={onOpenMore}
				data-testid="doctor-detail-service-cost-show-more"
				class="w-full tablet:w-auto tablet:self-start"
			/>
		{/if}
	</div>
</ProfileSection>
