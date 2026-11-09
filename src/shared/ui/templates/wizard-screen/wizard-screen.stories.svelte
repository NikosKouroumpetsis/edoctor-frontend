<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		SelectableCards,
		type SelectableCardsValue
	} from '$shared/ui/molecules/selectable-cards';
	import { Stepper } from '$shared/ui/molecules/stepper';
	import { WizardScreen, type WizardScreenPill } from '$shared/ui/templates/wizard-screen';

	const noop = () => {};
	const pills: WizardScreenPill[] = [
		{
			key: 'help',
			label: 'Χρειάζεστε βοήθεια;',
			shortLabel: 'Βοήθεια',
			icon: 'help-circle-outline',
			href: '#help'
		},
		{ key: 'exit', label: 'Αποθήκευση και έξοδος', onClick: noop }
	];

	// Wave 3 (record §6.3): the frame of a sign-up in steps, Airbnb's host flow; below 744 the application's.
	const { Story } = defineMeta({
		title: 'Templates/WizardScreen',
		component: WizardScreen,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

<script lang="ts">
	let gender = $state<SelectableCardsValue>(undefined);
	let found = $state<SelectableCardsValue>(['parking']);
	let floor = $state('0');
	const floorName = (n: number) => (n < 0 ? 'Υπόγειο' : n === 0 ? 'Ισόγειο' : `${n}ος`);
</script>

{#snippet mark()}
	<a href="#home" class="flex min-h-touch min-w-touch items-center text-title-xs font-semibold">
		Σήμα
	</a>
{/snippet}

<!-- A step with one choice: the cards without any hover colour (U-100), «Επόμενο» locked until a card is chosen. -->
<Story name="Step">
	{#snippet template()}
		<WizardScreen
			title="Τα στοιχεία σας"
			subtitle="Όπως αναγράφονται στην ταυτότητα ή στο διαβατήριό σας."
			brand={mark}
			{pills}
			progress={{ steps: 3, currentStep: 0, fill: 0.4, label: 'Στάδιο 1 από 3' }}
			back={{ label: 'Πίσω', onClick: noop }}
			next={{ label: 'Επόμενο', onClick: noop, disabled: gender === undefined }}
		>
			<SelectableCards
				label="Φύλο"
				hover={false}
				bind:value={gender}
				options={[
					{ value: 'FEMALE', title: 'Γυναίκα' },
					{ value: 'MALE', title: 'Άνδρας' }
				]}
			/>
		</WizardScreen>
	{/snippet}
</Story>

<!-- Several choices one under the other, all the width (U-110.2), and a floor said in words (`valueLabel`). -->
<Story name="Several choices">
	{#snippet template()}
		<WizardScreen
			title="Τι θα βρουν οι ασθενείς στο ιατρείο;"
			subtitle="Διαλέξτε όσα ισχύουν."
			brand={mark}
			{pills}
			progress={{ steps: 3, currentStep: 1, fill: 0.6, label: 'Στάδιο 2 από 3' }}
			back={{ label: 'Πίσω', onClick: noop }}
			next={{ label: 'Επόμενο', onClick: noop }}
		>
			<div class="flex flex-col gap-6">
				<Stepper
					label="Όροφος"
					bind:value={floor}
					min={-1}
					max={20}
					valueLabel={floorName}
					decreaseLabel="Χαμηλότερος όροφος"
					increaseLabel="Ψηλότερος όροφος"
					emptyValueLabel="Κενό"
				/>
				<SelectableCards
					type="multiple"
					hover={false}
					bind:value={found}
					options={[
						{
							value: 'parking',
							title: 'Parking',
							description: 'Βρίσκουν πού να αφήσουν το αυτοκίνητο.'
						},
						{
							value: 'access',
							title: 'Πρόσβαση ΑμεΑ',
							description: 'Είσοδος χωρίς σκαλιά ή με ράμπα.'
						},
						{ value: 'transit', title: 'Κοντά σε μέσα μεταφοράς' }
					]}
				/>
			</div>
		</WizardScreen>
	{/snippet}
</Story>

<!-- An overview: no progress, one button of the whole width over a thin line, only the help pill. -->
<Story name="Overview">
	{#snippet template()}
		<WizardScreen
			title="Ξεκινήστε εύκολα και γρήγορα"
			brand={mark}
			pills={[pills[0]]}
			centered={false}
		>
			<p class="text-body-lg text-muted-foreground">Τρία στάδια, με ό,τι χρειάζεται το καθένα.</p>
			{#snippet footer()}
				<button
					type="button"
					class="min-h-control-md w-full rounded-full bg-accent text-body-lg font-semibold text-secondary-foreground"
				>
					Ξεκινήστε
				</button>
			{/snippet}
		</WizardScreen>
	{/snippet}
</Story>
