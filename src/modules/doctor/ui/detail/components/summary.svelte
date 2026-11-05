<script lang="ts">
	import type { Snippet } from 'svelte';
	import { InfoRow } from '$shared/ui/molecules/info-row';
	import type { DoctorDetailSummary } from '$modules/doctor/lib/detail';
	import { doctorSummaryGlyphs } from './icons';
	import ProfileSection from './profile-section.svelte';

	let {
		summary,
		contact
	}: {
		summary: DoctorDetailSummary;
		/** 🔴 U-84.6: «Επικοινωνήστε με τον γιατρό», after the response rows and before the intro. */
		contact?: Snippet;
	} = $props();
</script>

<!-- 🔴 U-35.1 (app = web, the application's `SummarySection`): «Επαγγελματίας υγείας: …» — the initial, the licence,
     «X χρόνια εμπειρίας μέσω του edoctor», the languages (and the response rows once the backend sends them, U-36.1)
     «Επικοινωνήστε με τον γιατρό» (U-84.6, which replaces U-35.4) and the intro, the description's first paragraph
     (U-42.1). Each line only with its fact. -->
<ProfileSection id="summary">
	<div class="flex flex-col gap-6">
		<div class="flex flex-row items-start gap-4">
			<span
				aria-hidden="true"
				data-testid="doctor-detail-summary-initial"
				class="grid size-avatar-lg shrink-0 place-items-center rounded-full bg-muted text-body-sm font-semibold text-muted-foreground"
				>{summary.initial}</span
			>
			<div class="flex min-w-0 flex-1 flex-col gap-1.5">
				<p
					data-testid="doctor-detail-summary-title"
					class="text-body-md font-semibold text-foreground"
				>
					{summary.title}
				</p>
				{#if summary.licenseLabel}
					<p data-testid="doctor-detail-summary-license" class="text-body-sm text-muted-foreground">
						{summary.licenseLabel}
					</p>
				{/if}
				{#if summary.platformExperienceLabel}
					<p data-testid="doctor-detail-summary-platform" class="text-body-sm text-primary-text">
						{summary.platformExperienceLabel}
					</p>
				{/if}
			</div>
		</div>
		{#if summary.rows.length > 0}
			<div data-testid="doctor-detail-summary-rows" class="flex flex-col gap-4">
				{#each summary.rows as row (row.id)}
					<InfoRow
						variant="circled"
						icon={doctorSummaryGlyphs[row.id]}
						title={row.title}
						description={row.description}
						testId={`doctor-detail-summary-row-${row.id}`}
					/>
				{/each}
			</div>
		{/if}
		{@render contact?.()}
		{#if summary.intro}
			<p data-testid="doctor-detail-summary-intro" class="text-body-md text-foreground/88">
				{summary.intro}
			</p>
		{/if}
	</div>
</ProfileSection>
