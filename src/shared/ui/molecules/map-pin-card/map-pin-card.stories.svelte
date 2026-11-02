<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MapPinCard } from '$shared/ui/molecules/map-pin-card';

	// U-24.4: the card a pin opens over the results map — the 128 photo, the lines, its own «×».
	const { Story } = defineMeta({
		title: 'Molecules/MapPinCard',
		component: MapPinCard,
		tags: ['autodocs']
	});
</script>

{#snippet lines()}
	<span class="line-clamp-1 text-body-sm font-semibold text-foreground">Ανδρέας Παππάς</span>
	<span class="line-clamp-1 text-label-lg text-muted-foreground">Καρδιολόγος · Αμπελόκηποι</span>
	<span class="text-label-lg font-semibold text-primary-text">Σήμερα · 17:30</span>
	<span class="text-label-lg text-foreground">Από 60 € · ★ 4,9</span>
{/snippet}

<Story name="Default">
	{#snippet template()}
		<div class="max-w-narrow">
			<MapPinCard
				href="#"
				linkLabel="Προφίλ Α. Παππάς"
				imageUrl={null}
				closeLabel="Κλείσιμο"
				onClose={() => {}}
				children={lines}
			/>
		</div>
	{/snippet}
</Story>
