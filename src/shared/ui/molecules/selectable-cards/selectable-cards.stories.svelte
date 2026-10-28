<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import HouseIcon from '~icons/lucide/house';
	import DoorOpenIcon from '~icons/lucide/door-open';
	import BedDoubleIcon from '~icons/lucide/bed-double';
	import {
		SelectableCards,
		type SelectableCardsValue
	} from '$shared/ui/molecules/selectable-cards';

	// The application's stories (`molecules/selectable-cards`), with its Lucide glyphs at `icon-lg`.
	const { Story } = defineMeta({
		title: 'Molecules/SelectableCards',
		component: SelectableCards,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let space = $state<SelectableCardsValue>('entire');
	let sort = $state<SelectableCardsValue>('popularity');
	let many = $state<SelectableCardsValue>(['entire']);
</script>

{#snippet house()}<HouseIcon class="icon-lg text-foreground" />{/snippet}
{#snippet door()}<DoorOpenIcon class="icon-lg text-foreground" />{/snippet}
{#snippet bed()}<BedDoubleIcon class="icon-lg text-foreground" />{/snippet}

<Story name="Booking Space Image">
	{#snippet template()}
		<div class="w-full max-w-form p-4">
			<SelectableCards
				type="single"
				bind:value={space}
				label="Τι είδους χώρο θα έχουν στη διάθεσή τους οι επισκέπτες;"
				options={[
					{
						value: 'entire',
						title: 'Ολόκληρο κατάλυμα',
						description: 'Οι επισκέπτες έχουν ολόκληρο τον χώρο στη διάθεσή τους.',
						icon: house
					},
					{
						value: 'room',
						title: 'Ένα δωμάτιο',
						description:
							'Οι επισκέπτες έχουν το δικό τους δωμάτιο σε ένα κατάλυμα, καθώς και πρόσβαση σε κοινόχρηστους χώρους.',
						icon: door
					},
					{
						value: 'shared',
						title: 'Κοινόχρηστο δωμάτιο σε χόστελ',
						description:
							'Οι επισκέπτες κοιμούνται σε ένα κοινόχρηστο δωμάτιο, σε ένα χόστελ από εταιρεία διαχείρισης και με προσωπικό 24 ώρες το 24-ωρο.',
						icon: bed
					}
				]}
			/>
		</div>
	{/snippet}
</Story>

<!-- The leading-glyph layout: the filters' «Ταξινόμηση» cards. -->
<Story name="Leading Icons">
	{#snippet template()}
		<div class="w-full max-w-form p-4">
			<SelectableCards
				type="single"
				iconPlacement="leading"
				bind:value={sort}
				label="Ταξινόμηση"
				options={[
					{
						value: 'popularity',
						title: 'Προτεινόμενα',
						description: 'Οι πιο προτεινόμενοι πρώτα',
						icon: house
					},
					{
						value: 'rating',
						title: 'Αξιολόγηση',
						description: 'Καλύτερη αξιολόγηση πρώτα',
						icon: door
					},
					{ value: 'distance', title: 'Απόσταση', description: 'Κοντινότεροι πρώτα', icon: bed }
				]}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Multiple">
	{#snippet template()}
		<div class="w-full max-w-form p-4">
			<SelectableCards
				type="multiple"
				bind:value={many}
				label="Διάλεξε όσους χώρους θέλεις"
				options={[
					{
						value: 'entire',
						title: 'Ολόκληρο κατάλυμα',
						description: 'Όλος ο χώρος δικός σου.',
						icon: house
					},
					{
						value: 'room',
						title: 'Ένα δωμάτιο',
						description: 'Ιδιωτικό δωμάτιο με κοινόχρηστους χώρους.',
						icon: door
					},
					{
						value: 'shared',
						title: 'Κοινόχρηστο δωμάτιο',
						description: 'Κοινόχρηστος χώρος ύπνου.',
						icon: bed
					}
				]}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="w-full max-w-form p-4">
			<SelectableCards
				type="single"
				value="entire"
				disabled
				label="Μη διαθέσιμη επιλογή"
				options={[
					{ value: 'entire', title: 'Ολόκληρο κατάλυμα', description: 'Όλος ο χώρος δικός σου.' },
					{ value: 'room', title: 'Ένα δωμάτιο', description: 'Ιδιωτικό δωμάτιο.' }
				]}
			/>
		</div>
	{/snippet}
</Story>
