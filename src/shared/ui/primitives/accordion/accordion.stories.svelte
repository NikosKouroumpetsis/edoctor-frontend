<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$shared/ui/primitives/accordion';

	const { Story } = defineMeta({
		title: 'Primitives/Accordion',
		component: Accordion,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let single = $state<string | string[]>('one');
	let multiple = $state<string | string[]>(['one']);
</script>

<Story name="Single">
	{#snippet template()}
		<Accordion type="single" bind:value={single} class="w-96">
			<AccordionItem value="one">
				<AccordionTrigger>How do I book an appointment?</AccordionTrigger>
				<AccordionContent>Search for a doctor and pick an available slot.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="two">
				<AccordionTrigger>Can I cancel?</AccordionTrigger>
				<AccordionContent>Yes, up to 24 hours before the appointment.</AccordionContent>
			</AccordionItem>
		</Accordion>
	{/snippet}
</Story>

<Story name="Multiple">
	{#snippet template()}
		<Accordion type="multiple" bind:value={multiple} class="w-96">
			<AccordionItem value="one">
				<AccordionTrigger>First section</AccordionTrigger>
				<AccordionContent>Several sections can be open at once.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="two">
				<AccordionTrigger>Second section</AccordionTrigger>
				<AccordionContent>This one too.</AccordionContent>
			</AccordionItem>
		</Accordion>
	{/snippet}
</Story>
