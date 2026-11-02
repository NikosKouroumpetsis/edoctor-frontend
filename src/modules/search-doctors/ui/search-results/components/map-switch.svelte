<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';

	let { label, onclick }: { label: string; onclick: () => void } = $props();
</script>

<!-- The phone (the application's `MapSwitch`): once the sheet covers the map, the dark «Χάρτης» over the capsule
     lowers it to its top strip. -->
<div class="fixed bottom-above-tab-bar left-1/2 z-30 -translate-x-1/2 tablet:hidden">
	<Button
		tone="contrast"
		radius="full"
		{label}
		class="shadow-floating"
		data-testid="results-map-switch"
		{onclick}
	>
		{#snippet leading()}
			<Ionicon name="map-outline" class="icon-md text-secondary-foreground" />
		{/snippet}
	</Button>
</div>
