<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import HouseIcon from '~icons/lucide/house';
	import { SelectableCard } from '$shared/ui/molecules/selectable-cards';

	// The application's meta (`molecules/selectable-card`): one card on its own, a press toggles it.
	const { Story } = defineMeta({
		title: 'Molecules/SelectableCard',
		component: SelectableCard,
		tags: ['autodocs'],
		args: {
			title: 'Ολόκληρο κατάλυμα',
			description: 'Οι επισκέπτες έχουν ολόκληρο τον χώρο στη διάθεσή τους.',
			selected: false
		}
	});
</script>

<script lang="ts">
	let selected = $state(true);
	// A lone card that toggles is a checkbox (the component's `role` prop; its button is checked in its own file).
	const toggles = 'checkbox' as const;
</script>

{#snippet house()}<HouseIcon class="icon-lg text-foreground" />{/snippet}

<Story name="Interactive">
	{#snippet template()}
		<div class="w-full max-w-form p-4">
			<SelectableCard
				role={toggles}
				title="Ολόκληρο κατάλυμα"
				description="Οι επισκέπτες έχουν ολόκληρο τον χώρο στη διάθεσή τους."
				icon={house}
				{selected}
				onclick={() => (selected = !selected)}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Unselected">
	{#snippet template()}
		<div class="w-full max-w-form p-4">
			<SelectableCard
				role={toggles}
				title="Ένα δωμάτιο"
				description="Ιδιωτικό δωμάτιο με κοινόχρηστους χώρους."
				selected={false}
				onclick={() => {}}
			/>
		</div>
	{/snippet}
</Story>
