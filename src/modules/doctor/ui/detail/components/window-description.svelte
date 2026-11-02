<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InfoRow } from '$shared/ui/molecules/info-row';
	import type { DoctorDetailProfessionalSection } from '$modules/doctor/lib/detail';
	import { doctorProfessionalInfoGlyphs } from './icons';
	import SocialLinks from './social-links.svelte';

	let { content }: { content: DoctorDetailProfessionalSection } = $props();
</script>

<!-- `details/description` (U-40.4, the application's `DoctorProfessionalModalBody`): the section opened — the same
     line of figures, rows and links, the description whole (U-42.1: every paragraph). -->
<div data-testid="doctor-detail-modal-professional" class="flex flex-col gap-section">
	{#if content.stats.length > 0}
		<p class="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 text-body-md text-foreground">
			{#each content.stats as stat, index (stat.id)}
				{#if index > 0}<span aria-hidden="true" class="text-muted-foreground">·</span>{/if}
				<span class="inline-flex flex-row items-center gap-1">
					<span
						><span class="font-semibold">{stat.value}</span>{stat.label
							? ` ${stat.label}`
							: ''}</span
					>
					{#if stat.id === 'rating'}<Ionicon name="star" class="icon-sm text-rating" />{/if}
				</span>
			{/each}
		</p>
	{/if}
	{#if content.infoRows.length > 0}
		<div class="flex flex-col gap-4">
			{#each content.infoRows as row (row.id)}
				<InfoRow
					variant="inline"
					icon={doctorProfessionalInfoGlyphs[row.id]}
					title={row.label}
					value={row.value}
				/>
			{/each}
		</div>
	{/if}
	<SocialLinks links={content.socialLinks} testIdPrefix="doctor-detail-modal-professional" />
	{#if content.about}
		<div class="flex flex-col gap-3">
			<h3 class="text-body-md font-semibold text-foreground">{content.about.leadTitle}</h3>
			<p class="text-body-sm text-muted-foreground">{content.about.leadBody}</p>
			{#if content.about.body}
				<p
					data-testid="doctor-detail-modal-professional-body"
					class="text-body-sm whitespace-pre-line text-foreground/88"
				>
					{content.about.body}
				</p>
			{/if}
		</div>
	{/if}
</div>
