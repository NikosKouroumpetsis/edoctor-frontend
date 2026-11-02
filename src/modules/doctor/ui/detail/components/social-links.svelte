<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import type { DoctorDetailProfessionalLink } from '$modules/doctor/lib/detail';
	import { doctorSocialGlyphs } from './icons';

	let {
		links,
		testIdPrefix = 'doctor-detail-professional',
		class: className
	}: { links: DoctorDetailProfessionalLink[]; testIdPrefix?: string; class?: string } = $props();
</script>

<!-- 🔴 U-35.3 (app = web, the application's `DoctorProfessionalLinks`): the kit's row look (`IconButtonRow` `start`:
     48 tint circles, 12 apart) with the doctor's own links, each in a new tab with `rel="noopener noreferrer"` (the
     new tab gets no handle on the page and no referrer); only `http(s)` addresses reach here (`api/profile/map`). -->
{#if links.length > 0}
	<div
		data-slot="doctor-social-links"
		data-testid={`${testIdPrefix}-links`}
		class={cn('flex flex-row flex-wrap items-center gap-3', className)}
	>
		{#each links as link (link.id)}
			<IconButton
				icon={doctorSocialGlyphs[link.id]}
				appearance="tint"
				surface="strong"
				iconSize="md"
				size="touch"
				aria-label={link.label}
				href={link.url}
				target="_blank"
				rel="noopener noreferrer"
				data-testid={`${testIdPrefix}-link-${link.id}`}
			/>
		{/each}
	</div>
{/if}
