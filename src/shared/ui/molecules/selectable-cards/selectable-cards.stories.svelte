<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent } from 'storybook/test';
	import { SelectableCards, SelectableCard } from '$shared/ui/molecules/selectable-cards';
	import HouseIcon from '~icons/lucide/house';
	import DoorOpenIcon from '~icons/lucide/door-open';
	import BedDoubleIcon from '~icons/lucide/bed-double';

	const { Story } = defineMeta({
		title: 'Molecules/Selectable cards',
		component: SelectableCards,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	// Reproduces images/selections/selection_A.png (single mode, top card preselected).
	let space = $state<string | string[]>('entire');
	// Generic demos.
	let single = $state<string | string[]>('room');
	let multiple = $state<string | string[]>(['entire']);
	let disabledValue = $state<string | string[]>('entire');
</script>

<Story name="Booking space (image)">
	{#snippet template()}
		<div class="max-w-xl">
			<SelectableCards
				type="single"
				bind:value={space}
				label="Τι είδους χώρο θα έχουν στη διάθεσή τους οι επισκέπτες;"
			>
				<SelectableCard
					value="entire"
					title="Ολόκληρο κατάλυμα"
					description="Οι επισκέπτες έχουν ολόκληρο τον χώρο στη διάθεσή τους."
				>
					{#snippet icon()}<HouseIcon class="icon-xl" />{/snippet}
				</SelectableCard>
				<SelectableCard
					value="room"
					title="Ένα δωμάτιο"
					description="Οι επισκέπτες έχουν το δικό τους δωμάτιο σε ένα κατάλυμα, καθώς και πρόσβαση σε κοινόχρηστους χώρους."
				>
					{#snippet icon()}<DoorOpenIcon class="icon-xl" />{/snippet}
				</SelectableCard>
				<SelectableCard
					value="shared"
					title="Κοινόχρηστο δωμάτιο σε χόστελ"
					description="Οι επισκέπτες κοιμούνται σε ένα κοινόχρηστο δωμάτιο, σε ένα χόστελ από εταιρεία διαχείρισης και με προσωπικό 24 ώρες το 24-ωρο."
				>
					{#snippet icon()}<BedDoubleIcon class="icon-xl" />{/snippet}
				</SelectableCard>
			</SelectableCards>
		</div>
	{/snippet}
</Story>

<Story name="Single">
	{#snippet template()}
		<div class="max-w-xl">
			<SelectableCards type="single" bind:value={single} label="Διάλεξε έναν χώρο">
				<SelectableCard
					value="entire"
					title="Ολόκληρο κατάλυμα"
					description="Όλος ο χώρος δικός σου."
				>
					{#snippet icon()}<HouseIcon class="icon-xl" />{/snippet}
				</SelectableCard>
				<SelectableCard
					value="room"
					title="Ένα δωμάτιο"
					description="Ιδιωτικό δωμάτιο με κοινόχρηστους χώρους."
				>
					{#snippet icon()}<DoorOpenIcon class="icon-xl" />{/snippet}
				</SelectableCard>
				<SelectableCard
					value="shared"
					title="Κοινόχρηστο δωμάτιο"
					description="Κοινόχρηστος χώρος ύπνου."
				>
					{#snippet icon()}<BedDoubleIcon class="icon-xl" />{/snippet}
				</SelectableCard>
			</SelectableCards>
		</div>
	{/snippet}
</Story>

<Story name="Multiple">
	{#snippet template()}
		<div class="max-w-xl">
			<SelectableCards type="multiple" bind:value={multiple} label="Διάλεξε όσους χώρους θέλεις">
				<SelectableCard
					value="entire"
					title="Ολόκληρο κατάλυμα"
					description="Όλος ο χώρος δικός σου."
				>
					{#snippet icon()}<HouseIcon class="icon-xl" />{/snippet}
				</SelectableCard>
				<SelectableCard
					value="room"
					title="Ένα δωμάτιο"
					description="Ιδιωτικό δωμάτιο με κοινόχρηστους χώρους."
				>
					{#snippet icon()}<DoorOpenIcon class="icon-xl" />{/snippet}
				</SelectableCard>
				<SelectableCard
					value="shared"
					title="Κοινόχρηστο δωμάτιο"
					description="Κοινόχρηστος χώρος ύπνου."
				>
					{#snippet icon()}<BedDoubleIcon class="icon-xl" />{/snippet}
				</SelectableCard>
			</SelectableCards>
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="max-w-xl">
			<SelectableCards
				type="single"
				bind:value={disabledValue}
				disabled
				label="Μη διαθέσιμη επιλογή"
			>
				<SelectableCard
					value="entire"
					title="Ολόκληρο κατάλυμα"
					description="Όλος ο χώρος δικός σου."
				>
					{#snippet icon()}<HouseIcon class="icon-xl" />{/snippet}
				</SelectableCard>
				<SelectableCard
					value="room"
					title="Ένα δωμάτιο"
					description="Ιδιωτικό δωμάτιο με κοινόχρηστους χώρους."
				>
					{#snippet icon()}<DoorOpenIcon class="icon-xl" />{/snippet}
				</SelectableCard>
			</SelectableCards>
		</div>
	{/snippet}
</Story>

<Story
	name="Arrow selects (single)"
	play={async ({ canvas }) => {
		const radios = canvas.getAllByRole('radio');
		radios[0].focus();
		await userEvent.keyboard('{ArrowDown}');
		await expect(radios[1]).toHaveFocus();
		await expect(radios[1]).toHaveAttribute('aria-checked', 'true');
	}}
>
	{#snippet template()}
		<div class="max-w-xl">
			<SelectableCards type="single" label="Διάλεξε έναν χώρο">
				<SelectableCard
					value="entire"
					title="Ολόκληρο κατάλυμα"
					description="Όλος ο χώρος δικός σου."
				/>
				<SelectableCard value="room" title="Ένα δωμάτιο" description="Ιδιωτικό δωμάτιο." />
				<SelectableCard
					value="shared"
					title="Κοινόχρηστο δωμάτιο"
					description="Κοινόχρηστος χώρος."
				/>
			</SelectableCards>
		</div>
	{/snippet}
</Story>
