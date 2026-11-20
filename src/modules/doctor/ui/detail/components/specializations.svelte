<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ListRow } from '$shared/ui/molecules/list-row';
	import { Button } from '$shared/ui/primitives/button';
	import type { DoctorDetailSpecializations } from '$modules/doctor/lib/detail';
	import ProfileSection from './profile-section.svelte';

	let {
		content,
		moreHref,
		onOpenMore
	}: {
		content: DoctorDetailSpecializations;
		moreHref: ResolvedPathname;
		onOpenMore: (event: MouseEvent) => void;
	} = $props();
</script>

<!-- 🔴 D-W52-60 (U-209.3, U-225; it replaces U-36.2 / U-72.3 Π1, app = web): «Τομείς εξειδίκευσης» — the specializations
     the doctor picked from the closed list of the specialty, every one a row by its name (three at most; never a
     service, so no fee and nothing to press), under the U-36.1 / U-72.4 «Ολοκληρωμένες επισκέψεις» once the backend
     sends it; the way to their page only when it has more to say (its figures). Every name is the server's, a text
     node (U-65.6). -->
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
	<ul data-testid="doctor-detail-specializations-items" class="mt-2 flex flex-col">
		{#each content.items as item (item.id)}
			<li class="border-b border-border/60 last:border-b-0">
				<ListRow title={item.title} testId={`doctor-detail-specializations-item-${item.id}`}>
					{#snippet leading()}
						<Ionicon name="ribbon-outline" class="icon-lg" />
					{/snippet}
				</ListRow>
			</li>
		{/each}
	</ul>
	{#if content.moreLabel}
		<Button
			tone="muted"
			bordered={false}
			label={content.moreLabel}
			href={moreHref}
			onclick={onOpenMore}
			data-testid="doctor-detail-specializations-more"
			class="mt-4 w-full tablet:w-auto tablet:self-start"
		/>
	{/if}
</ProfileSection>
