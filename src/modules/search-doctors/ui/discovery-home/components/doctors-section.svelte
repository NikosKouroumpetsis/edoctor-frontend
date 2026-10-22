<script lang="ts">
	import ArrowRightIcon from '~icons/lucide/arrow-right';
	import type { DoctorCard as DoctorCardType } from '$modules/search-doctors/types';
	import DoctorCard from './doctor-card.svelte';

	let {
		title,
		subtitle,
		viewAllLabel,
		favoriteLabel,
		doctors,
		isFavorite,
		onToggleFavorite
	}: {
		title: string;
		subtitle?: string;
		viewAllLabel: string;
		favoriteLabel: string;
		doctors: DoctorCardType[];
		isFavorite: (slug: string) => boolean;
		onToggleFavorite: (slug: string) => void;
	} = $props();
</script>

<section class="flex flex-col gap-3.5">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-1 flex-col gap-1">
			<h2 class="text-heading-md text-foreground tablet:text-heading-lg">
				{title}
			</h2>
			{#if subtitle}
				<p class="text-body-md text-muted-foreground">{subtitle}</p>
			{/if}
		</div>
		<button
			type="button"
			aria-label={viewAllLabel}
			class="group grid size-touch shrink-0 place-items-center rounded-full outline-none"
		>
			<span
				class="grid size-control-sm place-items-center rounded-full bg-card text-foreground shadow-soft group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
			>
				<ArrowRightIcon class="icon-md" />
			</span>
		</button>
	</div>

	<div
		class="container-bleed flex gap-rail overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
	>
		{#each doctors as doctor (doctor.id)}
			<DoctorCard
				{doctor}
				{favoriteLabel}
				isFavorite={isFavorite(doctor.doctorSlug)}
				{onToggleFavorite}
			/>
		{/each}
	</div>
</section>
