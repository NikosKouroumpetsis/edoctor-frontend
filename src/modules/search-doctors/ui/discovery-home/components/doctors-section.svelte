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
			<h2 class="text-heading-md text-foreground md:text-heading-lg">
				{title}
			</h2>
			{#if subtitle}
				<p class="text-body-md text-muted-foreground">{subtitle}</p>
			{/if}
		</div>
		<button
			type="button"
			aria-label={viewAllLabel}
			class="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-soft outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<ArrowRightIcon class="icon-md" />
		</button>
	</div>

	<div
		class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12 [&::-webkit-scrollbar]:hidden"
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
