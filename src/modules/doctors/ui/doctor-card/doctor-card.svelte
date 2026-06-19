<script lang="ts">
	import HeartIcon from '~icons/lucide/heart';
	import MapPinIcon from '~icons/lucide/map-pin';
	import StarIcon from '~icons/lucide/star';
	import { cn } from '$shared/lib/utils';
	import { Card, CardContent, CardFooter } from '$shared/ui/primitives/card';
	import { Avatar, AvatarImage, AvatarFallback } from '$shared/ui/primitives/avatar';
	import { Badge } from '$shared/ui/primitives/badge';
	import { Button } from '$shared/ui/primitives/button';
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';
	import type { Doctor } from '$modules/doctors/types';

	let {
		doctor,
		wishlisted = $bindable(false),
		onBook,
		onToggleWishlist,
		class: className
	}: {
		doctor: Doctor;
		wishlisted?: boolean;
		onBook?: (doctor: Doctor) => void;
		onToggleWishlist?: (wishlisted: boolean) => void;
		class?: string;
	} = $props();

	const initials = $derived(
		doctor.name
			.split(' ')
			.map((part) => part[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);

	function toggleWishlist() {
		wishlisted = !wishlisted;
		onToggleWishlist?.(wishlisted);
	}
</script>

<Card class={cn('w-full max-w-sm gap-3 overflow-hidden pt-0', className)} data-slot="doctor-card">
	<div class="relative">
		<AspectRatio ratio={16 / 9} class="bg-muted">
			{#if doctor.imageUrl}
				<img src={doctor.imageUrl} alt={doctor.name} class="size-full object-cover" />
			{/if}
		</AspectRatio>
		<button
			type="button"
			aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
			aria-pressed={wishlisted}
			onclick={toggleWishlist}
			class="absolute top-2 right-2 inline-flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/55 focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<HeartIcon class={cn('size-5', wishlisted && 'fill-rose-500 text-rose-500')} />
		</button>
		{#if doctor.available}
			<Badge variant="success" class="absolute bottom-2 left-2">Available today</Badge>
		{/if}
	</div>

	<CardContent class="flex flex-col gap-2">
		<div class="flex items-center gap-3">
			<Avatar>
				<AvatarImage src={doctor.avatarUrl} alt={doctor.name} />
				<AvatarFallback>{initials}</AvatarFallback>
			</Avatar>
			<div class="min-w-0">
				<h3 class="truncate text-title-sm font-semibold">{doctor.name}</h3>
				<p class="truncate text-body-sm text-muted-foreground">{doctor.specialty}</p>
			</div>
		</div>

		<div class="flex items-center gap-1.5 text-body-sm text-muted-foreground">
			<MapPinIcon class="size-4 shrink-0" />
			<span class="truncate">{doctor.location}</span>
		</div>

		<div class="flex items-center gap-1.5 text-body-sm">
			<StarIcon class="size-4 fill-warning text-warning" />
			<span class="font-semibold">{doctor.rating.toFixed(1)}</span>
			<span class="text-muted-foreground">· {doctor.reviews} reviews</span>
		</div>

		{#if doctor.tags.length}
			<div class="flex flex-wrap gap-1.5">
				{#each doctor.tags as tag (tag)}
					<Badge variant="secondary">{tag}</Badge>
				{/each}
			</div>
		{/if}
	</CardContent>

	<CardFooter>
		<Button class="w-full" onclick={() => onBook?.(doctor)}>Book appointment</Button>
	</CardFooter>
</Card>
