<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ButtonStack } from '$shared/ui/molecules/button-stack';
	import { VisitCard } from '$shared/ui/molecules/visit-card';

	const noop = () => {};

	const { Story } = defineMeta({
		title: 'Molecules/VisitCard',
		component: VisitCard,
		tags: ['autodocs'],
		args: {
			when: 'Σήμερα, 17:30',
			name: 'Νίκος Μαυρίδης',
			meta: 'Επίσκεψη · 30 λεπτά · Κηφισίας 120',
			byline: 'Το έκλεισε: Ελένη Μαυρίδη (γονέας)',
			quote: '«Βήχας εδώ και μία εβδομάδα, χωρίς πυρετό.»',
			deadline: 'Απαντήστε έως τις 16:30'
		}
	});
</script>

<Story name="A request, three answers">
	{#snippet template(args)}
		<div class="w-full max-w-form">
			<VisitCard {...args}>
				{#snippet actions()}
					<ButtonStack
						actions={[
							{ id: 'reject', label: 'Απόρριψη', onPress: noop },
							{ id: 'move', label: 'Αλλαγή', onPress: noop },
							{ id: 'confirm', label: 'Επιβεβαίωση', emphasis: true, onPress: noop }
						]}
					/>
				{/snippet}
			</VisitCard>
		</div>
	{/snippet}
</Story>

<Story name="What happened, with its footnote">
	{#snippet template()}
		<div class="w-full max-w-form">
			<VisitCard
				when="Χθες, 18:00"
				name="Κατερίνα Λαμπράκη"
				meta="Επίσκεψη · 30 λεπτά · Κηφισίας 120"
				footnote="Αν δεν απαντήσετε, αύριο στις 18:00 γράφεται «Ολοκληρώθηκε»."
			>
				{#snippet actions()}
					<ButtonStack
						actions={[
							{ id: 'no', label: 'Δεν ήρθε', onPress: noop },
							{ id: 'yes', label: 'Ολοκληρώθηκε', emphasis: true, onPress: noop }
						]}
					/>
				{/snippet}
			</VisitCard>
		</div>
	{/snippet}
</Story>

<Story name="Next, soon (relative time)">
	{#snippet template()}
		<div class="w-full max-w-form">
			<VisitCard
				when="13:00"
				soon="σε 20 λεπτά"
				name="Αντώνης Πέτρου"
				meta="Επίσκεψη · 30 λεπτά · Κηφισίας 120"
			/>
		</div>
	{/snippet}
</Story>

<Story name="Over, fainter, with its state">
	{#snippet template()}
		<div class="w-full max-w-form">
			<VisitCard
				when="11:30"
				name="Μάρκος Ηλιόπουλος"
				meta="Επίσκεψη"
				tag={{ label: 'Ακυρώθηκε από τον ασθενή', tone: 'muted' }}
				dim
			/>
		</div>
	{/snippet}
</Story>

<!-- D-W51-36: the whole card opens what it names (a link stretched over it); the chosen one dark-bordered from 1128. -->
<Story name="A link, chosen beside the list" globals={{ viewport: { value: 'z1440' } }}>
	{#snippet template(args)}
		<div class="flex w-full max-w-form flex-col gap-3">
			<VisitCard {...args} deadline={null} quote={null} href="#" selected selectFrom="laptop" />
			<VisitCard {...args} deadline={null} quote={null} name="Γιώργος Αντωνίου" href="#" />
		</div>
	{/snippet}
</Story>
