<script lang="ts">
	import { NumberedList } from '$shared/ui/molecules/numbered-list';
	import { Button } from '$shared/ui/primitives/button';
	import type { DoctorBioGroup } from '$modules/doctor/lib/detail';
	import ProfileSection from './profile-section.svelte';

	let {
		content,
		allHref
	}: {
		content: { title: string; groups: DoctorBioGroup[]; allLabel: string };
		/** `/doctors/<slug>/about#bio`: the doctor's page, at the biography. */
		allHref: string;
	} = $props();
</script>

<!-- 🔴 U-35.7, U-73.1 Π1 (app = web, the application's `BioSection`): «Βιογραφικό σημείωμα», at most three of each group
     numbered under its title and count, 2 columns from 744 (the prototype), and «Εμφάνιση όλου του βιογραφικού», which
     leads to the doctor's page at its timeline. -->
<ProfileSection id="bio" title={content.title}>
	<div
		class="flex flex-col gap-section tablet:grid tablet:grid-cols-2 tablet:gap-x-profile-columns tablet:gap-y-section"
	>
		{#each content.groups as group (group.id)}
			<NumberedList
				title={group.title}
				count={group.countLabel}
				items={group.items}
				testId={`doctor-detail-bio-${group.id}`}
			/>
		{/each}
	</div>
	<Button
		tone="muted"
		bordered={false}
		label={content.allLabel}
		href={allHref}
		data-testid="doctor-detail-bio-all"
		class="mt-6 w-full tablet:w-auto tablet:self-start"
	/>
</ProfileSection>
