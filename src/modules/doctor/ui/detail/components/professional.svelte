<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InfoRow } from '$shared/ui/molecules/info-row';
	import { Button } from '$shared/ui/primitives/button';
	import type { DoctorDetailProfessionalSection } from '$modules/doctor/lib/detail';
	import { doctorProfessionalInfoGlyphs } from './icons';
	import ProfileSection from './profile-section.svelte';
	import SocialLinks from './social-links.svelte';

	let {
		content,
		moreLabel,
		moreHref,
		onOpenMore
	}: {
		content: DoctorDetailProfessionalSection;
		moreLabel: string;
		/** `details/description` (the application's historical, shareable id). */
		moreHref: ResolvedPathname;
		onOpenMore: (event: MouseEvent) => void;
	} = $props();
</script>

<!-- 🔴 U-40.4 (app = web, the application's `ProfessionalSection`): «Γνωρίστε τον επαγγελματία υγείας» with no card
     and no shadow — the one line of figures, the icon rows (Μέλος από, Γλώσσες, Αρ. αδείας), the links, and the
     description cut at two lines with «Εμφάνιση περισσότερα», which opens `details/description`. -->
<ProfileSection id="professional" title={content.title}>
	<div class="flex flex-col gap-6">
		{#if content.stats.length > 0}
			<p
				data-testid="doctor-detail-professional-stat-line"
				class="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 text-body-md text-foreground"
			>
				{#each content.stats as stat, index (stat.id)}
					{#if index > 0}<span aria-hidden="true" class="text-muted-foreground">·</span>{/if}
					<span
						data-testid={`doctor-detail-professional-stat-${stat.id}`}
						class="inline-flex flex-row items-center gap-1"
					>
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
			<div data-testid="doctor-detail-professional-info-rows" class="flex flex-col gap-4">
				{#each content.infoRows as row (row.id)}
					<InfoRow
						variant="inline"
						icon={doctorProfessionalInfoGlyphs[row.id]}
						title={row.label}
						value={row.value}
						valueTestId={`doctor-detail-professional-info-value-${row.id}`}
					/>
				{/each}
			</div>
		{/if}
		<SocialLinks links={content.socialLinks} />
		{#if content.about}
			<div class="flex flex-col gap-4">
				<InfoRow
					variant="plain"
					icon="checkmark-done-outline"
					iconTone="primary"
					title={content.about.leadTitle}
					description={content.about.leadBody}
				/>
				{#if content.about.body}
					<p
						data-testid="doctor-detail-professional-about"
						class="line-clamp-2 text-body-sm whitespace-pre-line text-foreground/88"
					>
						{content.about.body}
					</p>
				{/if}
			</div>
		{/if}
		{#if content.hasMore}
			<Button
				tone="muted"
				bordered={false}
				label={moreLabel}
				href={moreHref}
				onclick={onOpenMore}
				data-testid="doctor-detail-professional-more"
				class="w-full tablet:w-auto tablet:self-start"
			/>
		{/if}
	</div>
</ProfileSection>
