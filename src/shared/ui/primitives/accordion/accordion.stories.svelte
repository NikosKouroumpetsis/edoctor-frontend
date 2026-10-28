<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$shared/ui/primitives/accordion';

	const faqs = [
		{
			value: 'account',
			question: 'Πώς δημιουργώ λογαριασμό;',
			answer: 'Επιλέξτε «Εγγραφή» και ακολουθήστε τα βήματα.'
		},
		{
			value: 'cancel',
			question: 'Μπορώ να αλλάξω γνώμη;',
			answer: 'Ναι, από τις ρυθμίσεις, οποιαδήποτε στιγμή.'
		},
		{ value: 'payment', question: 'Πώς πληρώνω;', answer: 'Με κάρτα ή με μετρητά.' }
	];
	const cards = [
		{ value: 'what', label: 'Τι', summary: 'Οποιοδήποτε' },
		{ value: 'where', label: 'Πού', summary: 'Αττική' },
		{ value: 'when', label: 'Πότε', summary: 'Επόμενες 3 ημέρες' }
	];

	// The application's accordion (`molecules/accordion`). Opening and closing moves the height and the opacity
	// together and turns the chevron over, on the application's 220 ms `inOut(quad)` (U-09.11), in CSS whatever the
	// motion setting (U-12.1). The web has no `defaultValue`: an unbound `value` is the same uncontrolled start.
	const { Story } = defineMeta({
		title: 'Primitives/Accordion',
		component: Accordion,
		tags: ['autodocs']
	});
</script>

{#snippet faqItems()}
	{#each faqs as faq (faq.value)}
		<AccordionItem value={faq.value}>
			<AccordionTrigger showChevron>
				<span class="text-body-md font-medium text-foreground">{faq.question}</span>
			</AccordionTrigger>
			<AccordionContent contentClass="pb-4">
				<p class="text-body-sm text-muted-foreground">{faq.answer}</p>
			</AccordionContent>
		</AccordionItem>
	{/each}
{/snippet}

<Story name="Single Collapsible">
	{#snippet template()}
		<Accordion type="single" collapsible value="account">{@render faqItems()}</Accordion>
	{/snippet}
</Story>

<Story name="Multiple">
	{#snippet template()}
		<Accordion type="multiple" value={['account']}>{@render faqItems()}</Accordion>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<Accordion type="single" disabled value="account">
			<AccordionItem value="account">
				<AccordionTrigger showChevron>
					<span class="text-body-md font-medium text-foreground">Απενεργοποιημένο</span>
				</AccordionTrigger>
				<AccordionContent contentClass="pb-4">
					<p class="text-body-sm text-muted-foreground">Δεν εναλλάσσεται.</p>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	{/snippet}
</Story>

<!-- The `card` item: a bordered card whose trigger and content sit 16 in (a search's criteria, one open at a time). -->
<Story name="Cards">
	{#snippet template()}
		<Accordion type="single" collapsible value="what" class="flex flex-col gap-3">
			{#each cards as card (card.value)}
				<AccordionItem value={card.value} variant="card">
					<AccordionTrigger>
						<span class="flex min-w-0 flex-1 flex-row items-center justify-between gap-3">
							<span class="text-body-md font-semibold text-muted-foreground">{card.label}</span>
							<span
								class="line-clamp-1 min-w-0 flex-1 text-right text-body-md font-semibold text-foreground"
								>{card.summary}</span
							>
						</span>
					</AccordionTrigger>
					<AccordionContent contentClass="gap-3.5">
						<p class="text-body-sm text-muted-foreground">Το περιεχόμενο της κάρτας.</p>
					</AccordionContent>
				</AccordionItem>
			{/each}
		</Accordion>
	{/snippet}
</Story>
