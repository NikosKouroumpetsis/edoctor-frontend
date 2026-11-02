<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { DoctorDetailSpecializations } from '$modules/doctor/lib/detail';
	import ProfileSection from './profile-section.svelte';

	let { content }: { content: DoctorDetailSpecializations } = $props();
</script>

<!-- 🔴 U-36.2 (app = web, the application's `SpecializationsSection`): «Τομείς εξειδίκευσης» — the services the doctor
     marked as specializations, each with its own line when it has one, under the U-36.1 / U-43.1 «Ολοκληρωμένες
     επισκέψεις (6 μήνες)» once the backend sends it (`completedVisits`, `null` until then). -->
<ProfileSection id="specializations" title={content.title}>
	<div class="flex flex-col gap-5">
		{#if content.completedVisits}
			<p
				data-testid="doctor-detail-specializations-visits"
				class="flex flex-row items-center gap-2 text-body-md text-foreground"
			>
				<Ionicon name="briefcase-outline" class="icon-md shrink-0" />
				<span class="flex-1">{content.completedVisits}</span>
			</p>
		{/if}
		{#each content.items as item (item.id)}
			<div
				data-testid={`doctor-detail-specializations-item-${item.id}`}
				class="flex flex-col gap-1"
			>
				<h3 class="text-body-md font-semibold text-foreground">{item.title}</h3>
				{#if item.body}
					<p class="text-body-sm text-foreground/88">{item.body}</p>
				{/if}
			</div>
		{/each}
	</div>
</ProfileSection>
