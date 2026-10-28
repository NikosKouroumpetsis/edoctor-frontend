<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ScoreChip } from '$shared/ui/primitives/score-chip';

	// The application's meta (`atoms/score-chip`).
	const { Story } = defineMeta({
		title: 'Primitives/ScoreChip',
		component: ScoreChip,
		tags: ['autodocs'],
		args: { icon: 'sparkles-outline', label: 'Καθαριότητα', value: '4,9' }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<ScoreChip {...args} />
	{/snippet}
</Story>

<!-- The sideways row the chips sit in, as on a ratings summary: no visible bar (U-06.4). -->
<Story name="Row">
	{#snippet template()}
		<div class="scrollbar-none flex flex-row gap-3 overflow-x-auto overscroll-x-contain">
			<ScoreChip icon="sparkles-outline" label="Καθαριότητα" value="4,9" />
			<ScoreChip icon="chatbubbles-outline" label="Επικοινωνία" value="4,8" />
			<ScoreChip icon="time-outline" label="Συνέπεια" value="4,7" />
		</div>
	{/snippet}
</Story>
