<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { SignInRequest } from '$shared/state/session';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import type { DoctorDetailSpecializations } from '$modules/doctor/lib/detail';
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
		content: DoctorDetailSpecializations;
		moreHref: ResolvedPathname;
		/** `details/specializations?focus=…`: the page, on this field. */
		rowHref: (serviceId: string) => ResolvedPathname;
		onOpenMore: (event: MouseEvent) => void;
		onOpenRow: (serviceId: string, event: MouseEvent) => void;
		onSignIn: (request?: SignInRequest) => void;
	} = $props();
</script>

<!-- 🔴 U-36.2, U-72.3 Π1 (app = web): «Τομείς εξειδίκευσης» — the services the doctor marked, under the U-36.1 / U-72.4
     «Ολοκληρωμένες επισκέψεις» once the backend sends it; the first three as the rows of «Υπηρεσίες» (a press opens the
     page on that field), and always the way there: the page has more of each. -->
<ProfileSection id="specializations" title={content.title}>
	{#if content.completedVisits}
		<p
			data-testid="doctor-detail-specializations-visits"
			class="flex flex-row items-center gap-2 text-body-md text-foreground"
		>
			<Ionicon name="briefcase-outline" class="icon-md shrink-0" />
			<span class="flex-1">{content.completedVisits}</span>
		</p>
	{/if}
	<div class="mt-2 flex flex-col">
		{#each content.items as service (service.id)}
			<ServiceRow
				{service}
				href={rowHref(service.id)}
				onclick={(event) => onOpenRow(service.id, event)}
				{onSignIn}
				testIdPrefix="doctor-detail-specializations-item"
				class="border-b border-border/60 last:border-b-0"
			/>
		{/each}
	</div>
	<Button
		tone="muted"
		bordered={false}
		label={content.moreLabel}
		href={moreHref}
		onclick={onOpenMore}
		data-testid="doctor-detail-specializations-more"
		class="mt-4 w-full tablet:w-auto tablet:self-start"
	/>
</ProfileSection>
