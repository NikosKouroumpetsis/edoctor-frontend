<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { LaurelScore } from '$shared/ui/molecules/laurel-score';
	import { StatStrip } from '$shared/ui/molecules/stat-strip';
	import { Rating } from '$shared/ui/primitives/rating';

	const { Story } = defineMeta({
		title: 'Molecules/StatStrip',
		component: StatStrip,
		tags: ['autodocs']
	});
</script>

<!-- The profile's top stats as the application's page draws its cells (`top-stat-item`). -->
{#snippet rating()}
	<Rating variant="stat" label="4,9" />
{/snippet}
{#snippet badge()}
	<div class="flex w-full items-center justify-center px-1.5 py-1">
		<LaurelScore label="Επιλογή ασθενών" />
	</div>
{/snippet}
{#snippet reviews()}
	<div class="flex flex-col items-center justify-center">
		<p class="text-center text-body-lg font-semibold text-foreground">124</p>
		<p class="text-center text-body-lg leading-relaxed text-foreground/80">κριτικές</p>
	</div>
{/snippet}

{#snippet strip()}
	<StatStrip
		cells={[
			{ id: 'rating', render: rating },
			{ id: 'badge', render: badge },
			{ id: 'reviews', render: reviews }
		]}
		wrap={{ id: 'badge', text: 'Επιλογή ασθενών' }}
		testId="story-stats"
		testIdPrefix="story-stat"
	/>
{/snippet}

<Story name="Playground">
	{#snippet template()}
		<div class="w-full max-w-form px-4">{@render strip()}</div>
	{/snippet}
</Story>

<Story name="Badge on its own line">
	{#snippet template()}
		<!-- S-26.2: in a narrow strip the word «Επιλογή» no longer fits beside the numbers. -->
		<div class="w-placeholder-xl px-4">{@render strip()}</div>
	{/snippet}
</Story>

<Story name="Numbers only">
	{#snippet template()}
		<div class="w-full max-w-narrow px-4">
			<StatStrip
				cells={[
					{ id: 'rating', render: rating },
					{ id: 'reviews', render: reviews }
				]}
			/>
		</div>
	{/snippet}
</Story>

<Story
	name="On the phone"
	parameters={{ layout: 'fullscreen' }}
	globals={{ viewport: { value: 'z375', isRotated: false } }}
>
	{#snippet template()}
		<div class="px-gutter-sm py-card">{@render strip()}</div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="w-full max-w-form bg-background p-card">{@render strip()}</div>
	{/snippet}
</Story>
