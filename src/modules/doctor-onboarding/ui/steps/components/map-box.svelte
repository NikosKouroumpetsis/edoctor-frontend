<script lang="ts">
	import type { Snippet } from 'svelte';
	import PlusIcon from '~icons/lucide/plus';
	import { mapStyleUrl } from '$shared/config/map';
	import { cn } from '$shared/lib/utils';
	import { theme } from '$shared/preferences/theme';
	import {
		MapView,
		type MapViewCenter,
		type MapViewMove,
		type MapViewZoomControls
	} from '$shared/ui/organisms/map-view';

	let {
		center,
		zoom,
		marker,
		live = false,
		label,
		attributionLabel,
		locale,
		zoomControls,
		onMoveStart,
		onMoveEnd,
		pill,
		tip,
		testId
	}: {
		/** Where the map opens (read once: the map is drawn when its start is known). */
		center: { latitude: number; longitude: number };
		zoom: number;
		/** The office's pin, fixed in the middle (the map moves under it). */
		marker: boolean;
		/** The pin's map: it pans and zooms around its middle; otherwise a still picture nobody can reach. */
		live?: boolean;
		/** The map's name for assistive tech (the live one). */
		label: string;
		/** The credit's «i», «Πηγές του χάρτη» (review w3-w4 R1 MINOR-5, the application's). */
		attributionLabel: string;
		locale: string;
		zoomControls?: MapViewZoomControls;
		onMoveStart?: (move: MapViewMove) => void;
		onMoveEnd?: (center: MapViewCenter, move: MapViewMove) => void;
		/** The white capsule over the map (the address, or the way to the search). */
		pill: Snippet;
		/** The dark hint under the pin («Σύρετε τον χάρτη…»), until the person's first move. */
		tip?: string | null;
		testId: string;
	} = $props();
</script>

{#snippet noPoint()}{/snippet}

<!-- Record §6.7.1 / §6.7.4 (`doctor.css` `.d-map`, Airbnb's 9.30.11): the site's ONE map in the reader's theme and language,
     corner 24, 360 high (480 from 744: review w3-w4 R1 MINOR-4, the application's `hero-h` below 744, U-81.2); the capsule at the top; the pin a dark 48 circle with a white cross and its point,
     fixed in the middle while the map moves under it. The still map is `inert` (no focus, no drag); the live one zooms
     around its middle with «+» / «−» at the bottom left at every width, and folds its credits into «i». -->
<div
	data-slot="doctor-onboarding-map"
	data-testid={testId}
	class="relative isolate h-hero-h overflow-hidden rounded-xl border border-border bg-muted tablet:h-office-map-lg"
>
	<div class={cn('absolute inset-0', !live && 'pointer-events-none')} inert={!live}>
		<MapView
			styleUrl={mapStyleUrl(theme.resolved)}
			points={[]}
			pin={noPoint}
			labelLanguage={locale}
			camera={{ center: [center.longitude, center.latitude], zoom }}
			zoomAround={live ? 'center' : 'pointer'}
			zoomControlsFrom={live ? 'phone' : 'tablet'}
			zoomControls={live ? zoomControls : undefined}
			zoomControlsClass="top-auto right-auto bottom-3 left-3"
			{onMoveStart}
			{onMoveEnd}
			aria-label={label}
			{attributionLabel}
			testId={`${testId}-view`}
			class="size-full"
		/>
	</div>
	<div class="absolute inset-x-3.5 top-3.5 z-10">
		{@render pill()}
	</div>
	{#if marker}
		<span
			aria-hidden="true"
			data-slot="doctor-onboarding-pin"
			class="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center"
		>
			<span
				class="grid size-touch place-items-center rounded-full bg-foreground text-background shadow-raised"
			>
				<PlusIcon class="icon-lg" />
			</span>
			<span class="-mt-1.5 size-3 rotate-45 bg-foreground"></span>
		</span>
	{/if}
	{#if tip}
		<div class="pointer-events-none absolute inset-x-6 top-1/2 z-10 mt-3.5 flex justify-center">
			<p
				class="rounded-lg bg-foreground px-4 py-2.5 text-center text-body-sm font-medium text-background"
				data-testid={`${testId}-tip`}
			>
				{tip}
			</p>
		</div>
	{/if}
</div>
