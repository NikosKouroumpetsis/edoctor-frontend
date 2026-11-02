<script lang="ts">
	import { NumberedList } from '$shared/ui/molecules/numbered-list';
	import type { DoctorBioGroup } from '$modules/doctor/lib/detail';
	import ProfileSection from './profile-section.svelte';

	let { content }: { content: { title: string; groups: DoctorBioGroup[] } } = $props();
</script>

<!-- 🔴 U-35.7 (app = web, the application's `BioSection`): «Βιογραφικό σημείωμα», each group numbered under its title
     and count, 2 columns from 744 (the prototype); a group's «Εμφάνιση περισσότερα» and «Εμφάνιση όλου του
     βιογραφικού» are not drawn until they have a place to go. -->
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
</ProfileSection>
