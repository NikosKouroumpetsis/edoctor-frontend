<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import type { DesktopMap } from '../types';

	let {
		mapShown,
		desktopMap,
		showMapLabel,
		showListLabel,
		onclick
	}: {
		/** 744–1127: the map shows instead of the list. */
		mapShown: boolean;
		desktopMap: DesktopMap;
		showMapLabel: string;
		showListLabel: string;
		onclick: () => void;
	} = $props();
</script>

<!-- 744–1127 (web only): the floating switch between the list and the map. From 1128 only while the map is hidden
     (U-28.2): the same dark pill in the same place, «Εμφάνιση χάρτη». -->
<div
	class={cn(
		'fixed bottom-map-switch-bottom left-1/2 z-20 hidden -translate-x-1/2 tablet:block',
		desktopMap !== 'hidden' && 'laptop:hidden'
	)}
>
	<Button
		tone="contrast"
		radius="full"
		label={mapShown ? showListLabel : showMapLabel}
		class="shadow-floating"
		data-testid="results-map-toggle"
		aria-pressed={mapShown}
		{onclick}
	>
		{#snippet leading()}
			<Ionicon
				name={mapShown ? 'list-outline' : 'map-outline'}
				class="icon-md text-secondary-foreground"
			/>
		{/snippet}
	</Button>
</div>
