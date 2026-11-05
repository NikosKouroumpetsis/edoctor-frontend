<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import { mapStyleUrl } from '$shared/config/map';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { theme } from '$shared/preferences/theme';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { MapView } from '$shared/ui/organisms/map-view';

	let {
		officeId,
		coordinates,
		label,
		locale,
		openHref,
		onOpen,
		zoomControlsClass,
		testId,
		class: className
	}: {
		/** The office the map shows (U-39.1: the active one alone); a new one glides the camera to it. */
		officeId: string;
		coordinates: { latitude: number; longitude: number };
		/** The office's name for assistive tech (its address). */
		label: string;
		locale: SupportedLocale;
		/**
		 * The section's preview (the application's `onPress`): on the phone a press opens the location's window, from
		 * 744 the «⤢» does; without it, the window's own map (pans, zooms with the wheel).
		 */
		openHref?: ResolvedPathname;
		onOpen?: (event?: MouseEvent) => void;
		/** Where the zoom sits on the office's page: under the «×» on the map (U-68.1 Π2). */
		zoomControlsClass?: string;
		testId: string;
		class?: string;
	} = $props();

	const options = $derived({ locale });
	const points = $derived([
		{ id: officeId, latitude: coordinates.latitude, longitude: coordinates.longitude }
	]);
	const isPreview = $derived(Boolean(openHref));
</script>

<!-- 🔴 U-39.1 (app = web, the application's `DoctorOfficeMap`): the active office alone on the ONE map config's style
     in the reader's theme and language, under its medical pin, street level. The section's map: the wheel scrolls the
     page (the prototype), «+» / «−» and «⤢» from 744, the phone's press opens the window; the window's map pans and
     zooms. -->
<div
	data-slot="doctor-office-map"
	data-testid={testId}
	class={cn('relative isolate overflow-hidden rounded-lg bg-muted', className)}
>
	<MapView
		styleUrl={mapStyleUrl(theme.resolved)}
		{points}
		selectedId={officeId}
		labelLanguage={locale}
		camera={{ center: [coordinates.longitude, coordinates.latitude], zoom: 15 }}
		fitKey={officeId}
		fitAnimate
		scrollZoom={!isPreview}
		{zoomControlsClass}
		zoomControls={{
			zoomInLabel: m.doctor_map_zoom_in({}, options),
			zoomOutLabel: m.doctor_map_zoom_out({}, options)
		}}
		expandControl={isPreview
			? {
					expanded: false,
					expandLabel: m.doctor_map_show({}, options),
					collapseLabel: m.doctor_window_close({}, options),
					onExpandedChange: () => onOpen?.(),
					from: 'tablet'
				}
			: undefined}
		aria-label={`${m.doctor_map_label({}, options)}: ${label}`}
		testId={`${testId}-view`}
		class="absolute inset-0"
	>
		{#snippet pin()}
			<span
				aria-hidden="true"
				data-testid={`${testId}-pin`}
				class="grid size-touch place-items-center rounded-full border-2 border-background bg-accent text-accent-foreground shadow-raised"
			>
				<Ionicon name="medkit-outline" class="icon-md" />
			</span>
		{/snippet}
	</MapView>
	{#if openHref}
		<a
			href={openHref}
			aria-label={m.doctor_map_show({}, options)}
			data-testid={`${testId}-open`}
			onclick={(event) => onOpen?.(event)}
			class="absolute inset-0 z-10 min-h-touch min-w-touch outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset tablet:hidden"
		></a>
	{/if}
</div>
