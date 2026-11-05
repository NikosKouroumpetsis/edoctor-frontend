<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { SignInRequest } from '$shared/state/session';
	import { Button } from '$shared/ui/primitives/button';
	import type { DoctorDetailServiceCost } from '$modules/doctor/lib/detail';
	import ProfileSection from './profile-section.svelte';
	import ServiceRow from './service-row.svelte';

	let {
		content,
		moreHref,
		rowHref,
		onOpenMore,
		onOpenRow,
		onSignIn
	}: {
		content: DoctorDetailServiceCost;
		/** `details/services`: every service. */
		moreHref: ResolvedPathname;
		/** `details/services?focus=…`: the page, open on this row. */
		rowHref: (serviceId: string) => ResolvedPathname;
		onOpenMore: (event: MouseEvent) => void;
		onOpenRow: (serviceId: string, event: MouseEvent) => void;
		onSignIn: (request?: SignInRequest) => void;
	} = $props();
</script>

<!-- 🔴 U-70.2 Ε3, Π7 / U-34.4 / U-38.1 (app = web): «Υπηρεσίες» — the notice in one muted line and the first three as
     rows (a guest's «🔒 Συνδεθείτε για κόστος», a press opens the page on that row), then the way to all of them when
     the page has more to say. -->
<ProfileSection id="service-cost" title={content.title}>
	<p data-testid="doctor-detail-service-cost-notice" class="text-body-sm text-muted-foreground">
		{content.notice}
	</p>
	<div class="mt-2 flex flex-col">
		{#each content.services as service (service.id)}
			<ServiceRow
				{service}
				href={rowHref(service.id)}
				onclick={(event) => onOpenRow(service.id, event)}
				{onSignIn}
				class="border-b border-border/60 last:border-b-0"
			/>
		{/each}
	</div>
	{#if content.moreLabel}
		<Button
			tone="muted"
			bordered={false}
			label={content.moreLabel}
			href={moreHref}
			onclick={onOpenMore}
			data-testid="doctor-detail-service-cost-show-more"
			class="mt-4 w-full tablet:w-auto tablet:self-start"
		/>
	{/if}
</ProfileSection>
