<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MentionChips } from '$shared/ui/molecules/mention-chips';

	const chips = [
		{ id: 'courtesy', label: 'Ευγένεια', count: '53', icon: 'heart-outline' as const },
		{ id: 'explain', label: 'Εξήγηση', count: '46', icon: 'chatbubble-ellipses-outline' as const },
		{ id: 'organize', label: 'Οργάνωση', count: '44', icon: 'calendar-outline' as const },
		{
			id: 'clean',
			label: 'Καθαριότητα ιατρείου',
			count: '35',
			icon: 'sparkles-outline' as const
		},
		{ id: 'patience', label: 'Υπομονή', count: '32', icon: 'leaf-outline' as const },
		{ id: 'access', label: 'Πρόσβαση', count: '27', icon: 'location-outline' as const }
	];

	const { Story } = defineMeta({
		title: 'Molecules/MentionChips',
		component: MentionChips,
		tags: ['autodocs'],
		args: {
			title: 'Οι ασθενείς αναφέρουν',
			chips,
			value: null,
			onChange: () => {},
			clearLabel: 'Καθαρισμός',
			scrollLabels: { previous: 'Προηγούμενα', next: 'Επόμενα' }
		},
		argTypes: { bleed: { control: 'select', options: ['none', 'gutter-sm'] } }
	});
</script>

<script lang="ts">
	// The application's chips are pressed by the reader in its workshop; here a press moves the story's own choice.
	let chosen = $state<string | null>(null);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-content">
			<MentionChips {...args} value={chosen} onChange={(next) => (chosen = next)} />
		</div>
	{/snippet}
</Story>

<!-- A topic chosen: the 2 dark ring, the glyph's colour, and «× Καθαρισμός» beside the heading. -->
<Story name="Chosen" args={{ value: 'organize' }}>
	{#snippet template(args)}
		<div class="w-full max-w-content"><MentionChips {...args} /></div>
	{/snippet}
</Story>

<!-- A long label on a phone: the row scrolls, nothing wraps. -->
<Story name="Narrow">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><MentionChips {...args} /></div>
	{/snippet}
</Story>
