<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MapSheet, type MapSheetSnap } from '$shared/ui/organisms/map-sheet';

	// U-24.4: the phone's list over the map — half, then the whole stage after the first scroll, or only its top.
	// U-27.1: on the phone a finger (or the mouse on its top strip) carries it, and it rests where it is let go.
	const { Story } = defineMeta({
		title: 'Organisms/MapSheet',
		component: MapSheet,
		tags: ['autodocs']
	});
</script>

{#snippet rows()}
	{#each [1, 2, 3, 4, 5, 6] as row (row)}
		<div class="mx-4 mb-4 h-card-list-media rounded-lg bg-muted"></div>
	{/each}
{/snippet}

{#snippet header()}
	<p class="pb-4 text-center text-body-lg font-semibold text-foreground">Βρέθηκαν 128</p>
{/snippet}

{#snippet stage(snap: MapSheetSnap)}
	<div class="relative h-menu-max-h overflow-hidden bg-muted-foreground/20">
		<MapSheet {snap} restoreLabel="Επαναφορά λίστας" {header} children={rows} />
	</div>
{/snippet}

<Story name="Half">
	{#snippet template()}
		{@render stage('half')}
	{/snippet}
</Story>

<Story name="Peek">
	{#snippet template()}
		{@render stage('peek')}
	{/snippet}
</Story>

<Story name="Full">
	{#snippet template()}
		{@render stage('full')}
	{/snippet}
</Story>

<!-- U-27.1: drag it on the phone (375) from its top or from the list, up or down, slow or flung. -->
<Story name="Drag" globals={{ viewport: { value: 'z375', isRotated: false } }}>
	{#snippet template()}
		{@render stage('half')}
	{/snippet}
</Story>
