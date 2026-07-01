<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Slider } from '$shared/ui/primitives/slider';

	const { Story } = defineMeta({
		title: 'Primitives/Slider',
		component: Slider,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let single = $state(50);
	let range = $state([20, 80]);
	let stepped = $state(40);
	let small = $state(50);
	let medium = $state(50);
	let large = $state(50);
</script>

<Story name="Single">
	{#snippet template()}
		<div class="w-80">
			<Slider bind:value={single} aria-label="Volume" />
			<p class="mt-2 text-body-sm text-muted-foreground">Value: {single}</p>
		</div>
	{/snippet}
</Story>

<Story name="Range">
	{#snippet template()}
		<div class="w-80">
			<Slider bind:value={range} aria-label="Price range" />
			<p class="mt-2 text-body-sm text-muted-foreground">Range: {range.join(' – ')}</p>
		</div>
	{/snippet}
</Story>

<Story name="Stepped">
	{#snippet template()}
		<div class="w-80">
			<Slider bind:value={stepped} min={0} max={100} step={10} aria-label="Stepped" />
			<p class="mt-2 text-body-sm text-muted-foreground">Value: {stepped} (step 10)</p>
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="w-80"><Slider value={30} disabled aria-label="Disabled" /></div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex w-80 flex-col gap-6">
			<Slider bind:value={small} size="sm" aria-label="Small" />
			<Slider bind:value={medium} size="default" aria-label="Default" />
			<Slider bind:value={large} size="lg" aria-label="Large" />
		</div>
	{/snippet}
</Story>
