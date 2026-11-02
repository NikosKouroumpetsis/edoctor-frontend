<script lang="ts">
	import { MapPinCard } from '$shared/ui/molecules/map-pin-card';
	import { MediaBadge } from '$shared/ui/primitives/media-badge';
	import type { SearchResultCard } from '$modules/search-doctors/types';
	import { FeeSignIn } from '$modules/search-doctors/ui/search-doctor-card';

	let {
		card,
		href,
		profileLabel,
		closeLabel,
		onClose,
		onkeydown,
		onSignIn
	}: {
		/** The pressed pin's card (the list's SAME card, D-103). */
		card: SearchResultCard;
		href: string;
		profileLabel: string;
		closeLabel: string;
		onClose: () => void;
		/** Escape in the open card closes it (its «×» from the keyboard). */
		onkeydown: (event: KeyboardEvent) => void;
		/** «Συνδεθείτε για κόστος»: the sign-in (S-31.4, U-27.4), never the profile. */
		onSignIn: () => void;
	} = $props();
</script>

<!-- The card of the pressed pin over the map (the application's `ResultsPinCard`): above the phone's sheet (184), over
     the 744 map's switch (96, 360 wide), 20 from the bottom of the split map. U-28.1: from 1128 the card is at most 360
     and keeps 12 from the map's sides (the 1/3 map at 1128 is ~347 wide), centred by its margins. -->
<MapPinCard
	{href}
	linkLabel={`${profileLabel} ${card.name}`}
	imageUrl={card.imageUrl}
	{closeLabel}
	{onClose}
	{onkeydown}
	testId="results-pin-card"
	class="absolute inset-x-3 bottom-map-card-over-sheet z-30 tablet:inset-x-auto tablet:bottom-map-card-over-switch tablet:left-1/2 tablet:w-narrow tablet:-translate-x-1/2 laptop:inset-x-3 laptop:bottom-5 laptop:mx-auto laptop:w-auto laptop:max-w-narrow laptop:translate-x-0"
>
	{#snippet badge()}
		{#if card.badgeLabel}
			<MediaBadge label={card.badgeLabel} maxLines={2} width="badge" />
		{/if}
	{/snippet}
	<span class="line-clamp-1 text-body-sm font-semibold text-foreground">{card.name}</span>
	<!-- U-27.3 (app = web): the specialty and the area in the text colour. -->
	<span class="line-clamp-1 text-label-lg text-foreground">
		{[card.specialty, card.area].filter(Boolean).join(' · ')}
	</span>
	{#if card.availabilityLabel}
		<span class="line-clamp-1 text-label-lg font-semibold text-primary-text">
			{card.availabilityLabel}
		</span>
	{/if}
	<!-- NIT-4 (r1): a long fee gives way (it is cut), the rating never («★ Νέο» whole at 375). U-27.4: a hidden
	     fee is the action, inline in the same cut words (the line's 13 and height, as before); 4 of room for its
	     grown target and ring, given back by the margin (f1b). -->
	<span
		data-slot="results-pin-card-fee"
		class="flex min-w-0 items-baseline gap-1 text-label-lg text-foreground"
	>
		<span class={['min-w-0 truncate', card.fee.kind === 'login' && '-m-1 p-1']}
			>{#if card.fee.kind === 'login'}<FeeSignIn
					label={card.fee.label}
					onPress={onSignIn}
					testId="results-pin-card-sign-in"
				/>{:else}{card.fee.label}{/if} ·</span
		>
		<span class="shrink-0 whitespace-nowrap"
			><span class="text-rating">★</span>&nbsp;{card.ratingLabel}</span
		>
	</span>
</MapPinCard>
