<script lang="ts">
	import HeartIcon from '~icons/lucide/heart';
	import TagIcon from '~icons/lucide/tag';
	import StarIcon from '~icons/lucide/star';
	import MessageIcon from '~icons/lucide/message-circle';
	import type { DoctorCard } from '$modules/search-doctors/types';

	let {
		doctor,
		isFavorite = false,
		favoriteLabel,
		onToggleFavorite,
		variant = 'carousel'
	}: {
		doctor: DoctorCard;
		isFavorite?: boolean;
		favoriteLabel: string;
		onToggleFavorite: (slug: string) => void;
		variant?: 'carousel' | 'list';
	} = $props();

	const isCarousel = $derived(variant === 'carousel');
</script>

<article class={['flex flex-col gap-2.5', isCarousel ? 'w-42 shrink-0 md:w-54' : 'w-full']}>
	<div class="relative">
		<img
			src={doctor.imageUrl}
			alt={doctor.name}
			loading="lazy"
			decoding="async"
			referrerpolicy="no-referrer"
			class={[
				'w-full rounded-media bg-muted object-cover',
				isCarousel ? 'h-38 md:h-47' : 'h-47 md:h-56'
			]}
		/>

		{#if doctor.badgeLabel}
			<span
				class="absolute top-3 left-3 rounded-full bg-card px-3 py-1.5 text-label-md text-foreground shadow-soft"
			>
				{doctor.badgeLabel}
			</span>
		{/if}

		<button
			type="button"
			aria-label={favoriteLabel}
			aria-pressed={isFavorite}
			onclick={() => onToggleFavorite(doctor.doctorSlug)}
			class="absolute top-3 right-3 grid size-9 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<HeartIcon
				class={['icon-md', isFavorite ? 'fill-current text-accent' : 'text-foreground/75']}
			/>
		</button>
	</div>

	<div class="flex flex-col gap-1">
		<p class="truncate text-body-lg font-semibold text-foreground">{doctor.name}</p>
		<p class="truncate text-body-md text-muted-foreground">{doctor.specialty}</p>
		<p class="truncate text-label-lg text-muted-foreground">{doctor.city}</p>
		<p class="text-label-md font-semibold text-primary">{doctor.availabilityLabel}</p>

		<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
			<span class="flex items-center gap-1.5 text-body-sm text-muted-foreground">
				<TagIcon class="icon-xs" />
				{doctor.visitFeeLabel}
			</span>
			<span class="flex items-center gap-1.5 text-body-sm font-semibold text-primary">
				<StarIcon class="icon-xs fill-current text-accent" />
				{doctor.rating.toFixed(1)}
			</span>
			<span class="flex items-center gap-1.5 text-body-sm text-muted-foreground">
				<MessageIcon class="icon-xs" />
				{doctor.reviewCount}
			</span>
		</div>
	</div>
</article>
